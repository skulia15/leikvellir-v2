// components/ui/image-upload.tsx
"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import {
  validateMultipleFiles,
  formatFileSize,
} from "~/lib/client-file-validation";
import type {
  FileWithPreview,
  UploadProgress,
  ImageUploadConfig,
  UploadResponse,
} from "~/types/upload";
import { DEFAULT_UPLOAD_CONFIG } from "~/types/upload";

interface ImageUploadProps {
  value?: string[]; // Current image URLs
  onChange: (urls: string[]) => void;
  config?: Partial<ImageUploadConfig>;
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value = [],
  onChange,
  config = {},
  className,
  disabled = false,
}: ImageUploadProps) {
  const finalConfig = useMemo(
    () => ({ ...DEFAULT_UPLOAD_CONFIG, ...config }),
    [config],
  );

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<
    Map<string, UploadProgress>
  >(new Map());
  const [errors, setErrors] = useState<string[]>([]);

  // Filter out empty strings and invalid URLs from the value array
  const validUrls = useMemo(
    () => value.filter((url) => url && url.trim() !== ""),
    [value],
  );

  // Create file preview objects
  const createFileWithPreview = useCallback((file: File): FileWithPreview => {
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    });
    return fileWithPreview;
  }, []);

  // Upload individual file with progress tracking
  const uploadFile = useCallback(
    async (file: FileWithPreview) => {
      const progressInfo: UploadProgress = {
        fileId: file.id,
        progress: 0,
        state: "uploading",
      };

      setUploadProgress((prev) => new Map(prev.set(file.id, progressInfo)));

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress((prev) => {
              const updated = new Map(prev);
              const current = updated.get(file.id);
              if (current) {
                updated.set(file.id, { ...current, progress });
              }
              return updated;
            });
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            const response = JSON.parse(
              xhr.responseText,
            ) as unknown as UploadResponse;
            if (response.success && response.url) {
              setUploadProgress((prev) => {
                const updated = new Map(prev);
                updated.set(file.id, {
                  fileId: file.id,
                  progress: 100,
                  state: "success",
                  url: response.url,
                });
                return updated;
              });

              // Add URL to form value
              onChange([...value, response.url]);
            } else {
              throw new Error(response.error ?? "Upload failed");
            }
          } else {
            throw new Error(`Upload failed with status ${xhr.status}`);
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          setUploadProgress((prev) => {
            const updated = new Map(prev);
            updated.set(file.id, {
              fileId: file.id,
              progress: 0,
              state: "error",
              error: "Network error during upload",
            });
            return updated;
          });
        });

        // Send request
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      } catch (error) {
        setUploadProgress((prev) => {
          const updated = new Map(prev);
          updated.set(file.id, {
            fileId: file.id,
            progress: 0,
            state: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          });
          return updated;
        });
      }
    },
    [onChange, value],
  );

  // Handle file drop/selection
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;

      setErrors([]);

      try {
        // Validate files
        const { valid, invalid } = await validateMultipleFiles(
          acceptedFiles,
          finalConfig,
        );

        // Show validation errors
        if (invalid.length > 0) {
          setErrors(invalid.map(({ file, error }) => `${file.name}: ${error}`));
        }

        // Check if adding these files would exceed the limit
        const totalFiles = files.length + validUrls.length + valid.length;
        if (totalFiles > finalConfig.maxFiles) {
          setErrors((prev) => [
            ...prev,
            `Maximum ${finalConfig.maxFiles} files allowed`,
          ]);
          return;
        }

        // Create preview files
        const newFiles = valid.map(createFileWithPreview);
        setFiles((prev) => [...prev, ...newFiles]);

        // Start uploading valid files
        for (const file of newFiles) {
          void uploadFile(file);
        }
      } catch (error) {
        setErrors([
          error instanceof Error ? error.message : "Validation failed",
        ]);
      }
    },
    [
      files.length,
      validUrls.length,
      finalConfig,
      createFileWithPreview,
      disabled,
      uploadFile,
    ],
  );

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      void onDrop(acceptedFiles);
    },
    accept: { "image/*": [] },
    multiple: true,
    maxFiles: finalConfig.maxFiles,
    maxSize: finalConfig.maxSize,
    disabled,
    noClick: false,
    noKeyboard: false,
  });

  // Remove file (before or after upload)
  const removeFile = (fileId: string) => {
    const progress = uploadProgress.get(fileId);

    // If file was successfully uploaded, remove from form value
    if (progress?.url) {
      onChange(value.filter((url) => url !== progress.url));
    }

    // Remove from local state
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
    setUploadProgress((prev) => {
      const updated = new Map(prev);
      updated.delete(fileId);
      return updated;
    });
  };

  // Remove existing uploaded image
  const removeExistingImage = (url: string) => {
    onChange(value.filter((existingUrl) => existingUrl !== url));
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, [files]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragActive ? "Drop images here" : "Upload playground images"}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag & drop images or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Max {finalConfig.maxFiles} files, up to{" "}
            {formatFileSize(finalConfig.maxSize)} each
          </p>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Existing Images */}
      {validUrls.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium">Uploaded Images</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {validUrls.map((url, index) => (
              <div key={url} className="group relative">
                <div className="relative aspect-square overflow-hidden rounded-lg border">
                  <Image
                    src={url}
                    alt={`Uploaded image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute right-2 top-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => removeExistingImage(url)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Being Uploaded */}
      {files.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium">Uploading Images</h4>
          <div className="space-y-4">
            {files.map((file) => {
              const progress = uploadProgress.get(file.id);
              return (
                <div key={file.id} className="rounded-lg border p-4">
                  <div className="flex items-start gap-4">
                    {/* Image Preview */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                      <Image
                        src={file.preview}
                        alt={file.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    {/* File Info and Progress */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>

                        {/* Status Icon */}
                        <div className="flex shrink-0 items-center gap-2">
                          {progress?.state === "uploading" && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          )}
                          {progress?.state === "success" && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          {progress?.state === "error" && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {progress && progress.state === "uploading" && (
                        <div className="space-y-1">
                          <Progress value={progress.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {progress.progress}% uploaded
                          </p>
                        </div>
                      )}

                      {/* Error Message */}
                      {progress?.state === "error" && (
                        <p className="text-xs text-destructive">
                          {progress.error}
                        </p>
                      )}

                      {/* Success Message */}
                      {progress?.state === "success" && (
                        <p className="text-xs text-green-600">
                          Upload complete
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Stats */}
      {(validUrls.length > 0 || files.length > 0) && (
        <div className="text-xs text-muted-foreground">
          {validUrls.length +
            files.filter((f) => uploadProgress.get(f.id)?.state === "success")
              .length}{" "}
          of {finalConfig.maxFiles} images uploaded
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
