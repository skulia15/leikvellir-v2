// components/ui/image-upload.tsx
"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, AlertCircle, CheckCircle2, Loader2, Star, Zap } from "lucide-react";
import Image from "next/image";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import {
  validateMultipleFiles,
  formatFileSize,
} from "~/lib/client-file-validation";
import { resizeImages, needsResizing, formatCompressionInfo, type ResizeResult } from "~/lib/image-resize";
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
  onReset?: () => void; // New prop for reset functionality
  // Cover image selection props
  coverImage?: string | null;
  onCoverImageChange?: (url: string | null) => void;
  showCoverSelection?: boolean;
}

export function ImageUpload({
  value = [],
  onChange,
  config = {},
  className,
  disabled = false,
  onReset,
  coverImage,
  onCoverImageChange,
  showCoverSelection = false,
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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeProgress, setResizeProgress] = useState({ current: 0, total: 0, filename: '' });
  const [resizeResults, setResizeResults] = useState<Map<string, ResizeResult>>(new Map());

  // Use ref to track current URLs for concurrent uploads
  const currentUrlsRef = useRef<string[]>(value);

  // Update ref when value changes
  useEffect(() => {
    currentUrlsRef.current = value;
  }, [value]);

  // Filter out empty strings and invalid URLs from the value array
  const validUrls = useMemo(
    () => value.filter((url) => url && url.trim() !== ""),
    [value],
  );

  // Clean up successful uploads that are now in validUrls
  useEffect(() => {
    const filesToRemove: string[] = [];

    files.forEach((file) => {
      const progress = uploadProgress.get(file.id);
      if (progress?.state === "success" && progress.url && validUrls.includes(progress.url)) {
        filesToRemove.push(file.id);
      }
    });

    if (filesToRemove.length > 0) {
      setFiles((prev) => prev.filter((file) => !filesToRemove.includes(file.id)));
      setUploadProgress((prev) => {
        const updated = new Map(prev);
        filesToRemove.forEach((fileId) => updated.delete(fileId));
        return updated;
      });
    }
  }, [validUrls, files, uploadProgress]);

  // Reset function exposed to parent
  const resetUpload = useCallback(() => {
    // Clear local state
    setFiles([]);
    setUploadProgress(new Map());
    setErrors([]);
    setIsResizing(false);
    setResizeProgress({ current: 0, total: 0, filename: '' });
    setResizeResults(new Map());
    // Call parent reset if provided
    if (onReset) {
      onReset();
    } else {
      // Fallback to clearing form value
      onChange([]);
    }
  }, [onReset, onChange]);

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
      console.log(`🚀 Starting upload for file: ${file.name} (ID: ${file.id})`);

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

              // Add URL to form value - use functional state update to avoid race conditions
              const newUrl = response.url;
              const updatedUrls = [...currentUrlsRef.current, newUrl];
              onChange(updatedUrls);
              // Update the ref immediately
              currentUrlsRef.current = updatedUrls;

              // Set upload to success state instead of immediately removing
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

              // Auto-select first image as cover if none selected and cover selection is enabled
              if (showCoverSelection && !coverImage && onCoverImageChange) {
                onCoverImageChange(response.url);
              }

              // Clean up successful upload after a brief delay to allow UI to update
              setTimeout(() => {
                setFiles((prev) => prev.filter((f) => f.id !== file.id));
                setUploadProgress((prev) => {
                  const updated = new Map(prev);
                  updated.delete(file.id);
                  return updated;
                });
              }, 1000); // 1 second delay
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
    [onChange, value, showCoverSelection, coverImage, onCoverImageChange],
  );

  // Handle file drop/selection with automatic resizing
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;


      setErrors([]);

      try {
        // Check if adding these files would exceed the limit
        const currentUploaded = validUrls.length;
        const currentPending = files.length;
        const totalAfterUpload = currentUploaded + currentPending + acceptedFiles.length;

        if (totalAfterUpload > finalConfig.maxFiles) {
          setErrors([
            `Maximum ${finalConfig.maxFiles} files allowed. Currently have ${currentUploaded + currentPending} files.`,
          ]);
          return;
        }

        // Filter to only image files and check which ones need resizing
        const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
        const nonImageFiles = acceptedFiles.filter(file => !file.type.startsWith('image/'));

        // Show errors for non-image files
        if (nonImageFiles.length > 0) {
          setErrors(prev => [
            ...prev,
            ...nonImageFiles.map(file => `${file.name}: Only image files are supported`)
          ]);
        }

        if (imageFiles.length === 0) {
          return;
        }

        // Check which files need resizing
        const maxSize = finalConfig.maxSize ?? DEFAULT_UPLOAD_CONFIG.maxSize;
        const filesToResize = imageFiles.filter(file => needsResizing(file, maxSize));
        const readyFiles = imageFiles.filter(file => !needsResizing(file, maxSize));


        let processedFiles = readyFiles;

        // Resize files if needed
        if (filesToResize.length > 0) {
          setIsResizing(true);

          try {
            const resizeResults = await resizeImages(
              filesToResize,
              { maxSizeBytes: maxSize },
              (current, total, filename) => {
                setResizeProgress({ current, total, filename });
              }
            );

            // Store resize results for display
            const newResizeResults = new Map(resizeResults.map(result => [
              result.file.name, result
            ]));
            setResizeResults(prev => new Map([...prev, ...newResizeResults]));

            // Add resized files to processed files
            processedFiles = [...processedFiles, ...resizeResults.map(r => r.file)];

            console.log(`✅ Resize complete! Processed ${resizeResults.length} files`);
          } catch (error) {
            console.error("❌ Error during resize:", error);
            setErrors(prev => [
              ...prev,
              `Failed to resize images: ${error instanceof Error ? error.message : 'Unknown error'}`
            ]);
            return;
          } finally {
            setIsResizing(false);
            setResizeProgress({ current: 0, total: 0, filename: '' });
          }
        }

        // Validate all processed files
        console.log("Starting validation for processed files...");
        const { valid, invalid } = await validateMultipleFiles(
          processedFiles,
          finalConfig,
        );
        console.log("Validation results - Valid:", valid.length, "Invalid:", invalid.length);

        // Show validation errors
        if (invalid.length > 0) {
          setErrors(prev => [
            ...prev,
            ...invalid.map(({ file, error }) => `${file.name}: ${error}`)
          ]);
        }

        if (valid.length === 0) {
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
        console.error("❌ Error in onDrop:", error);
        setErrors([
          error instanceof Error ? error.message : "Processing failed",
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

  // Configure dropzone with larger initial file size limit for resizing
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Add rejected files to accepted if they're just too large (we'll resize them)
      const oversizedImageFiles = rejectedFiles
        .filter(r =>
          r.file.type.startsWith('image/') &&
          r.errors.some(e => e.code === 'file-too-large')
        )
        .map(r => r.file);

      const allFilesToProcess = [...acceptedFiles, ...oversizedImageFiles];

      if (allFilesToProcess.length > 0) {
        void onDrop(allFilesToProcess);
      }

      // Show errors for truly invalid files (not just oversized images)
      const reallyRejectedFiles = rejectedFiles.filter(r =>
        !r.file.type.startsWith('image/') ||
        !r.errors.some(e => e.code === 'file-too-large')
      );

      if (reallyRejectedFiles.length > 0) {
        setErrors(prev => [
          ...prev,
          ...reallyRejectedFiles.map(r => `${r.file.name}: ${r.errors.map(e => e.message).join(', ')}`)
        ]);
      }
    },

    onDropRejected: (rejectedFiles) => {
      console.log("🔴 onDropRejected:", rejectedFiles.length);
      rejectedFiles.forEach(rejected => {
        console.log(`  - ${rejected.file.name}: ${rejected.errors.map(e => e.message).join(", ")}`);
      });
    },

    accept: { "image/*": [] },
    multiple: true,
    maxFiles: finalConfig.maxFiles,
    maxSize: 50 * 1024 * 1024, // 50MB - much larger to accept camera photos for resizing
    disabled: disabled || isResizing,
    noClick: false,
    noKeyboard: false,
  });

  // Remove file (before or after upload)
  const removeFile = (fileId: string) => {
    const progress = uploadProgress.get(fileId);

    // If file was successfully uploaded, remove from form value
    if (progress?.url) {
      const newUrls = value.filter((url) => url !== progress.url);
      onChange(newUrls);

      // If removed image was the cover, clear cover selection
      if (showCoverSelection && coverImage === progress.url && onCoverImageChange) {
        onCoverImageChange(null);
      }
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
  const removeExistingImage = async (url: string) => {
    try {
      // For Vercel Blob Storage, we can pass the full URL
      if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
        // Delete using the full blob URL
        await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
          method: 'DELETE',
        });
      } else {
        // Fallback for local files (backward compatibility)
        const filename = url.split('/').pop();
        if (filename && url.startsWith('/uploads/playgrounds/')) {
          await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
            method: 'DELETE',
          });
        }
      }
    } catch (error) {
      console.warn('Failed to delete file from server:', error);
      // Don't block the UI operation if file deletion fails
    }

    const newUrls = value.filter((existingUrl) => existingUrl !== url);
    onChange(newUrls);

    // If removed image was the cover, clear cover selection
    if (showCoverSelection && coverImage === url && onCoverImageChange) {
      onCoverImageChange(null);
    }
  };

  // Handle cover image selection
  const selectCoverImage = (url: string) => {
    if (showCoverSelection && onCoverImageChange) {
      onCoverImageChange(coverImage === url ? null : url);
    }
  };

  // Calculate total uploaded images correctly
  const totalUploadedImages = validUrls.length;

  // Get all available images (just the validUrls since successful uploads are removed from files)
  const allAvailableImages = validUrls;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, [files]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Test Direct Upload Button - For Debugging Only */}
      {/* <div className="p-2 border border-dashed border-yellow-400 bg-yellow-50 rounded-md">
        <h4 className="text-sm font-medium mb-2">Debug Tools</h4>
        <p className="text-xs mb-2">Test direct file upload (bypasses validation)</p>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            console.log("🧪 Test upload: Selected file", file.name);

            try {
              // Simple direct upload test without validation
              const formData = new FormData();
              formData.append("file", file);

              console.log("🧪 Test upload: Sending to /api/upload");
              const response = await fetch("/api/upload", {
                method: "POST",
                body: formData
              });

              const result = await response.json();
              console.log("🧪 Test upload result:", result);

              if (result.success) {
                console.log("🧪 Test upload success! URL:", result.url);
                // Add to form value
                onChange([...currentUrlsRef.current, result.url]);
              } else {
                console.error("🧪 Test upload failed:", result.error);
              }
            } catch (error) {
              console.error("🧪 Test upload error:", error);
            }
          }}
          className="text-xs"
        />
        <button
          type="button"
          className="mt-2 px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 rounded"
          onClick={async () => {
            try {
              console.log("🧪 Testing API connection...");
              const response = await fetch("/api/test");
              const result = await response.json();
              console.log("🧪 API Test result:", result);
            } catch (error) {
              console.error("🧪 API Test error:", error);
            }
          }}
        >
          Test API Connection
        </button>
      </div> */}

      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          (disabled || isResizing) && "cursor-not-allowed opacity-50",
        )}
      >
        <input {...getInputProps()} />
        {isResizing ? (
          <>
            <Zap className="mx-auto mb-4 h-12 w-12 text-blue-500 animate-pulse" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-blue-600">
                Compressing images...
              </p>
              <p className="text-sm text-muted-foreground">
                {resizeProgress.current > 0 && resizeProgress.total > 0
                  ? `Processing ${resizeProgress.current} of ${resizeProgress.total}: ${resizeProgress.filename}`
                  : "Preparing to compress images..."}
              </p>
              {resizeProgress.total > 0 && (
                <Progress
                  value={(resizeProgress.current / resizeProgress.total) * 100}
                  className="w-full max-w-xs mx-auto"
                />
              )}
            </div>
          </>
        ) : (
          <>
            <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop images here" : "Upload playground images"}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag & drop images or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max {finalConfig.maxFiles} files, large images will be automatically compressed
              </p>
            </div>
          </>
        )}
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

      {/* Unified Images Grid */}
      {allAvailableImages.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {showCoverSelection ? "Images & Cover Selection" : "Uploaded Images"}
            </h4>
            {showCoverSelection && coverImage && (
              <p className="text-xs text-muted-foreground">
                Click an image to set as cover
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {allAvailableImages.map((url, index) => {
              const isCover = showCoverSelection && coverImage === url;
              return (
                <div key={url} className="group relative">
                  <div
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border transition-all",
                      showCoverSelection && "cursor-pointer hover:ring-2 hover:ring-primary",
                      isCover && "ring-2 ring-primary shadow-md"
                    )}
                    onClick={() => selectCoverImage(url)}
                  >
                    <Image
                      src={url}
                      alt={`Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />

                    {/* Cover indicator */}
                    {isCover && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Star className="h-4 w-4 fill-current" />
                        </div>
                      </div>
                    )}

                    {/* Remove button */}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute right-2 top-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExistingImage(url);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Image label */}
                  <div className="mt-1 text-center">
                    {isCover && (
                      <p className="text-xs font-medium text-primary">
                        Cover Image
                      </p>
                    )}
                    {/* Show compression info if this image was resized */}
                    {(() => {
                      // Find the resize result by matching URL or filename
                      const filename = url.split('/').pop();
                      const resizeResult = Array.from(resizeResults.values())
                        .find(r => r.file.name.includes(filename?.replace('_compressed', '') ?? ''));

                      if (resizeResult?.wasResized) {
                        return (
                          <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mt-1">
                            <Zap className="h-3 w-3" />
                            <span>{formatCompressionInfo(resizeResult)}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Being Uploaded */}
      {files.some(f => {
        const state = uploadProgress.get(f.id)?.state;
        return state === "uploading" || state === "success";
      }) && (
          <div>
            <h4 className="mb-3 text-sm font-medium">Uploading Images</h4>
            <div className="space-y-4">
              {files
                .filter(f => {
                  const state = uploadProgress.get(f.id)?.state;
                  return state === "uploading" || state === "success";
                })
                .map((file) => {
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

                          {/* Progress Bar or Success Message */}
                          {progress?.state === "uploading" && (
                            <div className="space-y-1">
                              <Progress value={progress.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {progress.progress}% uploaded
                              </p>
                            </div>
                          )}
                          {progress?.state === "success" && (
                            <p className="text-xs text-green-600">
                              Upload complete! Moving to gallery...
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
          {totalUploadedImages} of {finalConfig.maxFiles} images uploaded
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
