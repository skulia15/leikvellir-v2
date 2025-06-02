"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
import { type Playground } from "~/types";
import { type UserLocation } from "~/lib/geo-utils";

export default function HomeClient() {
    const [filters, setFilters] = useState<PlaygroundFiltersType>({});
    const [selectedPlayground, setSelectedPlayground] = useState<Playground | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [mapCenter, setMapCenter] = useState<UserLocation | null>(null);
    const [visiblePlaygrounds, setVisiblePlaygrounds] = useState<(Playground & { distance?: number | null })[]>([]);
    const [isOpen, setOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const ref = useRef<SheetRef>();

    const searchParams = useSearchParams();
    const [playgrounds] = api.playground.getAll.useSuspenseQuery();

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

    // Automatically request user location on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by this browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setUserLocation(location);
                console.log("User location automatically detected:", location);
            },
            (error) => {
                console.log("Could not get user location automatically:", error.message);
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
    const filteredPlaygroundCount = visiblePlaygrounds.length > 0
        ? visiblePlaygrounds.length
        : playgrounds?.filter((playground: Playground) => {
            if (filters.toddlerFriendly !== undefined && playground.toddlerFriendly !== filters.toddlerFriendly) {
                return false;
            }
            if (filters.publiclyAccessible !== undefined && playground.publiclyAccessible !== filters.publiclyAccessible) {
                return false;
            }
            return true;
        }).length || 0;

    // Stable callback to prevent infinite loops
    const handleVisiblePlaygroundsChange = useCallback((newVisiblePlaygrounds: (Playground & { distance?: number | null })[]) => {
        setVisiblePlaygrounds(newVisiblePlaygrounds);
    }, []);

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
            <PlaygroundList
                filters={filters}
                userLocation={userLocation}
                selectedPlayground={selectedPlayground}
                onPlaygroundSelect={setSelectedPlayground}
                visiblePlaygrounds={visiblePlaygrounds}
            />
        </DataErrorBoundary>
    );

    // Mobile layout with bottom sheet
    if (isMobile) {
        return (
            <div className="flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
                {/* Map takes the remaining space */}
                <div className="flex-1 relative">
                    <MapErrorBoundary fallback={MapErrorFallback}>
                        <GoogleMap
                            selectedPlayground={selectedPlayground}
                            onPlaygroundSelect={setSelectedPlayground}
                            filters={filters}
                            userLocation={userLocation}
                            onUserLocationChange={setUserLocation}
                            mapCenter={mapCenter}
                            onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
                        />
                    </MapErrorBoundary>
                </div>

                {/* Mobile bottom sheet */}
                <Sheet
                    ref={ref}
                    isOpen={isOpen}
                    onClose={() => setOpen(true)} // Keep it always open
                    snapPoints={[0.9, 0.5, 0.2]}
                    initialSnap={2}
                    onSnap={(snapIndex) =>
                        console.log("> Current snap point index:", snapIndex)
                    }
                    disableScrollLocking
                >
                    <Sheet.Container>
                        <Sheet.Header className="px-4 py-2">
                            <div className="mx-auto h-1 w-12 rounded-full bg-muted-foreground/30" />
                        </Sheet.Header>
                        <Sheet.Content>
                            <ScrollArea className="h-full overflow-y-auto">
                                {playgroundContent}
                            </ScrollArea>
                        </Sheet.Content>
                    </Sheet.Container>
                </Sheet>
            </div>
        );
    }

    // Desktop layout with left sidebar
    return (
        <div className="flex" style={{ height: 'calc(100vh - 12rem)' }}>
            {/* Left sidebar with playground list */}
            <div className="w-96 bg-background border-r overflow-hidden flex-shrink-0">
                <ScrollArea className="h-full">
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
                        onPlaygroundSelect={setSelectedPlayground}
                        filters={filters}
                        userLocation={userLocation}
                        onUserLocationChange={setUserLocation}
                        mapCenter={mapCenter}
                        onVisiblePlaygroundsChange={handleVisiblePlaygroundsChange}
                    />
                </MapErrorBoundary>
            </div>
        </div>
    );
} 