import { EquipmentCategorySchema, type EquipmentCategory } from "~/types";
import {
  type AmenityFilterKey,
  type MapPlaygroundFilters,
} from "./search-utils";

export type ListSortOption = "proximity" | "newest" | "name";

const VALID_SORT_OPTIONS = new Set<string>(["proximity", "newest", "name"]);
const VALID_CATEGORIES = new Set<string>(EquipmentCategorySchema.options);

const AMENITY_PARAM_TO_KEY: Record<string, AmenityFilterKey> = {
  fencing: "hasFencing",
  bathroom: "hasBathroomNearby",
  picnic: "hasPicnicTable",
  seating: "hasSeating",
  softPlay: "hasSoftPlayArea",
};

const AMENITY_KEY_TO_PARAM: Record<AmenityFilterKey, string> = {
  hasFencing: "fencing",
  hasBathroomNearby: "bathroom",
  hasPicnicTable: "picnic",
  hasSeating: "seating",
  hasSoftPlayArea: "softPlay",
};

export interface PlaygroundsListUrlState {
  search: string;
  municipality: string;
  sortBy: ListSortOption | null;
  activeCategories: EquipmentCategory[];
  bouncyPillow: boolean;
  footballField: boolean;
  openNow: boolean;
}

export interface MapViewportState {
  lat: number;
  lng: number;
  zoom: number;
}

export interface HomeMapUrlState {
  filters: MapPlaygroundFilters;
  selectedPlaygroundId: number | null;
  viewport: MapViewportState | null;
}

interface SearchParamsLike {
  get(name: string): string | null;
}

function parseBoolFlag(value: string | null): boolean {
  return value === "1" || value === "true";
}

function parseCategoryList(value: string | null): EquipmentCategory[] {
  if (!value) return [];
  const seen = new Set<EquipmentCategory>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (VALID_CATEGORIES.has(trimmed)) {
      seen.add(trimmed as EquipmentCategory);
    }
  }
  return Array.from(seen);
}

function formatCoordinate(value: number, decimals: number): string {
  return Number(value.toFixed(decimals)).toString();
}

/**
 * Parse `/playgrounds` URL search params into structured filter/sort state.
 */
export function parsePlaygroundsListParams(
  params: SearchParamsLike,
): PlaygroundsListUrlState {
  const rawSort = params.get("sort");
  const sortBy =
    rawSort && VALID_SORT_OPTIONS.has(rawSort)
      ? (rawSort as ListSortOption)
      : null;

  return {
    search: params.get("search") ?? "",
    municipality: params.get("municipality") ?? "__all__",
    sortBy,
    activeCategories: parseCategoryList(params.get("categories")),
    bouncyPillow: parseBoolFlag(params.get("bouncy")),
    footballField: parseBoolFlag(params.get("football")),
    openNow: parseBoolFlag(params.get("open")),
  };
}

/**
 * Serialize `/playgrounds` filter/sort state into clean URLSearchParams.
 */
export function serializePlaygroundsListParams(
  state: PlaygroundsListUrlState,
): URLSearchParams {
  const params = new URLSearchParams();

  const trimmedSearch = state.search.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }
  if (state.municipality && state.municipality !== "__all__") {
    params.set("municipality", state.municipality);
  }
  if (state.sortBy) {
    params.set("sort", state.sortBy);
  }
  if (state.activeCategories.length > 0) {
    params.set("categories", state.activeCategories.join(","));
  }
  if (state.bouncyPillow) {
    params.set("bouncy", "1");
  }
  if (state.footballField) {
    params.set("football", "1");
  }
  if (state.openNow) {
    params.set("open", "1");
  }

  return params;
}

/**
 * Parse `/` home map URL search params into filters, selected playground ID, and viewport.
 */
export function parseHomeMapParams(params: SearchParamsLike): HomeMapUrlState {
  const filters: MapPlaygroundFilters = {};

  const search = params.get("search");
  if (search && search.trim().length > 0) {
    filters.search = search;
  }
  if (parseBoolFlag(params.get("open"))) {
    filters.accessibleNow = true;
  }
  if (parseBoolFlag(params.get("toddler"))) {
    filters.toddlerFriendly = true;
  }
  if (parseBoolFlag(params.get("public"))) {
    filters.publiclyAccessible = true;
  }
  if (parseBoolFlag(params.get("bouncy"))) {
    filters.bouncyPillow = true;
  }
  if (parseBoolFlag(params.get("football"))) {
    filters.footballField = true;
  }

  const categories = parseCategoryList(params.get("categories"));
  if (categories.length > 0) {
    filters.categories = categories;
  }

  const rawAmenities = params.get("amenities");
  if (rawAmenities) {
    for (const token of rawAmenities.split(",")) {
      const key = AMENITY_PARAM_TO_KEY[token.trim()];
      if (key) {
        filters[key] = true;
      }
    }
  }

  const rawPlaygroundId = params.get("playground");
  let selectedPlaygroundId: number | null = null;
  if (rawPlaygroundId) {
    const parsed = Number.parseInt(rawPlaygroundId, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      selectedPlaygroundId = parsed;
    }
  }

  const rawLat = params.get("lat");
  const rawLng = params.get("lng");
  const rawZoom = params.get("z");
  let viewport: MapViewportState | null = null;

  if (rawLat !== null && rawLng !== null) {
    const lat = Number.parseFloat(rawLat);
    const lng = Number.parseFloat(rawLng);
    const parsedZoom = rawZoom !== null ? Number.parseFloat(rawZoom) : 15;
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      const zoom =
        Number.isFinite(parsedZoom) && parsedZoom >= 1 && parsedZoom <= 22
          ? parsedZoom
          : 15;
      viewport = { lat, lng, zoom };
    }
  }

  return {
    filters,
    selectedPlaygroundId,
    viewport,
  };
}

