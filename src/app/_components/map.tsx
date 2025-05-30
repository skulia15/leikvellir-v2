"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { env } from "~/env";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import Image from "next/image";
import { MapPin, Navigation, ChevronLeft, ChevronRight } from "lucide-react";
import { type PlaygroundFilters } from "./playground-filters";
import { calculateDistance, formatDistance, type UserLocation } from "~/lib/geo-utils";
import { useSwipe } from "~/lib/hooks/use-swipe";

interface MapProps {
  selectedPlayground: Playground | null;
  onPlaygroundSelect: (playground: Playground | null) => void;
  filters: PlaygroundFilters;
  userLocation: UserLocation | null;
  onUserLocationChange: (location: UserLocation | null) => void;
  mapCenter?: UserLocation | null;
  onVisiblePlaygroundsChange?: (playgrounds: (Playground & { distance?: number | null })[]) => void;
}

const defaultCenter = {
  lat: 64.071, // Hafnarfjörður, Iceland
  lng: -21.954,
};

function PlaygroundInfoWindow({
  playground,
  userLocation,
  onClose,
}: {
  playground: Playground;
  userLocation: UserLocation | null;
  onClose: () => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const distance = userLocation
    ? calculateDistance(
      userLocation.lat,
      userLocation.lng,
      playground.latitude,
      playground.longitude,
    )
    : null;

  // Get all available images
  const images = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images || [])
  ].filter((img, index, arr) => arr.indexOf(img) === index); // Remove duplicates

  const hasMultipleImages = images.length > 1;

  const changeImage = (newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentImageIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const nextImage = () => {
    if (isTransitioning) return; // Prevent multiple transitions
    const newIndex = (currentImageIndex + 1) % images.length;
    changeImage(newIndex);
  };

  const previousImage = () => {
    if (isTransitioning) return; // Prevent multiple transitions
    const newIndex = (currentImageIndex - 1 + images.length) % images.length;
    changeImage(newIndex);
  };

  // Add swipe functionality
  const swipeHandlers = useSwipe({
    onSwipeLeft: nextImage,
    onSwipeRight: previousImage,
  });

  // Destructure to separate event handlers from data properties
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
        lat: playground.latitude + 0.0005, // Small offset to position above the pin
        lng: playground.longitude
      }}
      onCloseClick={onClose}
    >
      <Card className="w-96 border-0 shadow-none">
        <CardContent className="p-0">
          {/* Image carousel section */}
          {images.length > 0 && (
            <div className="relative">
              <div
                className="relative h-56 w-full overflow-hidden rounded-t-lg touch-pan-y select-none"
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
                    transform: `translateX(calc(-${currentImageIndex * (100 / images.length)}% + ${dragOffset}px))`,
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
                        alt={`${playground.title} - Image ${index + 1}`}
                        fill
                        className="object-contain p-2"
                        priority={index === 0}
                      />
                    </div>
                  ))}
                </div>

                {/* Image navigation */}
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={previousImage}
                      disabled={isTransitioning}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      disabled={isTransitioning}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Image counter */}
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Image dots indicator */}
              {hasMultipleImages && (
                <div className="flex justify-center gap-1 py-2 bg-background">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => changeImage(index)}
                      disabled={isTransitioning}
                      className={`h-2 w-2 rounded-full transition-colors disabled:opacity-50 ${index === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content section */}
          <div className="p-4 space-y-3">
            {/* Title and distance */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg leading-tight flex-1">{playground.title}</h3>
              {distance && (
                <Badge variant="default" className="text-xs flex items-center gap-1 shrink-0">
                  <MapPin className="h-3 w-3" />
                  {formatDistance(distance)}
                </Badge>
              )}
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              {playground.toddlerFriendly && (
                <Badge variant="secondary" className="text-xs">
                  Toddler Friendly
                </Badge>
              )}
              {playground.publiclyAccessible && (
                <Badge variant="secondary" className="text-xs">
                  Publicly Accessible
                </Badge>
              )}
            </div>

            {/* Action button */}
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                window.open(`/playground/${playground.id}`, "_blank");
              }}
              className="w-full"
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </InfoWindow>
  );
}

function UserLocationButton({
  onLocationFound,
}: {
  onLocationFound: (location: UserLocation) => void;
}) {
  const map = useMap();
  const [isLoading, setIsLoading] = useState(false);

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onLocationFound(location);
        if (map) {
          map.panTo(location);
          map.setZoom(15);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error getting user location:", error);
        alert("Unable to get your location. Please enable location services.");
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, [map, onLocationFound]);

  return (
    <Button
      onClick={getUserLocation}
      disabled={isLoading}
      size="sm"
      className="absolute right-3 top-3 z-10"
    >
      <Navigation className="mr-1 h-4 w-4" />
      {isLoading ? "Finding..." : "My Location"}
    </Button>
  );
}

export function GoogleMap({
  selectedPlayground,
  onPlaygroundSelect,
  filters,
  userLocation,
  onUserLocationChange,
  mapCenter,
  onVisiblePlaygroundsChange,
}: MapProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const previousPlaygroundsRef = useRef<(Playground & { distance?: number | null })[]>([]);

  // Calculate the center to use - either from prop or default
  const centerToUse = mapCenter ?? defaultCenter;

  // Filter playgrounds based on the provided filters
  const filteredPlaygrounds = useMemo(() => {
    return playgrounds?.filter((playground) => {
      if (filters.toddlerFriendly !== undefined && playground.toddlerFriendly !== filters.toddlerFriendly) {
        return false;
      }
      if (filters.publiclyAccessible !== undefined && playground.publiclyAccessible !== filters.publiclyAccessible) {
        return false;
      }
      return true;
    }) || [];
  }, [playgrounds, filters]);

  // Filter playgrounds that are visible in the current map bounds
  const visiblePlaygrounds = useMemo(() => {
    return filteredPlaygrounds.filter((playground) => {
      if (!mapBounds) return true; // Show all if bounds not available yet
      return mapBounds.contains(new google.maps.LatLng(playground.latitude, playground.longitude));
    });
  }, [filteredPlaygrounds, mapBounds]);

  // Add distance to visible playgrounds if user location is available
  const playgroundsWithDistance = useMemo(() => {
    return visiblePlaygrounds.map((playground) => {
      const distance = userLocation
        ? calculateDistance(
          userLocation.lat,
          userLocation.lng,
          playground.latitude,
          playground.longitude
        )
        : null;
      return { ...playground, distance };
    }).sort((a, b) => {
      // Sort by distance if available, otherwise by name
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return a.title.localeCompare(b.title);
    });
  }, [visiblePlaygrounds, userLocation]);

  // Notify parent of visible playgrounds changes only when data actually changes
  useEffect(() => {
    if (!onVisiblePlaygroundsChange) return;

    // Check if the playgrounds have actually changed
    const previousPlaygrounds = previousPlaygroundsRef.current;
    const hasChanged =
      previousPlaygrounds.length !== playgroundsWithDistance.length ||
      previousPlaygrounds.some((prev, index) => {
        const current = playgroundsWithDistance[index];
        return !current ||
          prev.id !== current.id ||
          prev.distance !== current.distance;
      });

    if (hasChanged) {
      previousPlaygroundsRef.current = playgroundsWithDistance;
      onVisiblePlaygroundsChange(playgroundsWithDistance);
    }
  }, [playgroundsWithDistance, onVisiblePlaygroundsChange]);

  return (
    <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <div className="relative h-full">
        <Map
          defaultZoom={15}
          defaultCenter={centerToUse}
          mapId="playground-map"
          onClick={() => onPlaygroundSelect(null)}
          onBoundsChanged={(ev) => setMapBounds(ev.map.getBounds() ?? null)}
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          zoomControl={true}
          scaleControl={false}
          cameraControl={false}
        >
          {/* User location marker */}
          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              title="Your Location"
            >
              <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
            </AdvancedMarker>
          )}

          {/* Playground markers */}
          {playgroundsWithDistance.map((playground) => (
            <AdvancedMarker
              key={playground.id}
              position={{
                lat: playground.latitude,
                lng: playground.longitude,
              }}
              title={playground.title}
              onClick={() => onPlaygroundSelect(playground)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-xl">
                <MapPin className="h-5 w-5" />
              </div>
            </AdvancedMarker>
          ))}

          {/* Info window for selected playground */}
          {selectedPlayground && (
            <PlaygroundInfoWindow
              playground={selectedPlayground}
              userLocation={userLocation}
              onClose={() => onPlaygroundSelect(null)}
            />
          )}
        </Map>

        {/* User location button */}
        <UserLocationButton onLocationFound={onUserLocationChange} />
      </div>
    </APIProvider>
  );
}
