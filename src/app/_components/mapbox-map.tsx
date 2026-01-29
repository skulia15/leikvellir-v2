"use client";

/**
 * Main Mapbox GL map component replacing Google Maps.
 * Handles: markers, clustering, user location, info popup, bounds tracking, deep linking.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { useMap, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { Navigation } from "lucide-react";
import useSupercluster from "use-supercluster";

import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { calculateDistance, type UserLocation } from "~/lib/geo-utils";
import { isWithinBounds, playgroundsToGeoJSON, type MapBounds } from "~/lib/map-utils";
import { isSchoolGroundAccessible } from "~/lib/school-hours";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { type PlaygroundFilters } from "./playground-filters";
import { MapMarker } from "./map-marker";
import { MapClusterMarker } from "./map-cluster-marker";
import { MapUserLocation } from "./map-user-location";
import { MapInfoPopup } from "./map-info-popup";
import { useT } from "~/lib/i18n";

interface MapboxMapProps {
  selectedPlayground: Playground | null;
  onPlaygroundSelect: (playground: Playground | null) => void;
  filters: PlaygroundFilters;
  userLocation: UserLocation | null;
  onUserLocationChange: (location: UserLocation | null) => void;
  mapCenter?: UserLocation | null;
  onVisiblePlaygroundsChange?: (
    playgrounds: (Playground & { distance?: number | null })[],
  ) => void;
  isMobile?: boolean;
  drawerHeight?: number;
  shouldCenterOnUserLocation?: boolean;
  onMinimizeDrawer?: () => void;
  onTotalVisibleCountChange?: (count: number) => void;
}

const DEFAULT_CENTER = {
  lng: -21.954,
  lat: 64.071, // Hafnarfjörður, Iceland
};

const DEFAULT_ZOOM = 15;

/**
 * User location button — prompts for geolocation and centers the map
 */
function UserLocationButton({
  onLocationFound,
  onMinimizeDrawer,
}: {
  onLocationFound: (location: UserLocation) => void;
  onMinimizeDrawer?: () => void;
}) {
  const { current: map } = useMap();
  const [isLoading, setIsLoading] = useState(false);
  const t = useT();

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert(t("map.geolocationNotSupported"));
      return;
    }

    setIsLoading(true);
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
          map.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 1500 });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error getting user location:", error);
        alert(t("map.locationAccessDenied"));
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
      {isLoading ? t("map.findingLocation") : t("map.myLocation")}
    </Button>
  );
}

