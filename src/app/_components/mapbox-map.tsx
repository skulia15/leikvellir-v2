"use client";

/**
 * Main Mapbox GL map component replacing Google Maps.
 * Handles: markers, clustering, user location, info popup, bounds tracking, deep linking.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { useMap, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { useSession } from "next-auth/react";

import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { calculateDistance, type UserLocation } from "~/lib/geo-utils";
import {
  getListBounds,
  getMarkerBounds,
  isWithinBounds,
  playgroundsToGeoJSON,
  type MapBounds,
} from "~/lib/map-utils";
import { isSchoolGroundAccessible } from "~/lib/school-hours";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { type PlaygroundFilters } from "./playground-filters";
import { MapMarker } from "./map-marker";
import { MapClusterMarker } from "./map-cluster-marker";
import { MapUserLocation } from "./map-user-location";
import { MapInfoPopup } from "./map-info-popup";
import { MapLegend } from "./map-legend";
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
  autoRequestLocation?: boolean;
  onMinimizeDrawer?: () => void;
  onTotalVisibleCountChange?: (count: number) => void;
}

const DEFAULT_CENTER = {
  lng: -21.954,
  lat: 64.071, // Hafnarfjörður, Iceland
};

const DEFAULT_ZOOM = 15;

/** Grace period for the pointer to travel from a pin to its hover preview. */
const HOVER_CLOSE_DELAY_MS = 150;

/**
 * Bounds are recomputed on every map settle and every sheet snap, but usually
 * come back identical. Comparing them keeps a fresh array from re-running the
 * clusterer and re-rendering every marker for no visible change.
 */
function boundsEqual(a: MapBounds | null, b: MapBounds | null): boolean {
  if (!a || !b) return a === b;
  return a.every((value, index) => value === b[index]);
}

/**
 * User location button — prompts for geolocation and centers the map
 */
