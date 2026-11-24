"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { SlidersHorizontal } from "lucide-react";
import {
  MapErrorBoundary,
  DataErrorBoundary,
} from "~/components/ui/error-boundary";
import {
  MapErrorFallback,
  DataErrorFallback,
} from "~/components/ui/error-fallbacks";
import { ScrollArea } from "~/components/ui/scroll-area";

import { api } from "~/trpc/react";
import PlaygroundList from "./playground-list";
import { type MapFlyToRequest } from "./mapbox-map";
import type { MobileBottomSheetHandle } from "./mobile-bottom-sheet";

function MapLoadingFallback() {
  const t = useT();
  return (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
      <div className="text-muted-foreground text-sm">{t("map.loadingMap")}</div>
    </div>
  );
}

// Dynamic import for Mapbox — no SSR (mapbox-gl uses WebGL which requires a browser)
const MapComponent = dynamic(
  () => import("./mapbox-map").then((mod) => ({ default: mod.MapboxMap })),
  { ssr: false, loading: MapLoadingFallback },
);

// Dynamic import for mobile bottom sheet — keeps react-modal-sheet and framer-motion out of desktop bundles
const MobileBottomSheet = dynamic(() => import("./mobile-bottom-sheet"), {
  ssr: false,
});

import PlaygroundFilters, {
  type PlaygroundFilters as PlaygroundFiltersType,
} from "./playground-filters";
import { type Playground } from "~/types";
import { type UserLocation } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";
import { hasActiveMapFilters } from "~/lib/search-utils";
import {
  type MapViewportState,
  parseHomeMapParams,
  recordInAppNavigation,
  replaceUrlSearchParams,
  serializeHomeMapParams,
} from "~/lib/url-state";

