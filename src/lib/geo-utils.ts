/**
 * Geographic utility functions for location-based features
 */

import { type Playground } from "~/types";

export interface UserLocation {
    lat: number;
    lng: number;
}

/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 First point latitude
 * @param lng1 First point longitude  
 * @param lat2 Second point latitude
 * @param lng2 Second point longitude
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate distance from user location to a playground
 */
export function getPlaygroundDistance(
    playground: Playground,
    userLocation: UserLocation | null,
): number | undefined {
    if (!userLocation) return undefined;
    return calculateDistance(
        userLocation.lat,
        userLocation.lng,
        playground.latitude,
        playground.longitude,
    );
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
    return distance < 1
        ? `${Math.round(distance * 1000)}m`
        : `${distance.toFixed(1)}km`;
}

/**
 * Get user's current location using the Geolocation API
 */
export function getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                let errorMessage: string;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Please enable location permissions in your browser.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out.";
                        break;
                    default:
                        errorMessage = "An unknown error occurred while retrieving location.";
                        break;
                }
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: false, // Use less battery for this use case
                timeout: 15000, // Increased timeout
                maximumAge: 300000, // 5 minutes cache - same as our session cache
            },
        );
    });
}

/**
 * Sort playgrounds by distance from user location
 */
export function sortPlaygroundsByDistance(
    playgrounds: Playground[],
    userLocation: UserLocation | null,
): (Playground & { distance?: number })[] {
    const playgroundsWithDistance = playgrounds.map((playground) => ({
        ...playground,
        distance: getPlaygroundDistance(playground, userLocation),
    }));

    if (!userLocation) {
        // Sort by creation date if no location
        return playgroundsWithDistance.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    // Sort by distance
    return playgroundsWithDistance.sort((a, b) => {
        if (a.distance === undefined && b.distance === undefined) return 0;
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
    });
} 