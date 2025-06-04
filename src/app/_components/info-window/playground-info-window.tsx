"use client";

import { InfoWindow } from "@vis.gl/react-google-maps";
import { Baby, ChevronLeft, ChevronRight, MapPin, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const t = useT();

  // Animation for opening
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150); // Match animation duration
  };

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
        lat: playground.latitude,
        lng: playground.longitude
      }}
      onCloseClick={handleClose}
      pixelOffset={[0, -40]}
      headerDisabled={true}

    >
      <div className="border-0 bg-transparent p-0 m-0">
        <Card
          className={`w-full max-w-[280px] shadow-lg bg-white rounded-lg overflow-hidden transition-all duration-200 ease-out border-0 ${isVisible && !isClosing
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
            }`}
        >
          <CardContent className="p-0">
            {/* Header with close button */}
            <div className="px-4 pt-4 pb-3 bg-white">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-lg leading-tight flex-1 min-w-0 text-gray-900">
                  {playground.title}
                </h3>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Distance and badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                {distance && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1.5 px-2 py-1">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(distance)}
                  </Badge>
                )}
                {playground.toddlerFriendly && (
                  <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1.5">
                    <Baby className="h-3 w-3" />
                    {t('playground.toddlerFriendly')}
                  </Badge>
                )}
                {playground.publiclyAccessible && (
                  <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {t('playground.publicAccess')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Image section */}
            {hasImages && (
              <div className="relative">
                <div
                  className="relative h-48 w-full overflow-hidden bg-gray-50 group"
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
                          sizes="280px"
                          className="object-cover"
                          priority={index === 0}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation arrows */}
                  {hasMultipleImages && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={previousImage}
                        disabled={isTransitioning}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        disabled={isTransitioning}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Image counter */}
                  {hasMultipleImages && (
                    <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
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
            <div className="p-4 bg-white">
              <Link href={`/playground/${playground.id}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full h-9 text-sm font-medium"
                >
                  {t('playground.viewDetails')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </InfoWindow>
  );
}
