"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { List } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { GoogleMap } from "./map";
import PlaygroundList from "./playground-list";
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
    const [isOpen, setOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [actualDrawerHeight, setActualDrawerHeight] = useState(0);
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

        // Also update on interval as fallback
        const interval = setInterval(updateDrawerHeight, 100);

        return () => {
            observer.disconnect();
            clearInterval(interval);
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
            console.log("Geolocation is not supported by this browser.");
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
                console.log("User denied location or error occurred:", error.message);
                // Don't show alert for automatic request, just log it
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

    // Playground list content
    const playgroundContent = (
        <DataErrorBoundary fallback={DataErrorFallback}>
            {/* Filters */}
            <PlaygroundFilters
                filters={filters}
                onFiltersChange={setFilters}
                playgroundCount={filteredPlaygroundCount}
            />

            {/* Playground list */}
            {isInitialLoading ? (
                <PlaygroundListSkeleton count={6} />
            ) : (
                <PlaygroundList
                    filters={filters}
                    userLocation={userLocation}
                    selectedPlayground={selectedPlayground}
                    onPlaygroundSelect={handlePlaygroundSelect}
                    visiblePlaygrounds={visiblePlaygrounds}
                />
            )}
        </DataErrorBoundary>
    );

    // Mobile layout with bottom sheet
    if (isMobile) {
        return (
            <div className="flex flex-col h-screen relative">
                {/* Map container - takes full available height */}
                <div className="absolute inset-0 z-0">
                    <MapErrorBoundary fallback={MapErrorFallback}>
                        <GoogleMap
                            selectedPlayground={selectedPlayground}
                            onPlaygroundSelect={handlePlaygroundSelect}
                            filters={filters}
                            userLocation={userLocation}
                            onUserLocationChange={setUserLocation}
                            mapCenter={mapCenter}
                            onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
                            isMobile={isMobile}
                            drawerHeight={getDrawerHeight()}
                            shouldCenterOnUserLocation={true}
                            onMinimizeDrawer={handleMinimizeDrawer}
                        />
                    </MapErrorBoundary>
                </div>

                {/* Mobile bottom sheet with improved settings */}
                <Sheet
                    ref={ref}
                    isOpen={isOpen}
                    onClose={() => setOpen(false)} // Allow closing
                    snapPoints={[0.85, 0.6, 0.15]} // More intuitive heights
                    initialSnap={2} // Start minimized
                    onSnap={(snapIndex) => {
                        // Keep track of open state based on snap point
                        if (snapIndex === 2) {
                            // At the smallest snap point, consider it "minimized" but still open
                            setOpen(true);
                        }
                    }}
                    disableScrollLocking
                    style={{
                        zIndex: 30, // Lower z-index to avoid conflicts
                    }}
                >
                    <Sheet.Container
                        style={{
                            borderTopLeftRadius: "20px",
                            borderTopRightRadius: "20px",
                            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
                            backgroundColor: "hsl(var(--card))", // Ensure solid background
                        }}
                    >
                        <Sheet.Header className="px-4 py-4 border-b border-border bg-card">
                            <div className="mx-auto h-1 w-10 rounded-full bg-border mb-3" />
                            <div className="text-center">
                                <span className="text-3xl font-display font-bold tracking-tight text-foreground">
                                    {visiblePlaygrounds.length}
                                </span>
                                <span className="block text-xs text-muted-foreground mt-1 font-medium">
                                    {t('playground.playgroundsFound')}
                                </span>
                            </div>
                        </Sheet.Header>
                        <Sheet.Content className="bg-card">
                            <ScrollArea className="h-full px-2">
                                <div className="pb-safe-area-inset-bottom">
                                    {playgroundContent}
                                </div>
                            </ScrollArea>
                        </Sheet.Content>
                    </Sheet.Container>
                </Sheet>

                {/* Floating button to reopen drawer when closed */}
                {!isOpen && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
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
            {/* Left sidebar with playground list */}
            <div className="w-96 border-r border-border overflow-hidden flex-shrink-0 bg-card">
                <ScrollArea className="h-full">
                    {/* Count header */}
                    <div className="px-5 pt-6 pb-4 border-b border-border sticky top-0 bg-card z-10">
                        <span className="text-4xl font-display font-bold tracking-tight text-foreground">
                            {visiblePlaygrounds.length}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-1 font-medium">
                            {t('playground.playgroundsFound')}
                        </span>
                    </div>
                    <div className="p-4">
                        {playgroundContent}
                    </div>
                </ScrollArea>
            </div>

            {/* Map takes the remaining space */}
            <div className="flex-1 relative">
                <MapErrorBoundary fallback={MapErrorFallback}>
                    <GoogleMap
                        selectedPlayground={selectedPlayground}
                        onPlaygroundSelect={handlePlaygroundSelect}
                        filters={filters}
                        userLocation={userLocation}
                        onUserLocationChange={setUserLocation}
                        mapCenter={mapCenter}
                        onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
                        isMobile={false}
                        drawerHeight={getDrawerHeight()}
                        shouldCenterOnUserLocation={true}
                    />
                </MapErrorBoundary>
            </div>
        </div>
    );
} 