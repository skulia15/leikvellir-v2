// app/api/upload/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getServerAuthSession } from "~/server/auth";
import {
  generateUniqueFilename,
  validateImageFile,
  sanitizeFilename,
} from "~/lib/server-file-validation";
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

/**
 * Handle file upload with security checks using Vercel Blob Storage
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UploadResponse>> {
  try {
    // Authentication check
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      console.log("❌ Authentication failed");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      console.log("❌ Rate limit exceeded for user:", session.user.id);
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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Server-side validation (critical security step)
    try {
      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        console.log("❌ Server validation failed:", validation.error);
        reportUploadError(file.name, file.size, new Error(validation.error || "Validation failed"), "validation");
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 },
        );
      }
    } catch (validationError) {
      const error = validationError instanceof Error ? validationError : new Error(String(validationError));
      console.error("❌ Validation error:", validationError);
      reportUploadError(file.name, file.size, error, "validation");
      // Continue with upload if validation throws (but log the error)
      console.log("⚠️ Continuing with upload despite validation error");
    }

    // Sanitize the filename first, then generate a unique name
    const sanitizedName = sanitizeFilename(file.name);
    const uniqueFilename = generateUniqueFilename(sanitizedName);

    try {

      if (!process.env.leikvellir_image_store_READ_WRITE_TOKEN) {
        console.error("❌ Missing leikvellir_image_store_READ_WRITE_TOKEN environment variable");
        return NextResponse.json(
          {
            success: false,
            error: "Server configuration error: Missing blob storage token. Please notify the administrator."
          },
          { status: 500 },
        );
      }

      // Upload to Vercel Blob Storage
      const blob = await put(`playgrounds/${uniqueFilename}`, file, {
        access: "public",
        multipart: true, // Enable multipart upload for larger files
        token: process.env.leikvellir_image_store_READ_WRITE_TOKEN, // Use the specific store token
      });

      console.log(`✅ File uploaded to Vercel Blob: ${blob.url}`);

      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: uniqueFilename,
      });
    } catch (blobError) {
      const error = blobError instanceof Error ? blobError : new Error(String(blobError));
      console.error("❌ Vercel Blob upload error:", blobError);
      reportUploadError(file.name, file.size, error, "upload");
      logApiError("/api/upload", "POST", error, {
        component: "UploadAPI",
        userId: session.user.id,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          stage: "blob_upload",
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Blob storage error: ${error.message}`
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
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const url = searchParams.get("url"); // Accept full blob URL as well

    if (!filename && !url) {
      return NextResponse.json(
        { success: false, error: "No filename or URL provided" },
        { status: 400 },
      );
    }

    try {
      let blobUrl: string;

      if (url) {
        // If full URL is provided, use it directly
        blobUrl = url;
      } else if (filename) {
        // Security: only allow deletion of files with safe filenames
        const filenameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!filenameRegex.exec(filename)) {
          return NextResponse.json(
            { success: false, error: "Invalid filename" },
            { status: 400 },
          );
        }

        // For backward compatibility, construct the blob URL from filename
        blobUrl = `https://vjivtetjvhz2zp6d.public.blob.vercel-storage.com/playgrounds/${filename}`;
      } else {
        return NextResponse.json(
          { success: false, error: "Invalid parameters" },
          { status: 400 },
        );
      }

      // Delete from Vercel Blob Storage
      await del(blobUrl, {
        token: process.env.leikvellir_image_store_READ_WRITE_TOKEN, // Use the specific store token
      });
      console.log(`🗑️ File deleted from Vercel Blob: ${blobUrl}`);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.warn("Failed to delete from blob storage:", error);
      // File might not exist, that's okay
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