function UserLocationButton({
  onLocationFound,
  onMinimizeDrawer,
  autoRequest = false,
}: {
  onLocationFound: (location: UserLocation) => void;
  onMinimizeDrawer?: () => void;
  autoRequest?: boolean;
}) {
  const mapRef = useMap();
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoRequested = useRef(false);
  const t = useT();

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t("map.geolocationNotSupported"));
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
        // Read .current at call time to avoid stale closure
        const map = mapRef.current;
        if (map) {
          map.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 1500 });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error getting user location:", error);
        toast.error(t("map.locationAccessDenied"));
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, [mapRef, onLocationFound, onMinimizeDrawer, t]);

  useEffect(() => {
    if (autoRequest && !hasAutoRequested.current) {
      hasAutoRequested.current = true;
      getUserLocation();
    }
  }, [autoRequest, getUserLocation]);

  return (
    <Button
      onClick={getUserLocation}
      disabled={isLoading}
      className="absolute right-3 top-3 z-10 min-h-11"
    >
      <Navigation className="mr-1 h-4 w-4" aria-hidden="true" />
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
  autoRequestLocation = false,
  isMobile = false,
  drawerHeight = 0,
  onMinimizeDrawer,
  onTotalVisibleCountChange,
}: MapboxMapProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  // Preview shown while the pointer rests on a pin. A clicked pin takes
  // precedence and stays open until the map is clicked.
  const [hoveredPlayground, setHoveredPlayground] = useState<Playground | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deliberately useQuery, not useSuspenseQuery: the map must not block its
  // first paint on a per-user personalisation query. Badges pop in when it
  // resolves.
  const { data: session } = useSession();
  const { data: checkedInPlaygroundIds } = api.checkIn.getMyPlaygroundIds.useQuery(
    undefined,
    { enabled: !!session, staleTime: 5 * 60 * 1000 },
  );
  const checkedInIds = useMemo(
    () => new Set(checkedInPlaygroundIds ?? []),
    [checkedInPlaygroundIds],
  );
  // Two different rectangles, deliberately kept apart:
  //  - markerBounds is the FULL map canvas (plus a margin). Every pin the user
  //    can see on the map has to be rendered, including the ones behind the
  //    sheet, because the sheet is an overlay the user can drag away.
  //  - listBounds is only the part of the canvas the sheet is not covering.
  //    The result list and its count read this one, so the list never offers a
  //    playground that is hidden underneath the sheet.
  // Feeding listBounds to the clusterer culls pins that are plainly visible on
  // the map, so the two must never be merged back together.
  const [markerBounds, setMarkerBounds] = useState<MapBounds | null>(null);
  const [listBounds, setListBounds] = useState<MapBounds | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const previousPlaygroundsRef = useRef<
    (Playground & { distance?: number | null })[]
  >([]);
  const hasAutocentered = useRef(false);
  const mapRef = useRef<MapRef>(null);

  // Calculate initial center
  const initialCenter = mapCenter ?? DEFAULT_CENTER;

  // How much of the map's bottom edge is hidden behind the mobile sheet
  const occludedBottom = isMobile ? drawerHeight : 0;

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
          // School grounds: check school hours (regardless of publiclyAccessible flag)
          // Non-school grounds: check publiclyAccessible flag
          const isAccessible = playground.isSchoolGround
            ? isSchoolGroundAccessible(playground.isSchoolGround)
            : playground.publiclyAccessible;
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
    bounds: markerBounds ?? undefined,
    zoom,
    options: {
      radius: 60,
      maxZoom: 16,
    },
  });

  // Filter playgrounds visible in the current map bounds
  const visiblePlaygrounds = useMemo(() => {
    return filteredPlaygrounds.filter((playground) => {
      if (!listBounds) return true;
      return isWithinBounds(playground, listBounds);
    });
  }, [filteredPlaygrounds, listBounds]);

  // Count ALL playgrounds in the current viewport (ignoring filters)
  const totalPlaygroundsInBounds = useMemo(() => {
    if (!playgrounds) return 0;
    if (!listBounds) return playgrounds.length;
    return playgrounds.filter((playground) => isWithinBounds(playground, listBounds)).length;
  }, [playgrounds, listBounds]);

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

  // Fly to explicit map center when provided (e.g., from URL deep link)
  useEffect(() => {
    if (mapCenter && mapRef.current && isMapLoaded) {
      mapRef.current.flyTo({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: 15,
        duration: 1500,
      });
      hasAutocentered.current = true;
    }
  }, [mapCenter, isMapLoaded]);

  // Re-read the part of the map the sheet leaves visible. Only the list cares,
  // so this does not touch markerBounds: re-running the clusterer would
  // re-render every pin on the map for a change the map itself never saw.
  const updateListBoundsFromMap = useCallback(
    (map: mapboxgl.Map) => {
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const unproject = (point: [number, number]) => map.unproject(point);
      const next = getListBounds(unproject, width, height, occludedBottom);
      setListBounds((prev) => (boundsEqual(prev, next) ? prev : next));
    },
    [occludedBottom],
  );

  // Extract both rectangles from a map instance: see the comment on the state
  // above for why the markers and the list read different ones.
  const updateBoundsFromMap = useCallback(
    (map: mapboxgl.Map) => {
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width > 0 && height > 0) {
        const unproject = (point: [number, number]) => map.unproject(point);
        const nextMarkerBounds = getMarkerBounds(unproject, width, height);
        setMarkerBounds((prev) =>
          boundsEqual(prev, nextMarkerBounds) ? prev : nextMarkerBounds,
        );
        updateListBoundsFromMap(map);
      }

      setZoom(map.getZoom());
    },
    [updateListBoundsFromMap],
  );

  // Re-read the visible rectangle when the sheet is dragged: the viewport did
  // not move, but the part of it the user can see did.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map && isMapLoaded) {
      updateListBoundsFromMap(map);
    }
  }, [isMapLoaded, updateListBoundsFromMap]);

  // Handle map load — capture initial bounds so markers render immediately
  const handleLoad = useCallback(
    (evt: { target: mapboxgl.Map }) => {
      updateBoundsFromMap(evt.target);
      setIsMapLoaded(true);
    },
    [updateBoundsFromMap],
  );

  // Handle map move end — update bounds and zoom
  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      updateBoundsFromMap(evt.target);
    },
    [updateBoundsFromMap],
  );

  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);

  const handleMarkerHoverStart = useCallback(
    (playground: Playground) => {
      cancelHoverClose();
      setHoveredPlayground(playground);
    },
    [cancelHoverClose],
  );

  // Closing is delayed so the pointer can cross the gap between the pin and the
  // popup — which the popup cancels on enter — without the preview vanishing.
  const handleMarkerHoverEnd = useCallback(() => {
    cancelHoverClose();
    hoverCloseTimer.current = setTimeout(
      () => setHoveredPlayground(null),
      HOVER_CLOSE_DELAY_MS,
    );
  }, [cancelHoverClose]);

  useEffect(() => cancelHoverClose, [cancelHoverClose]);

  const previewPlayground = selectedPlayground ?? hoveredPlayground;
  const isHoverPreview = !selectedPlayground && Boolean(hoveredPlayground);

  // Handle marker click — select playground and pan map so the popup is fully visible
  const handleMarkerClick = useCallback(
    (playground: Playground) => {
      // The click takes over from the hover preview, which must not linger and
      // reappear when the selection is later cleared.
      cancelHoverClose();
      setHoveredPlayground(null);
      onPlaygroundSelect(playground);

      if (!mapRef.current) return;

      // Shift the target up by half the occluded strip so the selected marker
      // lands in the middle of what the user can actually see.
      const offsetY = -occludedBottom / 2;

      mapRef.current.flyTo({
        center: [playground.longitude, playground.latitude],
        offset: [0, offsetY] as [number, number],
        duration: 400,
      });
    },
    [onPlaygroundSelect, cancelHoverClose, occludedBottom],
  );

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

  return (
    // The map always fills its container. The sheet overlays it rather than
    // resizing it, so nothing animates layout height on every snap.
    <div className="relative h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: initialCenter.lng,
          latitude: initialCenter.lat,
          zoom: DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/skulipardus/cmkzwe4f2005s01skane25k5g"
        onLoad={handleLoad}
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
              hasCheckedIn={checkedInIds.has(playground.id)}
              onClick={handleMarkerClick}
              onHoverStart={handleMarkerHoverStart}
              onHoverEnd={handleMarkerHoverEnd}
            />
          );
        })}

        {/* Preview popup: a clicked pin wins and stays until the map is
            clicked; otherwise the hovered pin previews and closes on leave. */}
        {previewPlayground && (
          <MapInfoPopup
            key={previewPlayground.id}
            playground={previewPlayground}
            userLocation={userLocation}
            onClose={() => {
              cancelHoverClose();
              setHoveredPlayground(null);
              onPlaygroundSelect(null);
            }}
            onPointerEnter={isHoverPreview ? cancelHoverClose : undefined}
            onPointerLeave={isHoverPreview ? handleMarkerHoverEnd : undefined}
          />
        )}

        {/* User location button — must be inside <Map> to access useMap() context */}
        <UserLocationButton
          onLocationFound={onUserLocationChange}
          onMinimizeDrawer={onMinimizeDrawer}
          autoRequest={autoRequestLocation}
        />
      </Map>

      {/* Key to the marker colours — outside <Map> so it never pans with it */}
      <MapLegend />
    </div>
  );
}