export function MapboxMap({
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
  onTotalVisibleCountChange,
}: MapboxMapProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const previousPlaygroundsRef = useRef<
    (Playground & { distance?: number | null })[]
  >([]);
  const hasAutocentered = useRef(false);
  const mapRef = useRef<MapRef>(null);

  // Calculate initial center
  const initialCenter = mapCenter ?? DEFAULT_CENTER;

  // Filter playgrounds based on the provided filters
  const filteredPlaygrounds = useMemo(() => {
    return (
      playgrounds?.filter((playground) => {
        if (
          filters.toddlerFriendly !== undefined &&
          playground.toddlerFriendly !== filters.toddlerFriendly
        ) {
          return false;
        }
        if (
          filters.publiclyAccessible !== undefined &&
          playground.publiclyAccessible !== filters.publiclyAccessible
        ) {
          return false;
        }
        if (filters.accessibleNow !== undefined && filters.accessibleNow) {
          const isAccessible =
            playground.publiclyAccessible ||
            (playground.isSchoolGround &&
              isSchoolGroundAccessible(playground.isSchoolGround));
          if (!isAccessible) {
            return false;
          }
        }
        return true;
      }) || []
    );
  }, [playgrounds, filters]);

  // Convert to GeoJSON for supercluster
  const geoPoints = useMemo(
    () => playgroundsToGeoJSON(filteredPlaygrounds),
    [filteredPlaygrounds],
  );

  // Supercluster for marker clustering
  const { clusters, supercluster } = useSupercluster({
    points: geoPoints.features,
    bounds: mapBounds ?? undefined,
    zoom,
    options: {
      radius: 60,
      maxZoom: 16,
    },
  });

  // Filter playgrounds visible in the current map bounds
  const visiblePlaygrounds = useMemo(() => {
    return filteredPlaygrounds.filter((playground) => {
      if (!mapBounds) return true;
      return isWithinBounds(playground, mapBounds);
    });
  }, [filteredPlaygrounds, mapBounds]);

  // Count ALL playgrounds in the current viewport (ignoring filters)
  const totalPlaygroundsInBounds = useMemo(() => {
    if (!playgrounds) return 0;
    if (!mapBounds) return playgrounds.length;
    return playgrounds.filter((playground) => isWithinBounds(playground, mapBounds)).length;
  }, [playgrounds, mapBounds]);

  // Notify parent of total (unfiltered) visible count
  useEffect(() => {
    onTotalVisibleCountChange?.(totalPlaygroundsInBounds);
  }, [totalPlaygroundsInBounds, onTotalVisibleCountChange]);

  // Add distance and sort
  const playgroundsWithDistance = useMemo(() => {
    return visiblePlaygrounds
      .map((playground) => {
        const distance = userLocation
          ? calculateDistance(
              userLocation.lat,
              userLocation.lng,
              playground.latitude,
              playground.longitude,
            )
          : null;
        return { ...playground, distance };
      })
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return a.title.localeCompare(b.title);
      });
  }, [visiblePlaygrounds, userLocation]);

  // Notify parent of visible playgrounds changes
  useEffect(() => {
    if (!onVisiblePlaygroundsChange) return;

    const previousPlaygrounds = previousPlaygroundsRef.current;
    const hasChanged =
      previousPlaygrounds.length !== playgroundsWithDistance.length ||
      previousPlaygrounds.some((prev, index) => {
        const current = playgroundsWithDistance[index];
        return (
          !current || prev.id !== current.id || prev.distance !== current.distance
        );
      });

    if (hasChanged) {
      previousPlaygroundsRef.current = playgroundsWithDistance;
      onVisiblePlaygroundsChange(playgroundsWithDistance);
    }
  }, [playgroundsWithDistance, onVisiblePlaygroundsChange]);

  // Auto-center on user location (once)
  useEffect(() => {
    if (
      mapRef.current &&
      userLocation &&
      shouldCenterOnUserLocation &&
      !hasAutocentered.current &&
      !mapCenter
    ) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        duration: 1500,
      });
      hasAutocentered.current = true;
    }
  }, [userLocation, shouldCenterOnUserLocation, mapCenter]);

  // Prevent auto-centering when explicit center is set
  useEffect(() => {
    if (mapCenter) {
      hasAutocentered.current = true;
    }
  }, [mapCenter]);

  // Handle map move end — update bounds and zoom
  const handleMoveEnd = useCallback((evt: ViewStateChangeEvent) => {
    const map = evt.target;
    const bounds = map.getBounds();
    if (bounds) {
      setMapBounds([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    }
    setZoom(map.getZoom());
  }, []);

  // Handle cluster click — zoom into the cluster
  const handleClusterClick = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      if (!supercluster || !mapRef.current) return;
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(clusterId),
        20,
      );
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: expansionZoom,
        duration: 500,
      });
    },
    [supercluster],
  );

  // Map container style for mobile drawer offset
  const mapContainerStyle = useMemo(() => {
    if (isMobile && drawerHeight > 0) {
      return {
        height: `calc(100vh - 150px)`,
        transition: "height 0.3s ease-in-out",
      };
    }
    return { height: "100%" };
  }, [isMobile, drawerHeight]);

  return (
    <div className="relative" style={mapContainerStyle}>
      <Map
        ref={mapRef}
        mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: initialCenter.lng,
          latitude: initialCenter.lat,
          zoom: DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onMoveEnd={handleMoveEnd}
        onClick={() => onPlaygroundSelect(null)}
        dragRotate={false}
        touchPitch={false}
        attributionControl={true}
        reuseMaps
      >
        {/* User location marker */}
        {userLocation && <MapUserLocation location={userLocation} />}

        {/* Clustered playground markers */}
        {clusters.map((cluster) => {
          const lng = cluster.geometry.coordinates[0] as number;
          const lat = cluster.geometry.coordinates[1] as number;
          const properties = cluster.properties as Record<string, unknown> | null;
          if (!properties) return null;

          // It's a cluster
          if (properties.cluster) {
            const clusterId = properties.cluster_id as number;
            const pointCount = properties.point_count as number;
            return (
              <MapClusterMarker
                key={`cluster-${clusterId}`}
                longitude={lng}
                latitude={lat}
                pointCount={pointCount}
                totalPoints={filteredPlaygrounds.length}
                onClick={() => handleClusterClick(clusterId, lng, lat)}
              />
            );
          }

          // It's an individual playground marker
          const playground = properties.playground as Playground;
          return (
            <MapMarker
              key={`marker-${playground.id}`}
              playground={playground}
              isSelected={selectedPlayground?.id === playground.id}
              onClick={onPlaygroundSelect}
            />
          );
        })}

        {/* Info popup for selected playground */}
        {selectedPlayground && (
          <MapInfoPopup
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
  );
}
