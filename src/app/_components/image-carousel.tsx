"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";

import { useSwipe } from "~/lib/hooks/use-swipe";
import { useT } from "~/lib/i18n";
import { blurPlaceholderProps } from "~/lib/image-placeholder";

const ImageLightbox = dynamic(() => import("./image-lightbox"), { ssr: false });

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
          type="button"
          onClick={onAddPhotos}
          disabled={!onAddPhotos}
          className="relative aspect-[4/3] sm:aspect-auto sm:h-[400px] md:h-[500px] lg:h-[600px] w-full flex flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-primary disabled:cursor-default disabled:hover:text-muted-foreground"
        >
          <Camera className="h-10 w-10" aria-hidden="true" />
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
          {images.map((image, index) => {
            const isCurrent = index === selectedImageIndex;
            return (
              <button
                key={index}
                type="button"
                tabIndex={isCurrent ? 0 : -1}
                aria-hidden={!isCurrent}
                onPointerDown={(event) => {
                  pressStart.current = { x: event.clientX, y: event.clientY };
                }}
                onPointerCancel={() => {
                  pressStart.current = null;
                }}
                onClick={(event) => {
                  const start = pressStart.current;
                  pressStart.current = null;
                  if (!start) {
                    // Keyboard activation (Enter/Space) does not fire pointerdown
                    setSelectedImageIndex(index);
                    setIsLightboxOpen(true);
                    return;
                  }
                  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
                  if (moved < 10) {
                    setSelectedImageIndex(index);
                    setIsLightboxOpen(true);
                  }
                }}
                className="relative h-full flex-shrink-0 cursor-zoom-in"
                style={{ width: `${100 / images.length}%` }}
                aria-label={t("a11y.viewImage", { index: index + 1, total: images.length })}
              >
                <Image
                  src={image ?? "/playground.jpg"}
                  {...blurPlaceholderProps(blurData?.[image])}
                  alt={`${alt} - ${t("forms.imageAlt", { index: index + 1 })}`}
                  fill
                  sizes="(max-width: 1023px) 100vw, (max-width: 1536px) calc(100vw - 456px), 1080px"
                  className="object-cover"
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  quality={85}
                  draggable={false}
                />
              </button>
            );
          })}
        </div>

        {/* Navigation arrows — visible on touch, hover, and keyboard focus */}
        {hasMultipleImages && (
          <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={previousImage}
              disabled={isTransitioning}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
              aria-label={t("a11y.previousImage")}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              disabled={isTransitioning}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
              aria-label={t("a11y.nextImage")}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Image counter */}
        {hasMultipleImages && (
          <div
            aria-live="polite"
            className="absolute top-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur-sm"
          >
            {selectedImageIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Dot indicators — below image with 44px touch targets */}
      {hasMultipleImages && (
        <div className="flex flex-wrap justify-center mt-1">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => changeImage(index)}
              disabled={isTransitioning}
              className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-50"
              aria-label={t("a11y.goToImage", { index: index + 1 })}
              aria-current={index === selectedImageIndex ? "true" : undefined}
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full transition-colors ${index === selectedImageIndex
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30'
                  }`}
              />
            </button>
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
