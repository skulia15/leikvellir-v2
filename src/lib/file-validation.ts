// DEPRECATED - DO NOT USE
// This file is kept for reference only and should not be imported.
// Use client-file-validation.ts for browser components.
// Use server-file-validation.ts for server components.

// lib/file-validation.ts
import type { ValidationResult, ImageUploadConfig } from "~/types/upload";
import { DEFAULT_UPLOAD_CONFIG } from "~/types/upload";

/**
 * File signature (magic numbers) checking for security
 * This prevents users from renaming malicious files with image extensions
 */
const IMAGE_SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
} as const;

/**
 * Check if file has valid image signature by reading first few bytes
 * This is more secure than just checking the file extension
 */
async function validateFileSignature(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(false);
        return;
      }

      const uint8Array = new Uint8Array(arrayBuffer);

      // Check against known image signatures
      for (const [mimeType, signature] of Object.entries(IMAGE_SIGNATURES)) {
        if (file.type === mimeType) {
          const matches = signature.every(
            (byte, index) => uint8Array[index] === byte,
          );
          if (matches) {
            resolve(true);
            return;
          }
        }
      }

      resolve(false);
    };

    reader.onerror = () => resolve(false);

    // Read first 12 bytes - enough for most image signatures
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * Comprehensive file validation with security checks
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

  // Check file signature for security (this is the important part!)
  const hasValidSignature = await validateFileSignature(file);
  if (!hasValidSignature) {
    return {
      isValid: false,
      error: "Invalid file format or corrupted file",
    };
  }

  // Check filename for security (prevent path traversal)
  const sanitizedName = sanitizeFilename(file.name);
  if (sanitizedName !== file.name) {
    return {
      isValid: false,
      error: "Filename contains invalid characters",
    };
  }

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
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscore
    .replace(/\.+/g, ".") // Remove multiple dots
    .replace(/^\./, "") // Remove leading dot
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
