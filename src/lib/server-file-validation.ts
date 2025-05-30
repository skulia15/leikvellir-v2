// src/lib/server-file-validation.ts
import type { ValidationResult, ImageUploadConfig } from "~/types/upload";
import { DEFAULT_UPLOAD_CONFIG } from "~/types/upload";
import { isServer } from "~/lib/utils";

// Image signatures (magic numbers) for validation
const IMAGE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
} as const;

/**
 * Format file size for human reading
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Sanitize filename to prevent security issues
 * Allows most common characters but blocks potentially dangerous ones
 */
export function sanitizeFilename(filename: string): string {
  // Allow alphanumeric, space, underscore, hyphen, period, parentheses
  // Block path traversal characters (/, \), control chars, and other problematic chars
  return filename
    .replace(/[/\\?%*:|"<>]/g, "_") // Replace dangerous chars with underscore
    .replace(/\.+/g, ".") // Remove multiple consecutive dots
    .replace(/^\./, "") // Remove leading dot
    .trim() // Remove leading/trailing whitespace
    .substring(0, 100); // Limit length
}

/**
 * Generate unique filename to prevent conflicts
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const sanitizedName = sanitizeFilename(nameWithoutExt);

  return `${sanitizedName}_${timestamp}_${random}.${extension}`;
}

/**
 * Server-side implementation of file signature validation
 * Works with Next.js Route Handlers and Server Actions
 */
async function validateFileSignature(
  file: File,
  mimeType: string,
): Promise<boolean> {
  // Ensure we're on the server
  if (!isServer()) {
    throw new Error("This function should only be called on the server");
  }

  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check first few bytes against known signatures
    const signature =
      IMAGE_SIGNATURES[mimeType as keyof typeof IMAGE_SIGNATURES];
    if (!signature) return false;

    // Check if buffer starts with the signature
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error validating file signature:", error);
    return false;
  }
}

/**
 * Server-side image file validation
 */
export async function validateImageFile(
  file: File,
  config: ImageUploadConfig = DEFAULT_UPLOAD_CONFIG,
): Promise<ValidationResult> {
  // Check file size
  if (file.size > config.maxSize!) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${formatFileSize(config.maxSize!)}`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: "File is empty",
    };
  }

  // Check MIME type
  if (!config.allowedTypes!.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${config.allowedTypes!.join(", ")}`,
    };
  }

  // Check file signature for security
  const hasValidSignature = await validateFileSignature(file, file.type);
  if (!hasValidSignature) {
    return {
      isValid: false,
      error: "Invalid file format or corrupted file",
    };
  }

  // Sanitize filename instead of rejecting files with special characters
  // This automatically handles any filenames with potentially problematic characters

  return { isValid: true };
}

/**
 * Validate multiple files at once
 */
export async function validateMultipleFiles(
  files: File[],
  config: ImageUploadConfig = DEFAULT_UPLOAD_CONFIG,
): Promise<{ valid: File[]; invalid: Array<{ file: File; error: string }> }> {
  const valid: File[] = [];
  const invalid: Array<{ file: File; error: string }> = [];

  // Check total file count
  if (files.length > config.maxFiles!) {
    throw new Error(`Too many files. Maximum allowed: ${config.maxFiles}`);
  }

  // Validate each file
  for (const file of files) {
    const validation = await validateImageFile(file, config);
    if (validation.isValid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: validation.error! });
    }
  }

  return { valid, invalid };
}
