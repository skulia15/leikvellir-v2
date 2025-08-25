"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin, Navigation, GraduationCap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { calculateDistance, type UserLocation } from "~/lib/geo-utils";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { PlaygroundInfoWindow } from "./info-window";
import { type PlaygroundFilters } from "./playground-filters";
import { getPlaygroundMarkerColor, isSchoolGroundAccessible } from "~/lib/school-hours";
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
  shouldCenterOnUserLocation?: boolean; // New prop to control auto-centering
  onMinimizeDrawer?: () => void; // New prop to minimize drawer
}

const defaultCenter = {
  lat: 64.071, // Hafnarfjörður, Iceland
  lng: -21.954,
};

// User location marker component with ping animation
function UserLocationMarker() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ping animation rings */}
      <div className="absolute h-8 w-8 rounded-full bg-blue-500 animate-ping opacity-15"
        style={{ animationDuration: '4s', animationDelay: '0s' }} />
      <div className="absolute h-6 w-6 rounded-full bg-blue-500 animate-ping opacity-25"
        style={{ animationDuration: '4s', animationDelay: '1s' }} />

      {/* Main location dot */}
      <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg relative z-10" />
    </div>
  );
}

function UserLocationButton({
  onLocationFound,
  onMinimizeDrawer,
}: {
  onLocationFound: (location: UserLocation) => void;
  onMinimizeDrawer?: () => void;
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

    // Minimize the drawer when starting to find location
    if (onMinimizeDrawer) {
      onMinimizeDrawer();
    }

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
  }, [map, onLocationFound, onMinimizeDrawer, t]);

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

function MapCenterController({
  userLocation,
  mapCenter,
  shouldCenterOnUserLocation,
}: {
  userLocation: UserLocation | null;
  mapCenter?: UserLocation | null;
  shouldCenterOnUserLocation?: boolean;
}) {
  const map = useMap();
  const hasAutocentered = useRef(false);

  // Auto-center on user location when it becomes available (only once)
  useEffect(() => {
    if (
      map &&
      userLocation &&
      shouldCenterOnUserLocation &&
      !hasAutocentered.current &&
      !mapCenter // Only if no explicit map center is set
    ) {
      map.panTo(userLocation);
      map.setZoom(15);
      hasAutocentered.current = true;
    }
  }, [map, userLocation, shouldCenterOnUserLocation, mapCenter]);

  // Reset the auto-center flag when mapCenter changes (for deep linking)
  useEffect(() => {
    if (mapCenter) {
      hasAutocentered.current = true; // Prevent auto-centering when explicit center is set
    }
  }, [mapCenter]);

  return null;
}

// function MapPaddingController({
//   isMobile,
//   drawerHeight,
// }: {
//   isMobile?: boolean;
//   drawerHeight?: number;
// }) {
//   const map = useMap();

//   useEffect(() => {
//     if (!map) return;

//     const padding = {
//       top: 0,
//       right: 0,
//       bottom: isMobile && drawerHeight ? drawerHeight + 20 : 0,
//       left: 0,
//     };

//     map.set('padding', padding);
//   }, [map, isMobile, drawerHeight]);

//   return null;
// }

