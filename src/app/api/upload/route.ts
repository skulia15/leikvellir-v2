// app/api/upload/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerAuthSession } from "~/server/auth";
import {
  generateUniqueFilename,
  validateImageFile,
  sanitizeFilename,
} from "~/lib/server-file-validation";
import type { UploadResponse } from "~/types/upload";

// Rate limiting - simple in-memory store (use Redis in production)
const uploadCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_UPLOADS = 20; // per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Simple rate limiting check
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
 * Handle file upload with security checks
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<UploadResponse>> {
  try {
    // Authentication check
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
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
    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    // Sanitize the filename first, then generate a unique name
    const sanitizedName = sanitizeFilename(file.name);
    const uniqueFilename = generateUniqueFilename(sanitizedName);

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "playgrounds");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // Directory might already exist, that's okay
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/playgrounds/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Handle file deletion (for cleanup)
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

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "No filename provided" },
        { status: 400 },
      );
    }

    // Security: only allow deletion of files in the playground uploads directory
    const filenameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!filenameRegex.exec(filename)) {
      return NextResponse.json(
        { success: false, error: "Invalid filename" },
        { status: 400 },
      );
    }

    const filePath = join(
      process.cwd(),
      "public",
      "uploads",
      "playgrounds",
      filename,
    );

    try {
      const { unlink } = await import("fs/promises");
      await unlink(filePath);
      return NextResponse.json({ success: true });
    } catch {
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
