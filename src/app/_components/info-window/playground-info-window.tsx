"use client";

import { InfoWindow } from "@vis.gl/react-google-maps";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { calculateDistance, formatDistance, type UserLocation } from "~/lib/geo-utils";
import { useSwipe } from "~/lib/hooks/use-swipe";
import { useT } from "~/lib/i18n";
import { type Playground } from "~/types";

interface PlaygroundInfoWindowProps {
  playground: Playground;
  userLocation: UserLocation | null;
  onClose: () => void;
}

export function PlaygroundInfoWindow({
  playground,
  userLocation,
  onClose,
}: PlaygroundInfoWindowProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const t = useT();

  const distance = userLocation
    ? calculateDistance(
      userLocation.lat,
      userLocation.lng,
      playground.latitude,
      playground.longitude,
    )
    : null;

  // Get all available images, removing duplicates
  const images = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images || [])
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

  // Destructure swipe handlers to separate DOM event handlers from other properties
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



  return (
    <InfoWindow
      position={{
        lat: playground.latitude, // Slightly larger offset for better positioning
        lng: playground.longitude
      }}
      onCloseClick={onClose}
      pixelOffset={[0, -30]}
      headerDisabled={true}
    >
      <Card className="w-full min-w-72 max-w-80 sm:w-80 border-0 shadow-none max-h-[85vh] sm:max-h-96 overflow-hidden">
        <CardContent className="p-0">
          {/* Compact header with inline close button */}
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-semibold text-base leading-tight flex-1 min-w-0">
                {playground.title}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {distance && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 h-5">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(distance)}
                  </Badge>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Horizontal feature badges row */}
            {(playground.toddlerFriendly || playground.publiclyAccessible) && (
              <div className="flex items-center gap-1.5">
                {playground.toddlerFriendly && (
                  <Badge variant="outline" className="text-xs py-0 h-4 px-2">
                    {t('playground.toddlerFriendly')}
                  </Badge>
                )}
                {playground.publiclyAccessible && (
                  <Badge variant="outline" className="text-xs py-0 h-4 px-2">
                    {t('playground.publicAccess')}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Compact image section */}
          {hasImages && (
            <div className="relative mx-3 mb-2">
              <div
                className="relative h-32 w-full overflow-hidden rounded-md touch-pan-y select-none bg-gray-50"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                style={style}
              >
                {/* Image container */}
                <div
                  className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-in-out'}`}
                  style={{
                    transform: `translateX(calc(-${currentImageIndex * (100 / images.length)}% + ${dragOffset}px))`,
                    width: `${images.length * 100}%`
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
                        alt={`${playground.title} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                        priority={index === 0}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation arrows - only show on hover for cleaner look */}
                {hasMultipleImages && (
                  <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={previousImage}
                      disabled={isTransitioning}
                      className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={nextImage}
                      disabled={isTransitioning}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors disabled:opacity-50"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Image counter - smaller and in corner */}
                {hasMultipleImages && (
                  <div className="absolute top-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                    {currentImageIndex + 1}/{images.length}
                  </div>
                )}
              </div>

              {/* Compact dots indicator */}
              {hasMultipleImages && (
                <div className="flex justify-center gap-1 mt-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => changeImage(index)}
                      disabled={isTransitioning}
                      className={`h-1.5 w-1.5 rounded-full transition-colors disabled:opacity-50 ${index === currentImageIndex
                        ? 'bg-primary'
                        : 'bg-muted-foreground/30'
                        }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <div className="px-3 pb-3">
            <Link
              href={`/playground/${playground.id}`}

            >            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-sm"
            >
                <ExternalLink className="mr-1 h-3 w-3" />
                {t('playground.viewDetails')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </InfoWindow>
  );
}