export function GoogleMap({
  selectedPlayground,
  onPlaygroundSelect,
  filters,
  userLocation,
  onUserLocationChange,
  mapCenter,
  onVisiblePlaygroundsChange,
  shouldCenterOnUserLocation = false,
  isMobile = false,
  drawerHeight = 0,
  onMinimizeDrawer,
}: MapProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const previousPlaygroundsRef = useRef<(Playground & { distance?: number | null })[]>([]);
  const t = useT();

  // Calculate the center to use - either from prop or default
  const centerToUse = mapCenter ?? defaultCenter;


  // Calculate map container height based on mobile drawer
  const mapContainerStyle = useMemo(() => {
    if (isMobile && drawerHeight > 0) {
      // The drawer might be reporting its full potential height (743px)
      // but we only need to account for the visible portion that covers the map
      // Let's try a smaller fixed offset that accounts for the visible drawer header
      const effectiveOffset = 150; // Fixed offset - adjust based on actual drawer visible height
      return {
        height: `calc(100vh - ${effectiveOffset}px)`,
        transition: 'height 0.3s ease-in-out',
      };
    }
    return {
      height: '100%'
    };
  }, [isMobile, drawerHeight]);


  // Filter playgrounds based on the provided filters
  const filteredPlaygrounds = useMemo(() => {
    return playgrounds?.filter((playground) => {
      if (filters.toddlerFriendly !== undefined && playground.toddlerFriendly !== filters.toddlerFriendly) {
        return false;
      }
      if (filters.publiclyAccessible !== undefined && playground.publiclyAccessible !== filters.publiclyAccessible) {
        return false;
      }
      // Handle accessibleNow filter - includes publicly accessible + school grounds during accessible hours
      if (filters.accessibleNow !== undefined && filters.accessibleNow) {
        const isAccessible = playground.publiclyAccessible ||
          (playground.isSchoolGround && isSchoolGroundAccessible(playground.isSchoolGround));
        if (!isAccessible) {
          return false;
        }
      }
      // Handle equipment filters
      if (filters.hasFootballField && !playground.playgroundEquipment?.some(pe => {
        const isName = pe.equipment.name?.is?.toLowerCase() || '';
        const enName = pe.equipment.name?.en?.toLowerCase() || '';
        return isName.includes('fótbolt') || enName.includes('football') || enName.includes('soccer');
      })) {
        return false;
      }
      if (filters.hasJumpingPillow && !playground.playgroundEquipment?.some(pe => {
        const isName = pe.equipment.name?.is?.toLowerCase() || '';
        const enName = pe.equipment.name?.en?.toLowerCase() || '';
        return isName.includes('ærslabelgur') || enName.includes('jumping pillow');
      })) {
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
      <div className="relative" style={mapContainerStyle}>
        <Map
          defaultZoom={15}
          defaultCenter={centerToUse}
          mapId="2f47ad60ce60e620"
          onClick={() => onPlaygroundSelect(null)}
          onBoundsChanged={(ev) => setMapBounds(ev.map.getBounds() ?? null)}
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          zoomControl={true}
          scaleControl={false}
          cameraControl={false}
          gestureHandling="greedy"
          headingInteractionEnabled={false}
          clickableIcons={false}
          draggingCursor="grabbing"
        >
          {/* Map controllers */}
          <MapCenterController
            userLocation={userLocation}
            mapCenter={mapCenter}
            shouldCenterOnUserLocation={shouldCenterOnUserLocation}
          />


          {/* User location marker */}
          {userLocation && (
            <AdvancedMarker
              position={userLocation}
              title={t('map.yourLocation')}
            >
              <UserLocationMarker />
            </AdvancedMarker>
          )}

          {/* Playground markers */}
          {playgroundsWithDistance.map((playground) => {
            const markerColor = getPlaygroundMarkerColor(playground.isSchoolGround, playground.schoolType);
            const isSchoolGround = playground.isSchoolGround;
            const isAccessible = !isSchoolGround || isSchoolGroundAccessible(isSchoolGround);

            return (
              <AdvancedMarker
                key={playground.id}
                position={{
                  lat: playground.latitude,
                  lng: playground.longitude,
                }}
                title={playground.title}
                onClick={() => onPlaygroundSelect(playground)}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-xl ${isSchoolGround
                    ? isAccessible
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                    }`}
                  style={{ backgroundColor: markerColor }}
                >
                  {isSchoolGround ? (
                    <GraduationCap className="h-5 w-5" />
                  ) : (
                    <MapPin className="h-5 w-5" />
                  )}
                </div>
              </AdvancedMarker>
            );
          })}

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
        <UserLocationButton
          onLocationFound={onUserLocationChange}
          onMinimizeDrawer={onMinimizeDrawer}
        />
      </div>
    </APIProvider>
  );
}
