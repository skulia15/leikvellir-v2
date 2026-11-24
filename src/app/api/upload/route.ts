// app/api/upload/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { put, del, BlobNotFoundError } from "@vercel/blob";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import {
  playgrounds,
  playgroundEditSuggestions,
  users,
} from "~/server/db/schema";
import {
  generateUniqueFilename,
  validateImageFile,
  sanitizeFilename,
} from "~/lib/server-file-validation";
import {
  getUploaderPrefix,
  isBlobOwnedByUser,
  isSafeBlobFilename,
  parseAndValidateBlobUrl,
  type ValidatedBlobUrl,
} from "~/lib/blob-upload";
import type { UploadResponse } from "~/types/upload";
import { reportUploadError, logApiError } from "~/lib/logging";

// Rate limiting - simple in-memory store (use Redis in production)
const uploadCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_UPLOADS = 20; // per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Simple rate limiting check
 * TODO: Use Redis in production
 * TODO: Add a rate limit for the entire API
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = uploadCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    uploadCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_UPLOADS) {
    return false;
  }

  userLimit.count++;
  return true;
}

interface AuthenticatedUser {
  id: string;
  role: "user" | "admin" | "super_admin";
  isBanned: boolean;
}

/**
 * Verify session authentication and enforce ban status from the database.
 */
async function authenticateAndCheckBan(): Promise<
  | { user: AuthenticatedUser; errorResponse?: never }
  | { user?: never; errorResponse: NextResponse<UploadResponse> }
> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      role: true,
      isBanned: true,
    },
  });

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  if (user.isBanned) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Your account has been suspended" },
        { status: 403 },
      ),
    };
  }

  return { user };
}

/**
 * Check whether a blob URL is referenced by any existing playground
 * or by another user's edit suggestion.
 */
async function isBlobReferencedByProtectedRecord(
  blobUrl: string,
  userId: string,
): Promise<boolean> {
  const jsonArrayParam = JSON.stringify([blobUrl]);

  const referencingPlayground = await db.query.playgrounds.findFirst({
    where: or(
      eq(playgrounds.coverImage, blobUrl),
      sql`${playgrounds.images}::jsonb @> ${jsonArrayParam}::jsonb`,
    ),
    columns: { id: true },
  });

  if (referencingPlayground) {
    return true;
  }

  const referencingSuggestion =
    await db.query.playgroundEditSuggestions.findFirst({
      where: and(
        ne(playgroundEditSuggestions.createdById, userId),
        or(
          eq(playgroundEditSuggestions.coverImage, blobUrl),
          sql`${playgroundEditSuggestions.images}::jsonb @> ${jsonArrayParam}::jsonb`,
        ),
      ),
      columns: { id: true },
    });

  return Boolean(referencingSuggestion);
}

