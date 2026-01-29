/**
 * Map utility functions for Mapbox integration, bounds helpers, and walking time estimation.
 */

import { type Playground } from "~/types";
import { calculateDistance, type UserLocation } from "./geo-utils";

/** Mapbox-style bounds tuple: [west, south, east, north] (lng/lat order) */
export type MapBounds = [number, number, number, number];

/**
 * Check if a playground is within the given map bounds
 */
export function isWithinBounds(
  playground: Playground,
  bounds: MapBounds,
): boolean {
  const [west, south, east, north] = bounds;
  return (
    playground.longitude >= west &&
    playground.longitude <= east &&
    playground.latitude >= south &&
    playground.latitude <= north
  );
}

/**
 * Estimate walking time from distance in kilometers.
 * Uses average walking speed of 5 km/h.
 */
export function estimateWalkingTime(distanceKm: number): {
  minutes: number;
  text: string;
} {
  const minutes = Math.ceil((distanceKm / 5) * 60);

  if (minutes < 1) {
    return { minutes: 0, text: "< 1 min" };
  }
  if (minutes < 60) {
    return { minutes, text: `${minutes} min` };
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return { minutes, text: `${hours} hr` };
  }
  return { minutes, text: `${hours} hr ${remainingMinutes} min` };
}

/**
 * Estimate walking time from user location to a playground
 */
export function getWalkingTimeToPlayground(
  playground: Playground,
  userLocation: UserLocation | null,
): { minutes: number; text: string } | null {
  if (!userLocation) return null;

  const distanceKm = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    playground.latitude,
    playground.longitude,
  );

  return estimateWalkingTime(distanceKm);
}

/**
 * Convert playground data to GeoJSON FeatureCollection for use with supercluster
 */
export function playgroundsToGeoJSON(
  playgrounds: Playground[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: playgrounds.map((playground) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [playground.longitude, playground.latitude],
      },
      properties: {
        id: playground.id,
        playground,
      },
    })),
  };
}