/**
 * Serialize `/` home map state into clean URLSearchParams.
 */
export function serializeHomeMapParams(state: {
  filters: MapPlaygroundFilters;
  selectedPlaygroundId: number | null;
  viewport: MapViewportState | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  const { filters, selectedPlaygroundId, viewport } = state;

  const trimmedSearch = filters.search?.trim();
  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }
  if (filters.accessibleNow) {
    params.set("open", "1");
  }
  if (filters.toddlerFriendly) {
    params.set("toddler", "1");
  }
  if (filters.publiclyAccessible) {
    params.set("public", "1");
  }
  if (filters.bouncyPillow) {
    params.set("bouncy", "1");
  }
  if (filters.footballField) {
    params.set("football", "1");
  }
  if (filters.categories && filters.categories.length > 0) {
    params.set("categories", filters.categories.join(","));
  }

  const activeAmenities: string[] = [];
  for (const [key, paramToken] of Object.entries(AMENITY_KEY_TO_PARAM) as [
    AmenityFilterKey,
    string,
  ][]) {
    if (filters[key]) {
      activeAmenities.push(paramToken);
    }
  }
  if (activeAmenities.length > 0) {
    params.set("amenities", activeAmenities.join(","));
  }

  if (selectedPlaygroundId !== null) {
    params.set("playground", String(selectedPlaygroundId));
  }

  if (viewport) {
    params.set("lat", formatCoordinate(viewport.lat, 5));
    params.set("lng", formatCoordinate(viewport.lng, 5));
    params.set("z", formatCoordinate(viewport.zoom, 2));
  }

  return params;
}

/**
 * Update the browser URL query string using `history.replaceState` while preserving
 * Next.js internal history state and avoiding redundant calls.
 */
export function replaceUrlSearchParams(params: URLSearchParams): void {
  if (typeof window === "undefined") return;

  const query = params.toString();
  const nextRelativeUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextRelativeUrl !== currentRelativeUrl) {
    window.history.replaceState(window.history.state, "", nextRelativeUrl);
  }
}

let inAppNavigationRecorded = false;
let lastInAppListPath: "/" | "/playgrounds" = "/";

/**
 * Record that the user has visited an in-app discovery view in this SPA session,
 * so detail pages know `router.back()` returns inside the app.
 */
export function recordInAppNavigation(path?: "/" | "/playgrounds"): void {
  inAppNavigationRecorded = true;
  if (path) {
    lastInAppListPath = path;
  }
}

/**
 * Returns whether an in-app page has been visited during this SPA session.
 */
export function hasRecordedInAppNavigation(): boolean {
  return inAppNavigationRecorded;
}

/**
 * Returns the most recent in-app listing route ("/" or "/playgrounds") as a smart fallback.
 */
export function getBackFallbackPath(): "/" | "/playgrounds" {
  return lastInAppListPath;
}

/**
 * Check whether a referrer URL belongs to the same origin as the current page.
 */
export function isSameOriginReferrer(
  referrer: string,
  currentOrigin: string,
): boolean {
  if (!referrer || !currentOrigin) return false;
  try {
    const parsed = new URL(referrer);
    if (typeof parsed.origin === "string" && parsed.origin.length > 0) {
      return parsed.origin === currentOrigin;
    }
  } catch {
    return false;
  }
  const match = /^(https?:\/\/[^/?#]+)/i.exec(referrer);
  return match?.[1]?.toLowerCase() === currentOrigin.toLowerCase();
}

/**
 * Determine whether Back button should call `router.back()` or fall back to an in-app route.
 * Avoids leaving the site or doing nothing when users land directly from search or shared URLs.
 */
export function shouldUseHistoryBack(options: {
  referrer: string;
  currentOrigin: string;
  historyLength: number;
  hasInAppReferrer: boolean;
}): boolean {
  if (options.historyLength <= 1) return false;
  if (options.hasInAppReferrer) return true;
  return isSameOriginReferrer(options.referrer, options.currentOrigin);
}

