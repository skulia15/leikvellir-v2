"use client";

/**
 * Mapbox Popup for showing playground details when a marker is clicked.
 * Image-forward design with title overlay and compact metadata.
 */
import { Popup } from "react-map-gl/mapbox";
import { Baby, ChevronLeft, ChevronRight, Footprints, Users, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  calculateDistance,
  type UserLocation,
} from "~/lib/geo-utils";
import { estimateWalkingTime } from "~/lib/map-utils";
import { useSwipe } from "~/lib/hooks/use-swipe";
import { useT } from "~/lib/i18n";
import { type Playground } from "~/types";

interface MapInfoPopupProps {
  playground: Playground;
  userLocation: UserLocation | null;
  onClose: () => void;
}

export function MapInfoPopup({
  playground,
  userLocation,
  onClose,
}: MapInfoPopupProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const t = useT();

  // Reset image index when playground changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [playground.id]);

  const distance = userLocation
    ? calculateDistance(
        userLocation.lat,
        userLocation.lng,
        playground.latitude,
        playground.longitude,
      )
    : null;

  const walkingTime = distance ? estimateWalkingTime(distance) : null;

  // Get all available images, removing duplicates
  const images = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images || []),
  ].filter((img, index, arr) => arr.indexOf(img) === index);

  const hasMultipleImages = images.length > 1;
  const hasImages = images.length > 0;

  const changeImage = (newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const nextImage = () => {
    if (isTransitioning) return;
    const newIndex = (currentImageIndex + 1) % images.length;
    changeImage(newIndex);
  };

  const previousImage = () => {
    if (isTransitioning) return;
    const newIndex = (currentImageIndex - 1 + images.length) % images.length;
    changeImage(newIndex);
  };

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
    style,
  } = swipeHandlers;

  return (
    <Popup
      longitude={playground.longitude}
      latitude={playground.latitude}
      anchor="bottom"
      offset={40}
      closeOnClick={false}
      onClose={onClose}
      maxWidth="320px"
      className="playground-info-popup"
    >
      <div className="w-[300px] overflow-hidden">
        {/* Image section — hero position */}
        <div className="relative">
          {hasImages ? (
            <div
              className="relative h-[180px] w-full overflow-hidden bg-muted group"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
              style={style}
            >
              {/* Swipeable image strip */}
              <div
                className={`flex h-full ${isDragging ? "" : "transition-transform duration-300 ease-in-out"}`}
                style={{
                  transform: `translateX(calc(-${currentImageIndex * (100 / images.length)}% + ${dragOffset}px))`,
                  width: `${images.length * 100}%`,
                }}
              >
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="relative h-full flex-shrink-0"
                    style={{ width: `${100 / images.length}%` }}
                  >
                    <Image
                      src={image ?? "/playground.jpg"}
                      alt={`${playground.title} - ${index + 1}`}
                      fill
                      sizes="300px"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>

              {/* Gradient overlay for title legibility */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

              {/* Title overlaid on image */}
              <div className="absolute bottom-0 inset-x-0 px-3.5 pb-3">
                <h3 className="font-sans font-bold text-[15px] leading-snug text-white drop-shadow-sm line-clamp-2">
                  {playground.title}
                </h3>
              </div>

              {/* Navigation arrows */}
              {hasMultipleImages && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={previousImage}
                    disabled={isTransitioning}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-foreground hover:bg-white transition-colors disabled:opacity-50 shadow-sm"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={nextImage}
                    disabled={isTransitioning}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-foreground hover:bg-white transition-colors disabled:opacity-50 shadow-sm"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Dot indicators on image */}
              {hasMultipleImages && (
                <div className="absolute bottom-[42px] inset-x-0 flex justify-center gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => changeImage(index)}
                      disabled={isTransitioning}
                      className={`h-1.5 rounded-full transition-all disabled:opacity-50 ${
                        index === currentImageIndex
                          ? "w-4 bg-white"
                          : "w-1.5 bg-white/50"
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[120px] w-full bg-muted flex items-center justify-center">
              <div className="px-3.5 pb-3 absolute bottom-0 inset-x-0">
                <h3 className="font-sans font-bold text-[15px] leading-snug text-foreground line-clamp-2">
                  {playground.title}
                </h3>
              </div>
            </div>
          )}
        </div>

        {/* Metadata + action row */}
        <div className="px-3.5 py-3 flex items-center justify-between gap-3">
          {/* Left: metadata chips */}
          <div className="flex items-center gap-2 flex-wrap min-w-0 text-xs text-muted-foreground">
            {walkingTime && (
              <span className="flex items-center gap-1 font-medium text-foreground/70">
                <Footprints className="h-3 w-3" />
                {walkingTime.text}
              </span>
            )}
            {playground.toddlerFriendly && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-terrain-moss" />
                <Baby className="h-3 w-3" />
              </span>
            )}
            {playground.publiclyAccessible && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-terrain-water" />
                <Users className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Right: action link */}
          <Link
            href={`/playground/${playground.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {t("playground.viewDetails")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Popup>
  );
}
