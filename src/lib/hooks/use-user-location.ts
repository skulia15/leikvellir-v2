"use client";

import { useState, useCallback, useEffect } from "react";
import { type UserLocation, getCurrentLocation } from "~/lib/geo-utils";

type LocationPermission = "granted" | "denied" | "prompt";

interface UseUserLocationReturn {
    userLocation: UserLocation | null;
    isLoading: boolean;
    permission: LocationPermission;
    error: string | null;
    requestLocation: () => void;
    clearLocation: () => void;
}

const STORAGE_KEYS = {
    userLocation: "leikvellir-user-location",
    permission: "leikvellir-location-permission",
    timestamp: "leikvellir-location-timestamp",
} as const;

// Location cache expires after 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export function useUserLocation(): UseUserLocationReturn {
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [permission, setPermission] = useState<LocationPermission>("prompt");
    const [error, setError] = useState<string | null>(null);

    // Check browser permission and load cached location on mount
    useEffect(() => {
        const initializeLocation = async () => {
            try {
                // First check browser permission status
                if (navigator.permissions) {
                    try {
                        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                        const browserPermission = permissionStatus.state as LocationPermission;

                        // If permission is granted, try to get current location
                        if (browserPermission === 'granted') {
                            setPermission('granted');

                            // Check if we have valid cached location first
                            const cachedLocation = sessionStorage.getItem(STORAGE_KEYS.userLocation);
                            const cachedTimestamp = sessionStorage.getItem(STORAGE_KEYS.timestamp);

                            if (cachedLocation && cachedTimestamp) {
                                const timestamp = parseInt(cachedTimestamp, 10);
                                const now = Date.now();

                                // If cache is still valid, use it
                                if (now - timestamp < CACHE_DURATION) {
                                    const location = JSON.parse(cachedLocation) as UserLocation;
                                    setUserLocation(location);
                                    return;
                                }
                            }

                            // No valid cache, get fresh location
                            setIsLoading(true);
                            try {
                                const location = await getCurrentLocation();
                                setUserLocation(location);
                                cacheLocation(location, 'granted');
                            } catch (err) {
                                console.warn("Failed to get current location despite permission:", err);
                            } finally {
                                setIsLoading(false);
                            }
                        } else {
                            setPermission(browserPermission);

                            // Still load cached permission if available
                            const cachedPermission = sessionStorage.getItem(STORAGE_KEYS.permission);
                            if (cachedPermission && cachedPermission === 'denied') {
                                setPermission('denied');
                            }
                        }
                    } catch (permissionError) {
                        console.warn("Failed to query permission status:", permissionError);
                        // Fallback to checking cached data
                        loadCachedLocationOnly();
                    }
                } else {
                    // Browser doesn't support permissions API, fallback to cached data
                    loadCachedLocationOnly();
                }
            } catch (err) {
                console.warn("Failed to initialize location:", err);
                loadCachedLocationOnly();
            }
        };

        const loadCachedLocationOnly = () => {
            try {
                const cachedLocation = sessionStorage.getItem(STORAGE_KEYS.userLocation);
                const cachedPermission = sessionStorage.getItem(STORAGE_KEYS.permission);
                const cachedTimestamp = sessionStorage.getItem(STORAGE_KEYS.timestamp);

                if (cachedPermission) {
                    setPermission(cachedPermission as LocationPermission);
                }

                if (cachedLocation && cachedTimestamp) {
                    const timestamp = parseInt(cachedTimestamp, 10);
                    const now = Date.now();

                    // Check if cache is still valid
                    if (now - timestamp < CACHE_DURATION) {
                        const location = JSON.parse(cachedLocation) as UserLocation;
                        setUserLocation(location);
                    } else {
                        // Clear expired cache
                        clearCachedLocation();
                    }
                }
            } catch (err) {
                console.warn("Failed to load cached location:", err);
                clearCachedLocation();
            }
        };

        void initializeLocation();
    }, []);

    const clearCachedLocation = () => {
        sessionStorage.removeItem(STORAGE_KEYS.userLocation);
        sessionStorage.removeItem(STORAGE_KEYS.permission);
        sessionStorage.removeItem(STORAGE_KEYS.timestamp);
    };

    const cacheLocation = (location: UserLocation, permissionState: LocationPermission) => {
        try {
            sessionStorage.setItem(STORAGE_KEYS.userLocation, JSON.stringify(location));
            sessionStorage.setItem(STORAGE_KEYS.permission, permissionState);
            sessionStorage.setItem(STORAGE_KEYS.timestamp, Date.now().toString());
        } catch (err) {
            console.warn("Failed to cache location:", err);
        }
    };

    const requestLocation = useCallback(() => {
        setIsLoading(true);
        setError(null);

        void (async () => {
            try {
                const location = await getCurrentLocation();
                setUserLocation(location);
                setPermission("granted");
                cacheLocation(location, "granted");
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Failed to get location";
                setError(errorMessage);
                setPermission("denied");

                // Cache the denied permission to avoid repeated prompts
                sessionStorage.setItem(STORAGE_KEYS.permission, "denied");
                console.error("Error getting location:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const clearLocation = useCallback(() => {
        setUserLocation(null);
        setPermission("prompt");
        setError(null);
        clearCachedLocation();
    }, []);

    return {
        userLocation,
        isLoading,
        permission,
        error,
        requestLocation,
        clearLocation,
    };
} 