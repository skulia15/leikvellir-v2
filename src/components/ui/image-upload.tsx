// components/ui/image-upload.tsx
"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, AlertCircle, CheckCircle2, Loader2, Star, Zap } from "lucide-react";
import Image from "next/image";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
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
import { useT } from "~/lib/i18n";

interface ImageUploadProps {
  value?: string[]; // Current image URLs
  onChange: (urls: string[]) => void;
  config?: Partial<ImageUploadConfig>;
  className?: string;
  disabled?: boolean;
  // Cover image selection props
  coverImage?: string | null;
  onCoverImageChange?: (url: string | null) => void;
  showCoverSelection?: boolean;
  // Mark images for removal instead of actually removing them
  _allowRemoval?: boolean;
  // Track which images are marked for removal (without actually removing them)
  markedForRemoval?: string[];
  onMarkForRemoval?: (url: string, marked: boolean) => void;
  // Callback when upload state changes (for disabling form submit)
  onUploadingChange?: (isUploading: boolean) => void;
}

export function ImageUpload({
  value = [],
  onChange,
  config = {},
  className,
  disabled = false,
  coverImage,
  onCoverImageChange,
  showCoverSelection = false,
  _allowRemoval = false,
  markedForRemoval = [],
  onMarkForRemoval,
  onUploadingChange,
}: ImageUploadProps) {
  const finalConfig = useMemo(
    () => ({ ...DEFAULT_UPLOAD_CONFIG, ...config }),
    [config],
  );

  const t = useT();

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<
    Map<string, UploadProgress>
  >(new Map());
  const [errors, setErrors] = useState<string[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeProgress, setResizeProgress] = useState({ current: 0, total: 0, filename: '' });
  const [resizeResults, setResizeResults] = useState<Map<string, ResizeResult>>(new Map());

  // Track if any uploads are in progress and notify parent
  const isUploading = useMemo(() => {
    const hasActiveUploads = files.some(f => uploadProgress.get(f.id)?.state === "uploading");
    return hasActiveUploads || isResizing;
  }, [files, uploadProgress, isResizing]);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

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
              setUploadProgress((prev) => {
                const updated = new Map(prev);
                updated.set(file.id, {
                  fileId: file.id,
                  progress: 0,
                  state: "error",
                  error: response.error ?? "Upload failed",
                });
                return updated;
              });
            }
          } else {
            setUploadProgress((prev) => {
              const updated = new Map(prev);
              updated.set(file.id, {
                fileId: file.id,
                progress: 0,
                state: "error",
                error: `Upload failed with status ${xhr.status}`,
              });
              return updated;
            });
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
    [onChange, showCoverSelection, coverImage, onCoverImageChange],
  );

  // Handle file drop/selection with automatic resizing
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled) return;


      setErrors([]);

      try {
        // Check if this batch would exceed the per-batch limit
        const currentPending = files.length;
        const batchSize = currentPending + acceptedFiles.length;

        if (batchSize > finalConfig.maxFiles) {
          setErrors([
            t('forms.maximumBatchFilesExceeded', {
              maxFiles: finalConfig.maxFiles,
              batchSize: acceptedFiles.length
            }),
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
            ...nonImageFiles.map(file => t('forms.onlyImageFilesSupported', { filename: file.name }))
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

          } catch (error) {
            console.error("❌ Error during resize:", error);
            setErrors(prev => [
              ...prev,
              t('forms.failedToResizeImages', { error: error instanceof Error ? error.message : t('errors.unknownError') })
            ]);
            return;
          } finally {
            setIsResizing(false);
            setResizeProgress({ current: 0, total: 0, filename: '' });
          }
        }

        // Validate all processed files
        const { valid, invalid } = await validateMultipleFiles(
          processedFiles,
          finalConfig,
        );
        // Show validation errors
        if (invalid.length > 0) {
          setErrors(prev => [
            ...prev,
            ...invalid.map(({ file, error }) => t('forms.fileValidationError', { filename: file.name, error }))
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
          error instanceof Error ? error.message : t('forms.processingFailed'),
        ]);
      }
    },
    [
      files.length,
      finalConfig,
      createFileWithPreview,
      disabled,
      uploadFile,
      t,
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
          ...reallyRejectedFiles.map(r => t('forms.fileRejected', {
            filename: r.file.name,
            errors: r.errors.map(e => e.message).join(', ')
          }))
        ]);
      }
    },

    onDropRejected: () => {
      // Rejections are already handled in the onDrop callback above
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

  // Handle existing uploaded image (either mark for removal or actually remove)
  const handleExistingImage = async (url: string) => {
    if (onMarkForRemoval) {
      // If we're using the mark-for-removal pattern
      const isCurrentlyMarked = markedForRemoval.includes(url);
      onMarkForRemoval(url, !isCurrentlyMarked);

      // If the image was the cover and it's being marked for removal, clear cover selection
      if (!isCurrentlyMarked && showCoverSelection && coverImage === url && onCoverImageChange) {
        onCoverImageChange(null);
      }
    } else {
      // Use the original removal logic - actually remove from the array
      try {
        // For Vercel Blob Storage, we can pass the full URL
        if (url.includes('vercel-storage.com') || url.includes('blob.vercel-storage.com')) {
          // Delete using the full blob URL
          fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
            method: 'DELETE',
          }).catch(() => {
            // Silently ignore deletion errors for blob storage
          });
        } else {
          // Fallback for local files (backward compatibility)
          const filename = url.split('/').pop();
          if (filename && url.startsWith('/uploads/playgrounds/')) {
            fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
              method: 'DELETE',
            }).catch(() => {
              // Silently ignore deletion errors for local files
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
                {t('forms.compressingImages')}
              </p>
              <p className="text-sm text-muted-foreground">
                {resizeProgress.current > 0 && resizeProgress.total > 0
                  ? t('forms.processingImageProgress', {
                    current: resizeProgress.current,
                    total: resizeProgress.total,
                    filename: resizeProgress.filename
                  })
                  : t('forms.preparingToCompressImages')}
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
                {isDragActive ? t('forms.dropImagesHere') : t('forms.uploadPlaygroundImages')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('forms.dragDropOrClick')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('forms.maxFilesPerBatchCompression', { maxFiles: finalConfig.maxFiles })}
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
              {showCoverSelection ? t('forms.imagesCoverSelection') : t('forms.uploadedImages')}
            </h4>
            {showCoverSelection && coverImage && (
              <p className="text-xs text-muted-foreground">
                {t('forms.clickImageSetCover')}
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
                      showCoverSelection &&
                        "hover:ring-2 hover:ring-primary focus-within:ring-2 focus-within:ring-primary",
                      isCover && "ring-2 ring-primary shadow-md"
                    )}
                  >
                    {showCoverSelection ? (
                      <button
                        type="button"
                        onClick={() => selectCoverImage(url)}
                        aria-pressed={isCover}
                        aria-label={t("a11y.setAsCoverImage", { index: index + 1 })}
                        className="relative block h-full w-full cursor-pointer focus-visible:outline-none"
                      >
                        <Image
                          src={url}
                          alt={t('forms.imageAlt', { index: index + 1 })}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />

                        {/* Cover indicator */}
                        {isCover && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                            </div>
                          </div>
                        )}
                      </button>
                    ) : (
                      <Image
                        src={url}
                        alt={t('forms.imageAlt', { index: index + 1 })}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    )}

                    {/* Remove button or marked-for-removal indicator */}
                    {/* Always show removal button, regardless of allowRemoval setting */}
                    {markedForRemoval.includes(url) ? (
                      <div className="absolute inset-0 z-10 bg-red-500/20 flex items-center justify-center">
                        <Badge variant="destructive" className="px-2 py-1 text-xs">
                          {t('forms.markedForRemoval')}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="absolute right-2 top-2 h-7 w-7 p-0"
                          aria-label={t("a11y.undoRemoveImage", { index: index + 1 })}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleExistingImage(url);
                          }}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute right-2 top-2 z-10 h-7 w-7 p-0 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                        aria-label={t("a11y.removeImage", { index: index + 1 })}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleExistingImage(url);
                        }}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>

                  {/* Image label */}
                  <div className="mt-1 text-center">
                    {isCover && (
                      <p className="text-xs font-medium text-primary">
                        {t('forms.coverImage')}
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
            <h4 className="mb-3 text-sm font-medium">{t('forms.uploadingImages')}</h4>
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
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden="true" />
                              )}
                              {progress?.state === "success" && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                aria-label={t("a11y.removeUploadFile", { filename: file.name })}
                                onClick={() => removeFile(file.id)}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>

                          {/* Progress Bar or Success Message */}
                          {progress?.state === "uploading" && (
                            <div className="space-y-1">
                              <Progress value={progress.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {t('forms.uploadProgress', { progress: progress.progress })}
                              </p>
                            </div>
                          )}
                          {progress?.state === "success" && (
                            <p className="text-xs text-green-600">
                              {t('forms.uploadCompleteMoving')}
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
          {t('forms.imagesUploadedBatchStats', {
            uploaded: totalUploadedImages,
            pending: files.length,
            maxPerBatch: finalConfig.maxFiles
          })}
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
