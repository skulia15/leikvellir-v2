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
import { playgroundImageBlurProps } from "~/lib/image-placeholder";
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

  // Reset image index when playground changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [playground.id]);

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
          className={`w-[280px]  shadow-lg bg-white rounded-lg overflow-hidden transition-all duration-200 ease-out border-0 ${isVisible && !isClosing
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
            }`}
        >
          {/* Close button positioned absolutely at top-right */}
          <button
            onClick={handleClose}
            className="absolute top-0 right-0 z-10 p-1  rounded-full  hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-700 -mr-[1px]" />
          </button>

          <CardContent className="p-0 h-full flex flex-col">
            {/* Header - Fixed height */}
            <div className="pl-2 pt-1 pb-2 bg-white flex-shrink-0">
              <div className="pr-8 mb-2">
                <h3 className="font-medium text-base lg:text-md leading-snug text-gray-900 line-clamp-2 antialiased">
                  {playground.title}
                </h3>
              </div>

              {/* Distance and badges row - Fixed height */}
              <div className="flex items-center pb-1 gap-1 flex-wrap min-h-[24px]">
                {distance && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 px-2 py-1">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(distance)}
                  </Badge>
                )}
                {playground.toddlerFriendly && (
                  <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                    <Baby className="h-3 w-3" />
                    {t('playground.toddlerFriendly')}
                  </Badge>
                )}
                {playground.publiclyAccessible && (
                  <Badge variant="outline" className="text-xs px-2 py-1 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('playground.publicAccess')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Image section - Always present with consistent height */}
            <div className="relative flex-1 flex flex-col">
              {hasImages ? (
                <>
                  <div
                    className="relative h-[200px] w-full overflow-hidden bg-gray-50 group"
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
                            {...playgroundImageBlurProps(playground, image)}
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
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={nextImage}
                          disabled={isTransitioning}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black/80 transition-colors disabled:opacity-50 backdrop-blur-sm"
                          aria-label="Next image"
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
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-[200px] w-full bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">{t('playground.noImages')}</p>
                </div>
              )}
            </div>

            {/* Action button */}
            <div className="pt-4 pb-1 px-0 bg-white">
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