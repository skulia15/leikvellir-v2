/**
 * Geographic utility functions for location-based features
 */

import { type Playground } from "~/types";
import { defaultLocale, getBcp47Locale } from "./i18n/config";
import { type Locale } from "./i18n/types";

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
export function formatDistance(distance: number, locale: Locale = defaultLocale): string {
    const tag = getBcp47Locale(locale);
    if (distance < 1) {
        return new Intl.NumberFormat(tag, { style: "unit", unit: "meter", unitDisplay: "short", maximumFractionDigits: 0 }).format(Math.round(distance * 1000));
    }
    return new Intl.NumberFormat(tag, { style: "unit", unit: "kilometer", unitDisplay: "short", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(distance);
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
/**
 * Why a check-in needs its own position getter.
 *
 * getCurrentLocation() above is tuned for distance sorting: it accepts a fix
 * up to five minutes old and skips the high-accuracy radio to save battery.
 * Both are wrong for a check-in — a five-minute-old fix can be from another
 * neighbourhood, which is exactly what the distance check exists to catch —
 * and it discards coords.accuracy, which the server needs to size the radius.
 */
export interface FreshPosition {
    lat: number;
    lng: number;
    /** Accuracy radius in metres (95% confidence), from the Geolocation API. */
    accuracy: number;
}

export type GeoErrorKind = "denied" | "timeout" | "unavailable" | "unsupported";

/**
 * Carries a machine-readable kind rather than the English strings
 * getCurrentLocation() rejects with, so callers can localise the message.
 */
export class GeoError extends Error {
    constructor(public readonly kind: GeoErrorKind) {
        super(kind);
        this.name = "GeoError";
    }
}

/**
 * Get a NEW GPS fix for check-in. Never writes to the sessionStorage location
 * cache used by useUserLocation — a check-in position is single-use.
 */
export function getFreshPosition(timeoutMs = 20000): Promise<FreshPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new GeoError("unsupported"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) =>
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                }),
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    reject(new GeoError("denied"));
                } else if (error.code === error.TIMEOUT) {
                    reject(new GeoError("timeout"));
                } else {
                    reject(new GeoError("unavailable"));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: timeoutMs,
                maximumAge: 0, // Refuse cached positions.
            },
        );
    });
}