export default function HomeClient() {
  const t = useT();
  const searchParams = useSearchParams();
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();

  const initialUrlState = useMemo(() => {
    return parseHomeMapParams(searchParams);
    // Compute initial URL state snapshot once on mount; external URL changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialSelectedPlayground = useMemo(() => {
    if (initialUrlState.selectedPlaygroundId === null || !playgrounds) {
      return null;
    }
    return (
      playgrounds.find((p) => p.id === initialUrlState.selectedPlaygroundId) ??
      null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialViewport = useMemo<MapViewportState | null>(() => {
    if (initialUrlState.viewport) {
      return initialUrlState.viewport;
    }
    if (initialSelectedPlayground) {
      return {
        lat: initialSelectedPlayground.latitude,
        lng: initialSelectedPlayground.longitude,
        zoom: 15,
      };
    }
    return null;
  }, [initialUrlState.viewport, initialSelectedPlayground]);

  const [filters, setFilters] = useState<PlaygroundFiltersType>(
    initialUrlState.filters,
  );
  const [selectedPlayground, setSelectedPlayground] =
    useState<Playground | null>(initialSelectedPlayground);
  const [viewport, setViewport] = useState<MapViewportState | null>(
    initialViewport,
  );
  const [flyToRequest, setFlyToRequest] = useState<MapFlyToRequest | null>(
    null,
  );
  const [scrollToSelectedSeq, setScrollToSelectedSeq] = useState<number>(
    initialSelectedPlayground ? 1 : 0,
  );
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  // undefined until the map reports its viewport, so the list falls back to
  // all playgrounds and SSR HTML contains real playground links.
  const [visiblePlaygrounds, setVisiblePlaygrounds] = useState<
    (Playground & { distance?: number | null })[] | undefined
  >(undefined);
  const [totalVisibleCount, setTotalVisibleCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [actualDrawerHeight, setActualDrawerHeight] = useState(0);
  // The map reports its viewport once it has loaded; until then a count would
  // be a guess, and "0" reads as "there is nothing here".
  const [hasMapReported, setHasMapReported] = useState(false);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // Track snap position for conditional UI
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);
  const sheetHandleRef = useRef<MobileBottomSheetHandle | null>(null);
  const flyToSeqRef = useRef(0);
  const lastWrittenQueryRef = useRef<string | null>(null);

  // Record in-app navigation so playground detail Back button returns to "/"
  useEffect(() => {
    recordInAppNavigation("/");
  }, []);

  // Measure how much of the map the sheet is actually covering.
  //
  // react-modal-sheet keeps its container at the height of the tallest snap
  // point and slides it with a transform, so offsetHeight is a constant — it
  // reported ~85% of the screen at every snap, including the collapsed one.
  // The covered strip has to be derived from the rect's top edge instead.
  //
  // A transform fires neither resize nor scroll events, so the sheet is
  // followed with rAF until it stops moving and only the settled value is
  // committed: one render per snap rather than one per animation frame.
  // currentSnapIndex in the deps is what restarts that poll.
  useEffect(() => {
    if (!isMobile) {
      setActualDrawerHeight(0);
      return;
    }

    let frame = 0;
    let previous = -1;
    let stableFrames = 0;
    let observedElement: HTMLElement | null = null;

    const schedule = () => {
      previous = -1;
      stableFrames = 0;
      if (!frame) frame = requestAnimationFrame(poll);
    };

    // The sheet's own height still tracks the viewport (mobile browser chrome
    // collapsing, orientation change), and neither shows up as a snap.
    const observer = new ResizeObserver(schedule);

    const measure = () => {
      const drawerElement = document.querySelector<HTMLElement>(
        ".react-modal-sheet-container",
      );
      if (!drawerElement) return null;
      if (drawerElement !== observedElement) {
        if (observedElement) observer.unobserve(observedElement);
        observer.observe(drawerElement);
        observedElement = drawerElement;
      }
      const rect = drawerElement.getBoundingClientRect();
      return Math.max(
        0,
        Math.min(window.innerHeight - rect.top, window.innerHeight),
      );
    };

    const poll = () => {
      const covered = measure();
      const settled = covered !== null && Math.abs(covered - previous) < 1;
      stableFrames = settled ? stableFrames + 1 : 0;
      if (covered !== null) previous = covered;

      // Three quiet frames means the snap animation is over.
      if (covered !== null && stableFrames >= 3) {
        frame = 0;
        setActualDrawerHeight(covered);
        return;
      }
      frame = requestAnimationFrame(poll);
    };

    schedule();
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [isMobile, currentSnapIndex]);

  // Match Tailwind's `md` breakpoint. Only drives mobile-only behaviour (the
  // sheet, drawer offset, auto-locate); layout itself is responsive CSS, so the
  // map never remounts when this flips after hydration.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handleChange(mediaQuery);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Auto-center desktop map if geolocation permission already granted
  useEffect(() => {
    if (!navigator.permissions) return;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") setLocationPermissionGranted(true);
      });
  }, []);

  // Sync active filters, selected playground, and map viewport to URL via replaceState
  useEffect(() => {
    const params = serializeHomeMapParams({
      filters,
      selectedPlaygroundId: selectedPlayground?.id ?? null,
      viewport,
    });
    const nextQuery = params.toString();
    lastWrittenQueryRef.current = nextQuery;
    replaceUrlSearchParams(params);
  }, [filters, selectedPlayground, viewport]);

  // React to external URL navigation (e.g. Back/Forward or "View on Map" deep link)
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (lastWrittenQueryRef.current === searchParamsString) {
      return;
    }

    const parsed = parseHomeMapParams(searchParams);
    setFilters(parsed.filters);

    const matchedPlayground =
      parsed.selectedPlaygroundId !== null && playgrounds
        ? (playgrounds.find((p) => p.id === parsed.selectedPlaygroundId) ??
          null)
        : null;
    setSelectedPlayground(matchedPlayground);

    if (matchedPlayground) {
      setScrollToSelectedSeq((seq) => seq + 1);
    }

    const targetViewport =
      parsed.viewport ??
      (matchedPlayground
        ? {
            lat: matchedPlayground.latitude,
            lng: matchedPlayground.longitude,
            zoom: 15,
          }
        : null);

    if (targetViewport) {
      setViewport(targetViewport);
      flyToSeqRef.current += 1;
      setFlyToRequest({
        lat: targetViewport.lat,
        lng: targetViewport.lng,
        zoom: targetViewport.zoom,
        offsetForPopup: Boolean(matchedPlayground),
        seq: flyToSeqRef.current,
      });
    }
  }, [searchParams, searchParamsString, playgrounds]);

  // Stable callback to prevent infinite loops
  const handleVisiblePlaygroundsChange = useCallback(
    (newVisiblePlaygrounds: (Playground & { distance?: number | null })[]) => {
      setVisiblePlaygrounds(newVisiblePlaygrounds);
      setHasMapReported(true);
    },
    [],
  );

  // Header count: the number of results actually in view, or a placeholder
  // while the map is still establishing its bounds.
  const isCountReady = hasMapReported;
  const resultCountHeader = (
    <div
      className="flex items-center gap-2.5"
      aria-live="polite"
      aria-atomic="true"
    >
      {isCountReady ? (
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums">
          {visiblePlaygrounds?.length ?? 0}
        </span>
      ) : (
        <span
          className="h-5 w-8 rounded-full bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}
      <span className="text-sm font-semibold text-foreground">
        {t("playground.playgroundsInView")}
      </span>
    </div>
  );

  // Handle viewport changes from map pan/zoom
  const handleViewportChange = useCallback((nextViewport: MapViewportState) => {
    setViewport(nextViewport);
  }, []);

  // Handle playground selection from sidebar / drawer list -> fly map to pin
  const handleListPlaygroundSelect = useCallback(
    (playground: Playground | null) => {
      setSelectedPlayground(playground);

      if (playground) {
        flyToSeqRef.current += 1;
        setFlyToRequest({
          lat: playground.latitude,
          lng: playground.longitude,
          offsetForPopup: true,
          seq: flyToSeqRef.current,
        });

        // If on mobile and a playground is selected, minimize the drawer
        if (isMobile && sheetHandleRef.current) {
          sheetHandleRef.current.snapTo(2); // Snap to the smallest state (index 2 = 0.15)
        }
      }
    },
    [isMobile],
  );

  // Handle map marker click -> select playground & scroll sidebar card into view
  const handleMapMarkerSelect = useCallback((playground: Playground) => {
    setSelectedPlayground(playground);
    setScrollToSelectedSeq((seq) => seq + 1);
  }, []);

  // Handle map background click / popup close
  const handleMapPlaygroundSelect = useCallback(
    (playground: Playground | null) => {
      setSelectedPlayground(playground);
    },
    [],
  );

  // Handle minimizing drawer (for mobile)
  const handleMinimizeDrawer = useCallback(() => {
    if (isMobile && sheetHandleRef.current) {
      sheetHandleRef.current.snapTo(2); // Snap to the smallest state (index 2 = 0.15)
    }
  }, [isMobile]);

  // Expand mobile drawer from peek when user focuses search or taps filter badge
  const handleExpandDrawer = useCallback(() => {
    if (isMobile && currentSnapIndex === 2 && sheetHandleRef.current) {
      sheetHandleRef.current.snapTo(1);
    }
  }, [isMobile, currentSnapIndex]);

  // Calculate drawer height based on actual DOM element instead of state
  const getDrawerHeight = useCallback(() => {
    if (!isMobile) return 0;
    return actualDrawerHeight;
  }, [isMobile, actualDrawerHeight]);

  // Playground list content (without filters — filters are placed separately)
  const playgroundListContent = (
    <DataErrorBoundary fallback={DataErrorFallback}>
      <PlaygroundList
        filters={filters}
        userLocation={userLocation}
        selectedPlayground={selectedPlayground}
        onPlaygroundSelect={handleListPlaygroundSelect}
        visiblePlaygrounds={visiblePlaygrounds}
        totalVisibleCount={totalVisibleCount}
        onClearFilters={() => setFilters({})}
        scrollToSelectedSeq={scrollToSelectedSeq}
      />
    </DataErrorBoundary>
  );

  // Combined content for desktop sidebar (filters + list together)
  const desktopSidebarContent = (
    <DataErrorBoundary fallback={DataErrorFallback}>
      <PlaygroundFilters filters={filters} onFiltersChange={setFilters} />
      <PlaygroundList
        filters={filters}
        userLocation={userLocation}
        selectedPlayground={selectedPlayground}
        onPlaygroundSelect={handleListPlaygroundSelect}
        visiblePlaygrounds={visiblePlaygrounds}
        totalVisibleCount={totalVisibleCount}
        onClearFilters={() => setFilters({})}
        scrollToSelectedSeq={scrollToSelectedSeq}
      />
    </DataErrorBoundary>
  );

  // Visually-hidden H1 for SEO — the home page is map-first with no visible heading
  const seoHeading = (
    <h1 className="sr-only">{t("playground.seoHomeHeading")}</h1>
  );

  const filtersActive = hasActiveMapFilters(filters);

  const isMobilePeek = currentSnapIndex === 2;

  // One layout for both breakpoints. Rendering separate mobile/desktop trees
  // keyed off a post-hydration `isMobile` flip unmounted and remounted the
  // whole WebGL map on every mobile load.
  return (
    <div className="relative flex h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {seoHeading}

      {/* Desktop sidebar — hidden on mobile by CSS from the first paint */}
      <aside className="hidden md:block w-[420px] shadow-lg overflow-hidden flex-shrink-0 bg-card relative z-10">
        {!isMobile && (
          <ScrollArea className="h-full">
            {/* Sidebar header with count badge */}
            <div className="px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              {resultCountHeader}
            </div>
            <div className="px-4 pb-4">{desktopSidebarContent}</div>
          </ScrollArea>
        )}
      </aside>

      {/* Single persistent map */}
      <div className="relative flex-1 h-full min-w-0 z-0">
        <MapErrorBoundary fallback={MapErrorFallback}>
          <MapComponent
            selectedPlayground={selectedPlayground}
            onPlaygroundSelect={handleMapPlaygroundSelect}
            onMarkerSelect={handleMapMarkerSelect}
            filters={filters}
            userLocation={userLocation}
            onUserLocationChange={setUserLocation}
            initialViewport={initialViewport}
            onViewportChange={handleViewportChange}
            flyToRequest={flyToRequest}
            onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
            onTotalVisibleCountChange={setTotalVisibleCount}
            isMobile={isMobile}
            drawerHeight={getDrawerHeight()}
            shouldCenterOnUserLocation={true}
            autoRequestLocation={isMobile || locationPermissionGranted}
            onMinimizeDrawer={handleMinimizeDrawer}
          />
        </MapErrorBoundary>
      </div>

      {/* Mobile bottom sheet over the map */}
      {isMobile && (
        <MobileBottomSheet
          sheetHandleRef={sheetHandleRef}
          isOpen={true}
          onSnap={setCurrentSnapIndex}
          header={
            <>
              <div className="mx-auto h-1 w-10 rounded-full bg-border mb-2" />
              <div className="flex items-center justify-between gap-2">
                {resultCountHeader}
                {isMobilePeek && (
                  <button
                    type="button"
                    onClick={handleExpandDrawer}
                    className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filtersActive
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                    {t("forms.filters")}
                  </button>
                )}
              </div>
              <div className="mt-2">
                <PlaygroundFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  compact={isMobilePeek}
                  onSearchFocus={handleExpandDrawer}
                />
              </div>
            </>
          }
        >
          {playgroundListContent}
        </MobileBottomSheet>
      )}
    </div>
  );
}
