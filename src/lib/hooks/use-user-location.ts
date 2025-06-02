"use client";

import { useState, useCallback, useEffect } from "react";
import { type UserLocation, getCurrentLocation } from "~/lib/geo-utils";
import { logger, reportLocationError } from "~/lib/logging";

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
                logger.debug("Initializing user location", {
                    component: "useUserLocation",
                    action: "initialize",
                });

                // First check browser permission status
                if (navigator.permissions) {
                    try {
                        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                        const browserPermission = permissionStatus.state as LocationPermission;

                        logger.debug(`Browser geolocation permission: ${browserPermission}`, {
                            component: "useUserLocation",
                            action: "permission_check",
                            metadata: { permission: browserPermission },
                        });

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
                                    logger.debug("Using cached location", {
                                        component: "useUserLocation",
                                        action: "cache_hit",
                                        metadata: { cacheAge: now - timestamp },
                                    });
                                    return;
                                }
                            }

                            // No valid cache, get fresh location
                            setIsLoading(true);
                            try {
                                const location = await getCurrentLocation();
                                setUserLocation(location);
                                cacheLocation(location, 'granted');
                                logger.info("Successfully obtained user location", {
                                    component: "useUserLocation",
                                    action: "location_obtained",
                                    metadata: {
                                        latitude: location.lat.toFixed(6),
                                        longitude: location.lng.toFixed(6),
                                    },
                                });
                            } catch (err) {
                                const error = err instanceof Error ? err : new Error(String(err));
                                logger.warn("Failed to get current location despite permission", {
                                    component: "useUserLocation",
                                    action: "location_error_with_permission",
                                }, error);
                                reportLocationError(error, "get_current_location_with_permission");
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
                        const error = permissionError instanceof Error ? permissionError : new Error(String(permissionError));
                        logger.warn("Failed to query permission status", {
                            component: "useUserLocation",
                            action: "permission_query_error",
                        }, error);
                        reportLocationError(error, "permission_query");
                        // Fallback to checking cached data
                        loadCachedLocationOnly();
                    }
                } else {
                    logger.warn("Browser doesn't support permissions API", {
                        component: "useUserLocation",
                        action: "no_permissions_api",
                    });
                    // Browser doesn't support permissions API, fallback to cached data
                    loadCachedLocationOnly();
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                logger.error("Failed to initialize location", {
                    component: "useUserLocation",
                    action: "initialization_error",
                }, error);
                reportLocationError(error, "initialization");
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
                        logger.debug("Loaded cached location", {
                            component: "useUserLocation",
                            action: "cache_loaded",
                            metadata: { cacheAge: now - timestamp },
                        });
                    } else {
                        // Clear expired cache
                        clearCachedLocation();
                        logger.debug("Cleared expired location cache", {
                            component: "useUserLocation",
                            action: "cache_expired",
                            metadata: { cacheAge: now - timestamp },
                        });
                    }
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                logger.warn("Failed to load cached location", {
                    component: "useUserLocation",
                    action: "cache_load_error",
                }, error);
                reportLocationError(error, "cache_load");
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
            logger.debug("Cached user location", {
                component: "useUserLocation",
                action: "cache_location",
                metadata: { permission: permissionState },
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.warn("Failed to cache location", {
                component: "useUserLocation",
                action: "cache_error",
            }, error);
            reportLocationError(error, "cache_location");
        }
    };

    const requestLocation = useCallback(() => {
        logger.info("User requested location", {
            component: "useUserLocation",
            action: "request_location",
        });
        
        setIsLoading(true);
        setError(null);

        void (async () => {
            try {
                const location = await getCurrentLocation();
                setUserLocation(location);
                setPermission("granted");
                cacheLocation(location, "granted");
                
                logger.info("Successfully granted location access", {
                    component: "useUserLocation",
                    action: "location_granted",
                    metadata: {
                        latitude: location.lat.toFixed(6),
                        longitude: location.lng.toFixed(6),
                    },
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                const errorMessage = error.message || "Failed to get location";
                setError(errorMessage);
                setPermission("denied");

                // Cache the denied permission to avoid repeated prompts
                sessionStorage.setItem(STORAGE_KEYS.permission, "denied");
                
                logger.warn("Location access denied or failed", {
                    component: "useUserLocation",
                    action: "location_denied",
                    metadata: { errorMessage },
                }, error);
                
                reportLocationError(error, "user_request_location");
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const clearLocation = useCallback(() => {
        logger.info("User cleared location", {
            component: "useUserLocation",
            action: "clear_location",
        });
        
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