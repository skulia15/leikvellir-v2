// types/upload.ts
import { z } from "zod";

// Upload state tracking
export type UploadState = "idle" | "uploading" | "success" | "error";

// File with preview URL for UI
export interface FileWithPreview extends File {
  preview: string;
  id: string;
}

// Upload progress tracking
export interface UploadProgress {
  fileId: string;
  progress: number; // 0-100
  state: UploadState;
  error?: string;
  url?: string; // Final URL after successful upload
}

// Validation schemas
export const ImageUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(4 * 1024 * 1024), // 4MB
  allowedTypes: z
    .array(z.string())
    .default(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
});

// Server response types
export interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

// File validation result
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Configuration for the upload component
export interface ImageUploadConfig {
  maxFiles?: number; // Max files per upload batch (not total limit)
  maxSize?: number; // bytes
  allowedTypes?: string[];
  accept?: string; // for input accept attribute
}

// Default configuration
export const DEFAULT_UPLOAD_CONFIG: Required<ImageUploadConfig> = {
  maxFiles: 10,
  maxSize: 4 * 1024 * 1024, // 4MB
  allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  accept: "image/jpeg,image/jpg,image/png,image/webp",
};
