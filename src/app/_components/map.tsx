"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin, Navigation } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { calculateDistance, type UserLocation } from "~/lib/geo-utils";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { PlaygroundInfoWindow } from "./info-window";
import { type PlaygroundFilters } from "./playground-filters";
import { useT } from "~/lib/i18n";

interface MapProps {
  selectedPlayground: Playground | null;
  onPlaygroundSelect: (playground: Playground | null) => void;
  filters: PlaygroundFilters;
  userLocation: UserLocation | null;
  onUserLocationChange: (location: UserLocation | null) => void;
  mapCenter?: UserLocation | null;
  onVisiblePlaygroundsChange?: (playgrounds: (Playground & { distance?: number | null })[]) => void;
  isMobile?: boolean;
  drawerHeight?: number;
}

const defaultCenter = {
  lat: 64.071, // Hafnarfjörður, Iceland
  lng: -21.954,
};



function UserLocationButton({
  onLocationFound,
}: {
  onLocationFound: (location: UserLocation) => void;
}) {
  const map = useMap();
  const [isLoading, setIsLoading] = useState(false);
  const t = useT();

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert(t('map.geolocationNotSupported'));
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
        alert(t('map.locationAccessDenied'));
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, [map, onLocationFound, t]);

  return (
    <Button
      onClick={getUserLocation}
      disabled={isLoading}
      size="sm"
      className="absolute right-3 top-3 z-10"
    >
      <Navigation className="mr-1 h-4 w-4" />
      {isLoading ? t('map.findingLocation') : t('map.myLocation')}
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
  isMobile: _isMobile = false,
  drawerHeight: _drawerHeight = 0,
}: MapProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const previousPlaygroundsRef = useRef<(Playground & { distance?: number | null })[]>([]);
  const t = useT();

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
          gestureHandling="greedy"
        >
          {/* User location marker */}
          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              title={t('map.yourLocation')}
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
