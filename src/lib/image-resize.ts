"use client";

// src/lib/image-resize.ts
export interface ResizeOptions {
  maxSizeBytes: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  maintainAspectRatio?: boolean;
}

export interface ResizeResult {
  file: File;
  originalSize: number;
  finalSize: number;
  wasResized: boolean;
  compressionRatio?: number;
}

const DEFAULT_RESIZE_OPTIONS: Required<ResizeOptions> = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  format: 'image/jpeg',
  maintainAspectRatio: true,
};

/**
 * Load an image file into an HTMLImageElement
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    
    img.src = url;
  });
}

/**
 * Create a canvas and draw the image with specified dimensions
 */
function drawImageToCanvas(
  img: HTMLImageElement, 
  width: number, 
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Use high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw the image
  ctx.drawImage(img, 0, 0, width, height);
  
  return canvas;
}

/**
 * Convert canvas to blob with specified format and quality
 */
function canvasToBlob(
  canvas: HTMLCanvasElement, 
  format: string, 
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean
): { width: number; height: number } {
  if (!maintainAspectRatio) {
    return { width: maxWidth, height: maxHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  let width = Math.min(originalWidth, maxWidth);
  let height = Math.min(originalHeight, maxHeight);
  
  // Adjust to maintain aspect ratio
  if (width / height > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Generate a new filename with resize indicator
 */
function generateResizedFilename(originalName: string, wasCompressed: boolean): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return wasCompressed ? `${originalName}_compressed` : originalName;
  }
  
  const nameWithoutExt = originalName.substring(0, lastDotIndex);
  const extension = originalName.substring(lastDotIndex);
  
  return wasCompressed 
    ? `${nameWithoutExt}_compressed${extension}`
    : originalName;
}

/**
 * Resize and compress an image file to meet size requirements
 */
export async function resizeImage(
  file: File, 
  options: Partial<ResizeOptions> = {}
): Promise<ResizeResult> {
  const config = { ...DEFAULT_RESIZE_OPTIONS, ...options };
  const originalSize = file.size;
  
  // If file is already under the size limit, return as-is
  if (originalSize <= config.maxSizeBytes) {
    return {
      file,
      originalSize,
      finalSize: originalSize,
      wasResized: false,
    };
  }
  
  console.log(`🔄 Resizing image: ${file.name} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    // Load the image
    const img = await loadImageFromFile(file);
    
    // Determine output format - prefer JPEG for smaller files unless it's PNG with transparency
    let outputFormat = config.format;
    if (file.type === 'image/png' && config.format === 'image/jpeg') {
      // Keep PNG if it might have transparency
      outputFormat = 'image/png';
    }
    
    // Start with original dimensions
    let { width, height } = calculateOptimalDimensions(
      img.width,
      img.height,
      config.maxWidth,
      config.maxHeight,
      config.maintainAspectRatio
    );
    
    let quality = config.quality;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Create canvas and draw image
      const canvas = drawImageToCanvas(img, width, height);
      
      // Convert to blob
      const blob = await canvasToBlob(canvas, outputFormat, quality);
      
      console.log(`📏 Attempt ${attempts}: ${width}x${height}, quality=${quality.toFixed(2)}, size=${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Check if we've met the size requirement
      if (blob.size <= config.maxSizeBytes || quality <= 0.1) {
        // Create new file from blob
        const resizedFile = new File(
          [blob], 
          generateResizedFilename(file.name, true),
          { 
            type: outputFormat,
            lastModified: Date.now(),
          }
        );
        
        const compressionRatio = originalSize / blob.size;
        
        console.log(`✅ Resize complete: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB (${compressionRatio.toFixed(1)}x compression)`);
        
        return {
          file: resizedFile,
          originalSize,
          finalSize: blob.size,
          wasResized: true,
          compressionRatio,
        };
      }
      
      // If still too large, try reducing quality first
      if (quality > 0.3) {
        quality = Math.max(0.1, quality - 0.1);
      } else {
        // If quality is low, reduce dimensions
        width = Math.round(width * 0.9);
        height = Math.round(height * 0.9);
        quality = config.quality; // Reset quality for new dimensions
        
        // Prevent infinite loop with tiny images
        if (width < 100 || height < 100) {
          throw new Error('Image cannot be compressed small enough while maintaining quality');
        }
      }
    }
    
    throw new Error('Failed to compress image to target size after maximum attempts');
    
  } catch (error) {
    console.error(`❌ Failed to resize image ${file.name}:`, error);
    throw error;
  }
}

/**
 * Resize multiple images with progress tracking
 */
export async function resizeImages(
  files: File[],
  options: Partial<ResizeOptions> = {},
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<ResizeResult[]> {
  const results: ResizeResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }
    
    try {
      const result = await resizeImage(file, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to resize ${file.name}:`, error);
      // Return original file if resize fails
      results.push({
        file,
        originalSize: file.size,
        finalSize: file.size,
        wasResized: false,
      });
    }
  }
  
  return results;
}

/**
 * Check if a file needs resizing based on size
 */
export function needsResizing(file: File, maxSizeBytes: number = 2 * 1024 * 1024): boolean {
  return file.size > maxSizeBytes;
}

/**
 * Format compression info for user display
 */
export function formatCompressionInfo(result: ResizeResult): string {
  if (!result.wasResized) {
    return 'No compression needed';
  }
  
  const originalMB = (result.originalSize / 1024 / 1024).toFixed(1);
  const finalMB = (result.finalSize / 1024 / 1024).toFixed(1);
  const ratio = result.compressionRatio?.toFixed(1) ?? '1.0';
  
  return `Compressed from ${originalMB}MB to ${finalMB}MB (${ratio}x smaller)`;
}
