"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
    MapErrorBoundary,
    DataErrorBoundary,
} from "~/components/ui/error-boundary";
import {
    MapErrorFallback,
    DataErrorFallback,
} from "~/components/ui/error-fallbacks";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, type SheetRef } from "react-modal-sheet";
import { useRef } from "react";

import { api } from "~/trpc/react";
import PlaygroundList from "./playground-list";

const MapLoadingFallback = () => (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading map...</div>
    </div>
);

// Dynamic import for Mapbox — no SSR (mapbox-gl uses WebGL which requires a browser)
const MapComponent = dynamic(
    () => import("./mapbox-map").then((mod) => ({ default: mod.MapboxMap })),
    { ssr: false, loading: MapLoadingFallback },
);

import PlaygroundFilters, { type PlaygroundFilters as PlaygroundFiltersType } from "./playground-filters";
import { PlaygroundListSkeleton } from "./playground-card-skeleton";
import { type Playground } from "~/types";
import { type UserLocation } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";

export default function HomeClient() {
    const t = useT();
    const [filters, setFilters] = useState<PlaygroundFiltersType>({});
    const [selectedPlayground, setSelectedPlayground] = useState<Playground | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [mapCenter, setMapCenter] = useState<UserLocation | null>(null);
    const [visiblePlaygrounds, setVisiblePlaygrounds] = useState<(Playground & { distance?: number | null })[]>([]);
    const [totalVisibleCount, setTotalVisibleCount] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [actualDrawerHeight, setActualDrawerHeight] = useState(0);
    // The map reports its viewport once it has loaded; until then a count would
    // be a guess, and "0" reads as "there is nothing here".
    const [hasMapReported, setHasMapReported] = useState(false);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // Track snap position for conditional UI
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const ref = useRef<SheetRef>();

    const searchParams = useSearchParams();
    const [playgrounds] = api.playground.getAll.useSuspenseQuery();
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Observe drawer height changes
    useEffect(() => {
        if (!isMobile) return;

        const updateDrawerHeight = () => {
            const drawerElement = document.querySelector('.react-modal-sheet-container')!;
            if (drawerElement) {
                setActualDrawerHeight((drawerElement as HTMLElement).offsetHeight);
            }
        };

        // Update immediately
        updateDrawerHeight();

        // Set up a ResizeObserver to watch for drawer changes
        const observer = new ResizeObserver(updateDrawerHeight);
        const drawerElement = document.querySelector('.react-modal-sheet-container')!;
        if (drawerElement) {
            observer.observe(drawerElement);
        }

        return () => {
            observer.disconnect();
        };
    }, [isMobile]);

    // Handle initial loading state
    useEffect(() => {
        if (playgrounds) {
            // Small delay to show skeleton briefly even if data loads very quickly
            const timer = setTimeout(() => {
                setIsInitialLoading(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [playgrounds]);

    // Check if mobile
    // TODO: use tailwind to style for mobile instead, if possible. 
    // TODO: Move mobile size breakpoint to const or tailwind config.
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Auto-center desktop map if geolocation permission already granted
    useEffect(() => {
        if (!navigator.permissions) return;
        void navigator.permissions.query({ name: "geolocation" }).then((status) => {
            if (status.state === "granted") setLocationPermissionGranted(true);
        });
    }, []);

    // Handle URL parameters for deep linking from playground detail page
    useEffect(() => {
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const playgroundId = searchParams.get('playground');

        if (lat && lng) {
            const newCenter = {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
            };
            setMapCenter(newCenter);
        }

        if (playgroundId && playgrounds) {
            const playground = playgrounds.find(p => p.id === parseInt(playgroundId));
            if (playground) {
                setSelectedPlayground(playground);
            }
        }
    }, [searchParams, playgrounds]);

    // Stable callback to prevent infinite loops
    const handleVisiblePlaygroundsChange = useCallback((newVisiblePlaygrounds: (Playground & { distance?: number | null })[]) => {
        setVisiblePlaygrounds(newVisiblePlaygrounds);
        setHasMapReported(true);
    }, []);

    // Header count: the number of results actually in view, or a placeholder
    // while the map is still establishing its bounds.
    const isCountReady = !isInitialLoading && hasMapReported;
    const resultCountHeader = (
        <div className="flex items-center gap-2.5" aria-live="polite" aria-atomic="true">
            {isCountReady ? (
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                    {visiblePlaygrounds.length}
                </span>
            ) : (
                <span className="h-5 w-8 rounded-full bg-muted animate-pulse" aria-hidden="true" />
            )}
            <span className="text-sm font-semibold text-foreground">
                {t('playground.playgroundsInView')}
            </span>
        </div>
    );

    // Handle playground selection and snap drawer to minimized state on mobile
    const handlePlaygroundSelect = useCallback((playground: Playground | null) => {
        setSelectedPlayground(playground);

        // If on mobile and a playground is selected, minimize the drawer
        if (isMobile && playground && ref.current) {
            ref.current.snapTo(2); // Snap to the smallest state (index 2 = 0.15)
        }
    }, [isMobile]);

    // Handle minimizing drawer (for mobile)
    const handleMinimizeDrawer = useCallback(() => {
        if (isMobile && ref.current) {
            ref.current.snapTo(2); // Snap to the smallest state (index 2 = 0.15)
        }
    }, [isMobile]);

    // Calculate drawer height based on actual DOM element instead of state
    const getDrawerHeight = useCallback(() => {
        if (!isMobile) return 0;
        return actualDrawerHeight;
    }, [isMobile, actualDrawerHeight]);

    // Playground list content (without filters — filters are placed separately)
    const playgroundListContent = (
        <DataErrorBoundary fallback={DataErrorFallback}>
            {isInitialLoading ? (
                <PlaygroundListSkeleton count={6} />
            ) : (
                <PlaygroundList
                    filters={filters}
                    userLocation={userLocation}
                    selectedPlayground={selectedPlayground}
                    onPlaygroundSelect={handlePlaygroundSelect}
                    visiblePlaygrounds={visiblePlaygrounds}
                    totalVisibleCount={totalVisibleCount}
                    onClearFilters={() => setFilters({})}
                />
            )}
        </DataErrorBoundary>
    );

    // Combined content for desktop sidebar (filters + list together)
    const desktopSidebarContent = (
        <DataErrorBoundary fallback={DataErrorFallback}>
            <PlaygroundFilters
                filters={filters}
                onFiltersChange={setFilters}
            />
            {isInitialLoading ? (
                <PlaygroundListSkeleton count={6} />
            ) : (
                <PlaygroundList
                    filters={filters}
                    userLocation={userLocation}
                    selectedPlayground={selectedPlayground}
                    onPlaygroundSelect={handlePlaygroundSelect}
                    visiblePlaygrounds={visiblePlaygrounds}
                    totalVisibleCount={totalVisibleCount}
                    onClearFilters={() => setFilters({})}
                />
            )}
        </DataErrorBoundary>
    );

    // Visually-hidden H1 for SEO — the home page is map-first with no visible heading
    const seoHeading = (
        <h1 className="sr-only">{t('playground.seoHomeHeading')}</h1>
    );

    // Mobile layout — map with a bottom sheet over it
    if (isMobile) {
        return (
            <div className="relative flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
                {seoHeading}
                {/* Map container - takes full available height */}
                <div className="absolute inset-0 z-0">
                    <MapErrorBoundary fallback={MapErrorFallback}>
                        <MapComponent
                            selectedPlayground={selectedPlayground}
                            onPlaygroundSelect={handlePlaygroundSelect}
                            filters={filters}
                            userLocation={userLocation}
                            onUserLocationChange={setUserLocation}
                            mapCenter={mapCenter}
                            onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
                            onTotalVisibleCountChange={setTotalVisibleCount}
                            isMobile={isMobile}
                            drawerHeight={getDrawerHeight()}
                            shouldCenterOnUserLocation={true}
                            autoRequestLocation={true}
                            onMinimizeDrawer={handleMinimizeDrawer}
                        />
                    </MapErrorBoundary>
                </div>

                {/* Mobile bottom sheet */}
                <Sheet
                    ref={ref}
                    isOpen={true}
                    onClose={() => {
                        // Snap to minimized (15%) instead of fully closing,
                        // so a fast swipe down collapses rather than hides the sheet
                        if (ref.current) {
                            ref.current.snapTo(2);
                        }
                    }}
                    snapPoints={[0.85, 0.6, 0.15]}
                    initialSnap={1} // Start at 60% — show content immediately
                    onSnap={(snapIndex) => {
                        setCurrentSnapIndex(snapIndex);
                    }}
                    disableScrollLocking
                    style={{
                        zIndex: 30,
                    }}
                >
                    <Sheet.Container
                        style={{
                            borderTopLeftRadius: "20px",
                            borderTopRightRadius: "20px",
                            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
                            backgroundColor: "hsl(var(--card))",
                        }}
                    >
                        <Sheet.Header className="px-4 pt-3 pb-2 border-b border-border bg-card">
                            <div className="mx-auto h-1 w-10 rounded-full bg-border mb-2" />
                            {resultCountHeader}
                            <div className="mt-2">
                                <PlaygroundFilters
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                />
                            </div>
                        </Sheet.Header>
                        <Sheet.Content className="bg-card">
                            <ScrollArea className="h-full px-2">
                                <div className="pb-safe-area-inset-bottom">
                                    {playgroundListContent}
                                </div>
                            </ScrollArea>
                        </Sheet.Content>
                    </Sheet.Container>
                </Sheet>
            </div>
        );
    }

    // Desktop layout with left sidebar
    return (
        <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
            {seoHeading}
            {/* Left sidebar with playground list */}
            <div className="w-[420px] shadow-lg overflow-hidden flex-shrink-0 bg-card relative z-10">
                <ScrollArea className="h-full">
                    {/* Sidebar header with count badge */}
                    <div className="px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                        {resultCountHeader}
                    </div>
                    <div className="px-4 pb-4">
                        {desktopSidebarContent}
                    </div>
                </ScrollArea>
            </div>

            {/* Map takes the remaining space */}
            <div className="flex-1 relative">
                <MapErrorBoundary fallback={MapErrorFallback}>
                    <MapComponent
                        selectedPlayground={selectedPlayground}
                        onPlaygroundSelect={handlePlaygroundSelect}
                        filters={filters}
                        userLocation={userLocation}
                        onUserLocationChange={setUserLocation}
                        mapCenter={mapCenter}
                        onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
                        onTotalVisibleCountChange={setTotalVisibleCount}
                        isMobile={false}
                        drawerHeight={getDrawerHeight()}
                        shouldCenterOnUserLocation={true}
                        autoRequestLocation={locationPermissionGranted}
                    />
                </MapErrorBoundary>
            </div>
        </div>
    );
} 