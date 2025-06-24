"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { useSwipe } from "~/lib/hooks/use-swipe";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

export default function ImageCarousel({ images, alt, className }: ImageCarouselProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const hasMultipleImages = images.length > 1;

  const changeImage = (newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedImageIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const nextImage = () => {
    if (isTransitioning) return;
    const newIndex = (selectedImageIndex + 1) % images.length;
    changeImage(newIndex);
  };

  const previousImage = () => {
    if (isTransitioning) return;
    const newIndex = (selectedImageIndex - 1 + images.length) % images.length;
    changeImage(newIndex);
  };

  // Add swipe functionality
  const swipeHandlers = useSwipe({
    onSwipeLeft: nextImage,
    onSwipeRight: previousImage,
  });

  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    dragOffset,
    isDragging,
    style
  } = swipeHandlers;

  if (images.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div className="relative h-[400px] w-full overflow-hidden rounded-t-lg bg-gray-100 flex items-center justify-center">
            <p className="text-muted-foreground">No images available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Main Carousel */}
          <div
            className="relative h-[265px] sm:h-[400px] md:h-[500px] lg:h-[600px] w-full overflow-hidden rounded-t-lg touch-pan-y select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            style={style}
          >
            {/* Image container with sliding animation */}
            <div
              className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-in-out'}`}
              style={{
                transform: `translateX(calc(-${selectedImageIndex * (100 / images.length)}% + ${dragOffset}px))`,
                width: `${images.length * 100}%`
              }}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  className="relative h-full flex-shrink-0 bg-gray-50"
                  style={{ width: `${100 / images.length}%` }}
                >
                  <Image
                    src={image ?? "/playground.jpg"}
                    alt={`${alt} - Image ${index + 1}`}
                    fill
                    sizes="(max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1200px) 960px, 1200px"
                    className="object-contain p-2"
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "low"}
                  />
                </div>
              ))}
            </div>

            {/* Navigation arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={previousImage}
                  disabled={isTransitioning}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  disabled={isTransitioning}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image counter */}
            {hasMultipleImages && (
              <div className="absolute right-4 top-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white">
                {selectedImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Dot indicators - overlaid at bottom */}
            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => changeImage(index)}
                    disabled={isTransitioning}
                    className={`h-3 w-3 rounded-full transition-colors disabled:opacity-50 ${index === selectedImageIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {hasMultipleImages && (
            <div className="border-t bg-muted/30 p-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => changeImage(index)}
                    disabled={isTransitioning}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${index === selectedImageIndex
                      ? 'border-primary shadow-md'
                      : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={image ?? "/playground.jpg"}
                      alt={`${alt} - Thumbnail ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
