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

import { api } from "~/trpc/react";
import { GoogleMap } from "./map";
import PlaygroundDrawer from "./playground-drawer";
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

    const searchParams = useSearchParams();
    const [playgrounds] = api.playground.getAll.useSuspenseQuery();

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

    return (
        <div className="flex flex-col h-screen">
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

            {/* Playground drawer/panel */}
            <PlaygroundDrawer>
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
            </PlaygroundDrawer>
        </div>
    );
} 