/**
 * Handle file upload with security checks using Vercel Blob Storage
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UploadResponse>> {
  try {
    // Authentication and ban check
    const auth = await authenticateAndCheckBan();
    if (auth.errorResponse) {
      return auth.errorResponse;
    }
    const { user } = auth;

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload rate limit exceeded. Try again later.",
        },
        { status: 429 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Invalid file provided" },
        { status: 400 },
      );
    }

    const file = fileEntry;

    // Server-side validation (critical security step)
    try {
      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        reportUploadError(
          file.name,
          file.size,
          new Error(validation.error || "Validation failed"),
          "validation",
        );
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 },
        );
      }
    } catch (validationError) {
      const error =
        validationError instanceof Error
          ? validationError
          : new Error(String(validationError));
      console.error("Validation error:", validationError);
      reportUploadError(file.name, file.size, error, "validation");
      return NextResponse.json(
        { success: false, error: "File validation failed" },
        { status: 400 },
      );
    }

    // Sanitize the filename first, then generate a unique name scoped to the uploader
    const sanitizedName = sanitizeFilename(file.name);
    const uniqueFilename = generateUniqueFilename(sanitizedName);
    const uploaderPrefix = getUploaderPrefix(user.id);

    try {
      if (!process.env.leikvellir_image_store_READ_WRITE_TOKEN) {
        console.error(
          "❌ Missing leikvellir_image_store_READ_WRITE_TOKEN environment variable",
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "Server configuration error: Missing blob storage token. Please notify the administrator.",
          },
          { status: 500 },
        );
      }

      // Upload to Vercel Blob Storage under an uploader-scoped prefix
      const blob = await put(
        `playgrounds/${uploaderPrefix}/${uniqueFilename}`,
        file,
        {
          access: "public",
          multipart: true, // Enable multipart upload for larger files
          token: process.env.leikvellir_image_store_READ_WRITE_TOKEN, // Use the specific store token
        },
      );

      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: uniqueFilename,
      });
    } catch (blobError) {
      const error =
        blobError instanceof Error ? blobError : new Error(String(blobError));
      console.error("❌ Vercel Blob upload error:", blobError);
      reportUploadError(file.name, file.size, error, "upload");
      logApiError("/api/upload", "POST", error, {
        component: "UploadAPI",
        userId: user.id,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          stage: "blob_upload",
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: "File upload failed. Please try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle file deletion (for cleanup) using Vercel Blob Storage
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication and ban check
    const auth = await authenticateAndCheckBan();
    if (auth.errorResponse) {
      return auth.errorResponse;
    }
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const url = searchParams.get("url");

    if (!filename && !url) {
      return NextResponse.json(
        { success: false, error: "No filename or URL provided" },
        { status: 400 },
      );
    }

    const isAdmin = user.role === "admin" || user.role === "super_admin";
    let validatedBlob: ValidatedBlobUrl | null = null;

    if (url) {
      validatedBlob = parseAndValidateBlobUrl(url, process.env.BLOB_STORE_ID);
      if (!validatedBlob) {
        return NextResponse.json(
          { success: false, error: "Invalid URL" },
          { status: 400 },
        );
      }
    } else if (filename) {
      if (!isSafeBlobFilename(filename)) {
        return NextResponse.json(
          { success: false, error: "Invalid filename" },
          { status: 400 },
        );
      }

      const storeId = process.env.BLOB_STORE_ID?.trim();
      if (!storeId) {
        return NextResponse.json(
          { success: false, error: "Server configuration error" },
          { status: 500 },
        );
      }

      const blobPath = isAdmin
        ? `playgrounds/${filename}`
        : `playgrounds/${getUploaderPrefix(user.id)}/${filename}`;
      const constructedUrl = `https://${storeId}.public.blob.vercel-storage.com/${blobPath}`;
      validatedBlob = parseAndValidateBlobUrl(constructedUrl, storeId);

      if (!validatedBlob) {
        return NextResponse.json(
          { success: false, error: "Server configuration error" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid parameters" },
        { status: 400 },
      );
    }

    // Authorization: admins may delete any validated playground blob;
    // regular users may only delete their own unreferenced uploads
    if (!isAdmin) {
      if (!isBlobOwnedByUser(validatedBlob, user.id)) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }

      const isReferenced = await isBlobReferencedByProtectedRecord(
        validatedBlob.url,
        user.id,
      );
      if (isReferenced) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    }

    if (!process.env.leikvellir_image_store_READ_WRITE_TOKEN) {
      console.error(
        "❌ Missing leikvellir_image_store_READ_WRITE_TOKEN environment variable",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Server configuration error: Missing blob storage token. Please notify the administrator.",
        },
        { status: 500 },
      );
    }

    try {
      // Delete from Vercel Blob Storage
      await del(validatedBlob.url, {
        token: process.env.leikvellir_image_store_READ_WRITE_TOKEN, // Use the specific store token
      });
      return NextResponse.json({ success: true });
    } catch (blobError) {
      // Treat already-deleted / missing blobs as idempotent cleanup
      if (BlobNotFoundError && blobError instanceof BlobNotFoundError) {
        return NextResponse.json({ success: true });
      }

      const error =
        blobError instanceof Error ? blobError : new Error(String(blobError));
      console.error("❌ Vercel Blob delete error:", blobError);
      logApiError("/api/upload", "DELETE", error, {
        component: "UploadAPI",
        userId: user.id,
        metadata: {
          blobUrl: validatedBlob.url,
          stage: "blob_delete",
        },
      });
      return NextResponse.json(
        { success: false, error: "Failed to delete file" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
