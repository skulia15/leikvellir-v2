/**
 * Map utility functions for Mapbox integration, bounds helpers, and walking time estimation.
 */

import { type Playground } from "~/types";
import { calculateDistance, type UserLocation } from "./geo-utils";
import { defaultLocale, getBcp47Locale } from "./i18n/config";
import { type Locale } from "./i18n/types";

/** Mapbox-style bounds tuple: [west, south, east, north] (lng/lat order) */
export type MapBounds = [number, number, number, number];

/**
 * Fraction of the viewport added to each edge of the marker bounds. Marker
 * bounds are only recomputed when the map settles, so this margin is what keeps
 * pins rendered while a drag is still in progress.
 */
export const MARKER_BOUNDS_PADDING = 0.5;

/**
 * The floor on the unoccluded rectangle, as a fraction of the map's height.
 * A sheet dragged to its tallest snap point leaves almost no map showing, and a
 * result list that then reports zero playgrounds reads as "there is nothing
 * here" rather than "you covered the map".
 */
const MIN_UNOCCLUDED_FRACTION = 0.25;

/** Screen-space -> lng/lat, i.e. mapbox-gl's `map.unproject`. */
export type Unproject = (point: [number, number]) => { lng: number; lat: number };

/**
 * Unproject a screen-space rectangle into [west, south, east, north].
 * All four corners are considered so the result stays correct if the map is
 * ever rotated.
 */
export function boundsFromScreenRect(
  unproject: Unproject,
  left: number,
  top: number,
  right: number,
  bottom: number,
): MapBounds {
  const corners = [
    unproject([left, top]),
    unproject([right, top]),
    unproject([right, bottom]),
    unproject([left, bottom]),
  ];
  const lngs = corners.map((c) => c.lng);
  const lats = corners.map((c) => c.lat);
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
}

/**
 * Bounds for the markers drawn on the map: the whole canvas plus a margin.
 *
 * Deliberately ignores the bottom sheet. The sheet is an overlay the user can
 * drag away at any time, so every pin on the canvas has to exist — clustering
 * against the unoccluded rectangle instead makes pins vanish from map area the
 * user can plainly see.
 */
export function getMarkerBounds(
  unproject: Unproject,
  width: number,
  height: number,
): MapBounds {
  const padX = width * MARKER_BOUNDS_PADDING;
  const padY = height * MARKER_BOUNDS_PADDING;
  return boundsFromScreenRect(
    unproject,
    -padX,
    -padY,
    width + padX,
    height + padY,
  );
}

/**
 * Bounds for the result list and its count: only the part of the canvas the
 * bottom sheet is not covering, so the list never offers a playground that is
 * hidden underneath the sheet.
 */
export function getListBounds(
  unproject: Unproject,
  width: number,
  height: number,
  occludedBottom: number,
): MapBounds {
  const visibleBottom = Math.max(
    height * MIN_UNOCCLUDED_FRACTION,
    height - Math.max(0, occludedBottom),
  );
  return boundsFromScreenRect(unproject, 0, 0, width, visibleBottom);
}

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
export function estimateWalkingTime(
  distanceKm: number,
  locale: Locale = defaultLocale,
): {
  minutes: number;
  text: string;
} {
  const minutes = Math.ceil((distanceKm / 5) * 60);
  const tag = getBcp47Locale(locale);
  const fmt = (value: number, unit: "minute" | "hour") =>
    new Intl.NumberFormat(tag, { style: "unit", unit, unitDisplay: "short" }).format(value);

  if (minutes < 1) {
    return { minutes: 0, text: `< ${fmt(1, "minute")}` };
  }
  if (minutes < 60) {
    return { minutes, text: fmt(minutes, "minute") };
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return { minutes, text: fmt(hours, "hour") };
  }
  return { minutes, text: `${fmt(hours, "hour")} ${fmt(remainingMinutes, "minute")}` };
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
