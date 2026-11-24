"use client";

/**
 * Main Mapbox GL map component replacing Google Maps.
 * Handles: markers, clustering, user location, info popup, bounds tracking, deep linking.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  useMap,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/mapbox";
import { Navigation } from "lucide-react";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { useSession } from "next-auth/react";

import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { calculateDistance, type UserLocation } from "~/lib/geo-utils";
import { useEquipmentLookup } from "~/lib/hooks/use-equipment-lookup";
import {
  getListBounds,
  getMarkerBounds,
  isWithinBounds,
  playgroundsToGeoJSON,
  type MapBounds,
} from "~/lib/map-utils";
import { compareIcelandic, matchesMapFilters } from "~/lib/search-utils";
import { type MapViewportState } from "~/lib/url-state";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { type PlaygroundFilters } from "./playground-filters";
import { MapMarker } from "./map-marker";
import { MapClusterMarker } from "./map-cluster-marker";
import { MapUserLocation } from "./map-user-location";
import { MapInfoPopup } from "./map-info-popup";
import { MapLegend } from "./map-legend";
import { useT } from "~/lib/i18n";

export interface MapFlyToRequest {
  lat: number;
  lng: number;
  zoom?: number;
  offsetForPopup?: boolean;
  seq: number;
}

interface MapboxMapProps {
  selectedPlayground: Playground | null;
  onPlaygroundSelect: (playground: Playground | null) => void;
  onMarkerSelect?: (playground: Playground) => void;
  filters: PlaygroundFilters;
  userLocation: UserLocation | null;
  onUserLocationChange: (location: UserLocation | null) => void;
  mapCenter?: UserLocation | null;
  initialViewport?: MapViewportState | null;
  onViewportChange?: (viewport: MapViewportState) => void;
  flyToRequest?: MapFlyToRequest | null;
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
          map.flyTo({
            center: [location.lng, location.lat],
            zoom: 15,
            duration: 1500,
          });
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
  onMarkerSelect,
  filters,
  userLocation,
  onUserLocationChange,
  mapCenter,
  initialViewport,
  onViewportChange,
  flyToRequest,
  onVisiblePlaygroundsChange,
  shouldCenterOnUserLocation = false,
  autoRequestLocation = false,
  isMobile = false,
  drawerHeight = 0,
  onMinimizeDrawer,
  onTotalVisibleCountChange,
}: MapboxMapProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const equipmentLookup = useEquipmentLookup();
  // Preview shown while the pointer rests on a pin. A clicked pin takes
  // precedence and stays open until the map is clicked.
  const [hoveredPlayground, setHoveredPlayground] = useState<Playground | null>(
    null,
  );
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deliberately useQuery, not useSuspenseQuery: the map must not block its
  // first paint on a per-user personalisation query. Badges pop in when it
  // resolves.
  const { data: session } = useSession();
  const { data: checkedInPlaygroundIds } =
    api.checkIn.getMyPlaygroundIds.useQuery(undefined, {
      enabled: !!session,
      staleTime: 5 * 60 * 1000,
    });
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
  const [zoom, setZoom] = useState(initialViewport?.zoom ?? DEFAULT_ZOOM);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const previousPlaygroundsRef = useRef<
    (Playground & { distance?: number | null })[]
  >([]);
  const hasAutocentered = useRef(Boolean(initialViewport ?? mapCenter));
  const lastFlyToSeqRef = useRef<number>(0);
  const mapRef = useRef<MapRef>(null);

  // Calculate initial view state
  const initialCenter = initialViewport
    ? { lat: initialViewport.lat, lng: initialViewport.lng }
    : (mapCenter ?? DEFAULT_CENTER);
  const initialZoom = initialViewport?.zoom ?? DEFAULT_ZOOM;

  // How much of the map's bottom edge is hidden behind the mobile sheet
  const occludedBottom = isMobile ? drawerHeight : 0;

  const hasSearchQuery = Boolean(
    filters.search && filters.search.trim().length > 0,
  );

  // Filter playgrounds based on all active filters (search, accessibility, equipment, amenities)
  const filteredPlaygrounds = useMemo(() => {
    return (
      playgrounds?.filter((playground) =>
        matchesMapFilters(playground, filters, equipmentLookup),
      ) || []
    );
  }, [playgrounds, filters, equipmentLookup]);

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

  // Filter playgrounds visible in the current map bounds.
  // When a text search query is active, return all matching playgrounds nationwide so
  // users can find and fly to playgrounds outside the current viewport.
  const visiblePlaygrounds = useMemo(() => {
    if (hasSearchQuery) {
      return filteredPlaygrounds;
    }
    return filteredPlaygrounds.filter((playground) => {
      if (!listBounds) return true;
      return isWithinBounds(playground, listBounds);
    });
  }, [filteredPlaygrounds, listBounds, hasSearchQuery]);

  // Count ALL playgrounds in the current viewport (ignoring filters)
  const totalPlaygroundsInBounds = useMemo(() => {
    if (!playgrounds) return 0;
    if (hasSearchQuery || !listBounds) return playgrounds.length;
    return playgrounds.filter((playground) =>
      isWithinBounds(playground, listBounds),
    ).length;
  }, [playgrounds, listBounds, hasSearchQuery]);

  // Notify parent of total (unfiltered) visible count
  useEffect(() => {
    onTotalVisibleCountChange?.(totalPlaygroundsInBounds);
  }, [totalPlaygroundsInBounds, onTotalVisibleCountChange]);

  // Add distance and sort (distance when available, otherwise Icelandic alphabetical order)
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
        return compareIcelandic(a.title, b.title);
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

  // Auto-center on user location (once, only if no explicit URL viewport was provided)
  useEffect(() => {
    if (
      mapRef.current &&
      userLocation &&
      shouldCenterOnUserLocation &&
      !hasAutocentered.current &&
      !mapCenter &&
      !initialViewport
    ) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        duration: 1500,
      });
      hasAutocentered.current = true;
    }
  }, [userLocation, shouldCenterOnUserLocation, mapCenter, initialViewport]);

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

  // Fly to a requested target (e.g., sidebar card selection or external URL viewport update)
  useEffect(() => {
    if (
      !flyToRequest ||
      flyToRequest.seq === lastFlyToSeqRef.current ||
      !mapRef.current ||
      !isMapLoaded
    ) {
      return;
    }

    lastFlyToSeqRef.current = flyToRequest.seq;
    hasAutocentered.current = true;

    const container = mapRef.current.getContainer();
    const offsetY = flyToRequest.offsetForPopup
      ? isMobile
        ? -occludedBottom / 2
        : container.clientHeight * 0.15
      : 0;
    const targetZoom =
      flyToRequest.zoom ?? Math.max(mapRef.current.getZoom(), DEFAULT_ZOOM);

    mapRef.current.flyTo({
      center: [flyToRequest.lng, flyToRequest.lat],
      zoom: targetZoom,
      offset: [0, offsetY] as [number, number],
      duration: 600,
    });
  }, [flyToRequest, isMapLoaded, isMobile, occludedBottom]);

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

  // Handle map move end — update bounds, zoom, and report viewport for URL syncing
  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      const map = evt.target;
      updateBoundsFromMap(map);
      if (onViewportChange) {
        const center = map.getCenter();
        onViewportChange({
          lat: center.lat,
          lng: center.lng,
          zoom: map.getZoom(),
        });
      }
    },
    [updateBoundsFromMap, onViewportChange],
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
      if (onMarkerSelect) {
        onMarkerSelect(playground);
      } else {
        onPlaygroundSelect(playground);
      }

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
    [onMarkerSelect, onPlaygroundSelect, cancelHoverClose, occludedBottom],
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

  const shouldAutoRequestLocation =
    autoRequestLocation && !initialViewport && !mapCenter;

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
          zoom: initialZoom,
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
          autoRequest={shouldAutoRequestLocation}
        />
      </Map>

      {/* Key to the marker colours — outside <Map> so it never pans with it */}
      <MapLegend />
    </div>
  );
}
