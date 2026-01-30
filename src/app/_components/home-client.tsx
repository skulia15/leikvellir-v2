"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { List, SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { MobileMapListToggle } from "./mobile-map-list-toggle";
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
    const [isOpen, setOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileView, setMobileView] = useState<"map" | "list">("map");
    const [actualDrawerHeight, setActualDrawerHeight] = useState(0);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(1); // Track snap position for conditional UI
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

    // Automatically prompt for user location on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        // Always prompt for location on page load
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLocation(location);
            },
            (error) => {
                // User denied location or error occurred — no action needed
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes cache
            },
        );
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

    // Calculate filtered playground count for the filter component
    const filteredPlaygroundCount = useMemo(() => {
        if (isInitialLoading || !playgrounds) return 0;

        return visiblePlaygrounds.length > 0
            ? visiblePlaygrounds.length
            : playgrounds.filter((playground: Playground) => {
                if (filters.toddlerFriendly !== undefined && playground.toddlerFriendly !== filters.toddlerFriendly) {
                    return false;
                }
                if (filters.publiclyAccessible !== undefined && playground.publiclyAccessible !== filters.publiclyAccessible) {
                    return false;
                }
                return true;
            }).length;
    }, [playgrounds, isInitialLoading, visiblePlaygrounds, filters]);

    // Count active filters for badge display when sheet is minimized
    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(v => v !== undefined).length;
    }, [filters]);

    // Stable callback to prevent infinite loops
    const handleVisiblePlaygroundsChange = useCallback((newVisiblePlaygrounds: (Playground & { distance?: number | null })[]) => {
        setVisiblePlaygrounds(newVisiblePlaygrounds);
    }, []);

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
        if (!isMobile || !isOpen) return 0;
        return actualDrawerHeight;
    }, [isMobile, isOpen, actualDrawerHeight]);

    // Filter pills (shared between desktop sidebar and mobile sheet header)
    const filterContent = (
        <PlaygroundFilters
            filters={filters}
            onFiltersChange={setFilters}
            playgroundCount={filteredPlaygroundCount}
        />
    );

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
            {filterContent}
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

    // Mobile layout — toggle between map view (with bottom sheet) and list view
    if (isMobile) {
        // Full-screen list view
        if (mobileView === "list") {
            return (
                <div className="fixed inset-0 flex flex-col pt-16 bg-card z-20">
                    {seoHeading}
                    {/* List header with count and filters */}
                    <div className="px-4 pt-6 pb-4 border-b border-border bg-card">
                        <div className="flex items-center gap-2.5 mb-3">
                            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                                {visiblePlaygrounds.length}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                                {t('playground.playgroundsFound')}
                            </span>
                        </div>
                        {filterContent}
                    </div>

                    {/* Scrollable list */}
                    <ScrollArea className="flex-1">
                        <div className="px-2 pb-20">
                            {playgroundListContent}
                        </div>
                    </ScrollArea>

                    {/* Floating toggle to switch back to map */}
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
                        <MobileMapListToggle view={mobileView} onViewChange={setMobileView} />
                    </div>
                </div>
            );
        }

        // Map view with bottom sheet
        return (
            <div className="flex flex-col h-screen relative">
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
                            onMinimizeDrawer={handleMinimizeDrawer}
                        />
                    </MapErrorBoundary>
                </div>

                {/* Mobile bottom sheet */}
                <Sheet
                    ref={ref}
                    isOpen={isOpen}
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
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                                        {visiblePlaygrounds.length}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {t('playground.playgroundsFound')}
                                    </span>
                                    {/* Show filter count badge when minimized and filters are active */}
                                    {currentSnapIndex === 2 && activeFilterCount > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium">
                                            <SlidersHorizontal className="h-3 w-3" />
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Show filter pills when sheet is expanded (not minimized) */}
                            {currentSnapIndex !== 2 && (
                                <div className="mt-2">
                                    {filterContent}
                                </div>
                            )}
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

                {/* Floating toggle to switch to list view */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40">
                    <MobileMapListToggle view={mobileView} onViewChange={setMobileView} />
                </div>

                {/* Floating button to reopen drawer when closed */}
                {!isOpen && (
                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30">
                        <Button
                            onClick={() => setOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full px-6 py-3 flex items-center gap-2 text-sm"
                        >
                            <List className="h-4 w-4" />
                            <span className="text-sm font-medium">
                                {visiblePlaygrounds.length} {t('playground.playgroundsFound')}
                            </span>
                        </Button>
                    </div>
                )}
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
                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                                {visiblePlaygrounds.length}
                            </span>
                            <h2 className="text-sm font-semibold text-foreground">
                                {t('playground.playgroundsFound')}
                            </h2>
                        </div>
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
                    />
                </MapErrorBoundary>
            </div>
        </div>
    );
} 