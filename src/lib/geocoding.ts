import { env } from "~/env";
import { findMunicipalityByName } from "./api/municipalities";

export interface GeocodeResult {
  municipality: string | null;
  country: string | null;
  formattedAddress: string | null;
}

export interface ForwardGeocodeResult {
  lat: number;
  lng: number;
  municipality: string | null;
  formattedAddress: string;
}

// Mapbox Geocoding API response types
interface MapboxGeocodingResponse {
  type: string;
  features: MapboxFeature[];
}

interface MapboxFeature {
  place_name: string;
  center: [number, number]; // [lng, lat]
  context?: MapboxContext[];
}

interface MapboxContext {
  id: string;
  text: string;
}

// Rate limiting configuration
// Mapbox gives 100k free requests/month, so we can be generous
const RATE_LIMIT = {
  maxRequests: 60, // Maximum requests per time window
  timeWindow: 60 * 1000, // 1 minute in milliseconds
  cooldownPeriod: 30 * 1000, // 30 seconds cooldown after hitting limit
};

// Rate limiting state
interface RateLimitState {
  requests: number[];
  isInCooldown: boolean;
  cooldownUntil: number;
}

const rateLimitState: RateLimitState = {
  requests: [],
  isInCooldown: false,
  cooldownUntil: 0,
};

// Simple in-memory cache to avoid redundant requests
interface CacheEntry {
  result: GeocodeResult;
  timestamp: number;
}

const geocodeCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(lat: number, lng: number): string {
  // Round coordinates to reduce cache fragmentation
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `${roundedLat},${roundedLng}`;
}

function checkRateLimit(): boolean {
  const now = Date.now();

  // Check if we're in cooldown period
  if (rateLimitState.isInCooldown && now < rateLimitState.cooldownUntil) {
    console.warn(`Geocoding rate limited. Cooldown until: ${new Date(rateLimitState.cooldownUntil).toLocaleTimeString()}`);
    return false;
  }

  // Reset cooldown if period has passed
  if (rateLimitState.isInCooldown && now >= rateLimitState.cooldownUntil) {
    rateLimitState.isInCooldown = false;
    rateLimitState.requests = [];
  }

  // Remove requests outside the time window
  rateLimitState.requests = rateLimitState.requests.filter(
    timestamp => now - timestamp < RATE_LIMIT.timeWindow
  );

  // Check if we've hit the rate limit
  if (rateLimitState.requests.length >= RATE_LIMIT.maxRequests) {
    rateLimitState.isInCooldown = true;
    rateLimitState.cooldownUntil = now + RATE_LIMIT.cooldownPeriod;
    console.warn(`Geocoding rate limit exceeded (${RATE_LIMIT.maxRequests} requests per minute). Entering cooldown period.`);
    return false;
  }

  return true;
}

function addRequest(): void {
  rateLimitState.requests.push(Date.now());
}

function getCachedResult(lat: number, lng: number): GeocodeResult | null {
  const cacheKey = getCacheKey(lat, lng);
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  // Clean up expired cache entries
  if (cached && Date.now() - cached.timestamp >= CACHE_TTL) {
    geocodeCache.delete(cacheKey);
  }

  return null;
}

function setCachedResult(lat: number, lng: number, result: GeocodeResult): void {
  const cacheKey = getCacheKey(lat, lng);
  geocodeCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  // Periodically clean up old cache entries (keep cache size manageable)
  if (geocodeCache.size > 100) {
    const now = Date.now();
    for (const [key, entry] of geocodeCache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL) {
        geocodeCache.delete(key);
      }
    }
  }
}

