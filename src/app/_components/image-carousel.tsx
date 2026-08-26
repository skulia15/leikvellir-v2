"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";

import ImageLightbox from "./image-lightbox";
import { useSwipe } from "~/lib/hooks/use-swipe";
import { useT } from "~/lib/i18n";
import { blurPlaceholderProps } from "~/lib/image-placeholder";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  onAddPhotos?: () => void;
  /** Low-quality placeholders keyed by image URL; images without one just load as before. */
  blurData?: Record<string, string> | null;
}

export default function ImageCarousel({ images, alt, className, onAddPhotos, blurData }: ImageCarouselProps) {
  const t = useT();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  // A swipe/drag also ends in a click; remember where the press started so we
  // can tell a tap apart from a drag and only open the lightbox on a tap.
  const pressStart = useRef<{ x: number; y: number } | null>(null);

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
      <div className={`overflow-hidden rounded-2xl bg-muted ${className ?? ''}`}>
        <button
          onClick={onAddPhotos}
          disabled={!onAddPhotos}
          className="relative aspect-[4/3] sm:aspect-auto sm:h-[400px] md:h-[500px] lg:h-[600px] w-full flex flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-primary disabled:cursor-default disabled:hover:text-muted-foreground"
        >
          <Camera className="h-10 w-10" />
          <div className="text-center">
            <p className="text-sm font-medium">{t("playground.noImagesAvailable")}</p>
            {onAddPhotos && (
              <p className="text-xs mt-1 text-primary font-medium">{t("forms.addPhotos")}</p>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl ${className ?? ''}`}>
      {/* Main Carousel */}
      <div
        className="relative aspect-[4/3] sm:aspect-auto sm:h-[400px] md:h-[500px] lg:h-[600px] w-full overflow-hidden rounded-2xl bg-gray-50 group touch-pan-y select-none"
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
            <button
              key={index}
              type="button"
              onPointerDown={(event) => {
                pressStart.current = { x: event.clientX, y: event.clientY };
              }}
              onClick={(event) => {
                const start = pressStart.current;
                if (!start) return;
                const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
                if (moved < 10) setIsLightboxOpen(true);
              }}
              className="relative h-full flex-shrink-0 cursor-zoom-in"
              style={{ width: `${100 / images.length}%` }}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image ?? "/playground.jpg"}
                {...blurPlaceholderProps(blurData?.[image])}
                alt={`${alt} - Image ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 800px"
                className="object-cover"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "low"}
                quality={85}
                draggable={false}
              />
            </button>
          ))}
        </div>

        {/* Navigation arrows — visible on hover */}
        {hasMultipleImages && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={previousImage}
              disabled={isTransitioning}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              disabled={isTransitioning}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Image counter */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            {selectedImageIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Dot indicators — below image */}
      {hasMultipleImages && (
        <div className="flex justify-center gap-1 mt-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => changeImage(index)}
              disabled={isTransitioning}
              className={`h-1.5 w-1.5 rounded-full transition-colors disabled:opacity-50 ${index === selectedImageIndex
                ? 'bg-primary'
                : 'bg-muted-foreground/30'
                }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
      {isLightboxOpen && (
        <ImageLightbox
          images={images}
          alt={alt}
          index={selectedImageIndex}
          onIndexChange={setSelectedImageIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
}