/**
 * Reverse geocode coordinates to address using Mapbox API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Check cache first
  const cachedResult = getCachedResult(lat, lng);
  if (cachedResult) {
    return cachedResult;
  }

  // Check rate limit
  if (!checkRateLimit()) {
    console.warn("Geocoding request blocked due to rate limiting");
    return {
      municipality: null,
      country: null,
      formattedAddress: null,
    };
  }

  try {
    // Add this request to rate limit tracking
    addRequest();

    // Use Mapbox Geocoding API
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=place,region,country&language=is`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as MapboxGeocodingResponse;

    if (!data.features || data.features.length === 0) {
      console.warn("No geocoding results found for coordinates:", lat, lng);
      const emptyResult = {
        municipality: null,
        country: null,
        formattedAddress: null,
      };
      setCachedResult(lat, lng, emptyResult);
      return emptyResult;
    }

    const feature = data.features[0];
    if (!feature) {
      const emptyResult = {
        municipality: null,
        country: null,
        formattedAddress: null,
      };
      setCachedResult(lat, lng, emptyResult);
      return emptyResult;
    }

    let municipality: string | null = null;
    let country: string | null = null;

    // Extract municipality and country from context
    if (feature.context) {
      for (const ctx of feature.context) {
        if (ctx.id.startsWith("place.") || ctx.id.startsWith("region.")) {
          if (!municipality) {
            municipality = ctx.text;
          }
        }
        if (ctx.id.startsWith("country.")) {
          country = ctx.text;
        }
      }
    }

    // If the feature itself is a place/region, use it as municipality
    if (!municipality && feature.place_name) {
      const parts = feature.place_name.split(", ");
      if (parts.length > 0) {
        municipality = parts[0] ?? null;
      }
    }

    const geocodeResult = {
      municipality: await normalizeMunicipalityName(municipality),
      country,
      formattedAddress: feature.place_name,
    };

    // Cache the successful result
    setCachedResult(lat, lng, geocodeResult);

    return geocodeResult;
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
    return {
      municipality: null,
      country: null,
      formattedAddress: null,
    };
  }
}

/**
 * Forward geocode an address to coordinates using Mapbox API
 * Biased towards Iceland for better results
 */
export async function forwardGeocode(address: string): Promise<ForwardGeocodeResult[]> {
  if (!address || address.trim().length < 2) {
    return [];
  }

  // Check rate limit
  if (!checkRateLimit()) {
    console.warn("Geocoding request blocked due to rate limiting");
    return [];
  }

  try {
    // Add this request to rate limit tracking
    addRequest();

    // Use Mapbox Geocoding API with Iceland bias
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&country=IS&language=is&limit=5`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as MapboxGeocodingResponse;

    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Process results
    const results: ForwardGeocodeResult[] = [];

    for (const feature of data.features) {
      const [lng, lat] = feature.center;

      let municipality: string | null = null;

      // Extract municipality from context
      if (feature.context) {
        for (const ctx of feature.context) {
          if (ctx.id.startsWith("place.") || ctx.id.startsWith("region.")) {
            municipality = await normalizeMunicipalityName(ctx.text);
            break;
          }
        }
      }

      results.push({
        lat,
        lng,
        municipality,
        formattedAddress: feature.place_name,
      });
    }

    return results;
  } catch (error) {
    console.error("Error in forward geocoding:", error);
    return [];
  }
}

// Export rate limit status for debugging
export function getRateLimitStatus() {
  return {
    requestsInWindow: rateLimitState.requests.length,
    maxRequests: RATE_LIMIT.maxRequests,
    isInCooldown: rateLimitState.isInCooldown,
    cooldownUntil: rateLimitState.isInCooldown ? new Date(rateLimitState.cooldownUntil) : null,
    cacheSize: geocodeCache.size,
  };
}

/**
 * Normalize municipality name to match official Icelandic registry
 */
async function normalizeMunicipalityName(municipalityName: string | null): Promise<string | null> {
  if (!municipalityName) return null;

  try {
    // Try to find exact match in official Icelandic municipalities
    const officialMunicipality = await findMunicipalityByName(municipalityName);
    if (officialMunicipality) {
      return officialMunicipality.nafn;
    }

    // If no exact match found, return the original name
    return municipalityName;
  } catch (error) {
    console.warn("Failed to normalize municipality name:", error);
    return municipalityName;
  }
}
