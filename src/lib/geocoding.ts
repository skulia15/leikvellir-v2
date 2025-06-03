import { env } from "~/env";
import { findMunicipalityByName } from "./api/municipalities";

export interface GeocodeResult {
  municipality: string | null;
  country: string | null;
  formattedAddress: string | null;
}

interface GoogleGeocodingResponse {
  status: string;
  error_message?: string;
  results: GoogleGeocodingResult[];
}

interface GoogleGeocodingResult {
  address_components: AddressComponent[];
  formatted_address: string;
}

interface AddressComponent {
  long_name: string;
  types: string[];
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 10, // Maximum requests per time window
  timeWindow: 60 * 1000, // 1 minute in milliseconds
  cooldownPeriod: 5 * 60 * 1000, // 5 minutes cooldown after hitting limit
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
    console.log("Geocoding rate limit cooldown period ended");
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
    console.log("Using cached geocoding result for:", cacheKey);
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

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    console.log("Making geocoding request for:", lat, lng);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as GoogleGeocodingResponse;
    console.log("Geocoding response status:", data.status);

    if (data.status !== "OK") {
      console.warn(`Geocoding API returned status: ${data.status}`, data.error_message || "");
      if (data.status === "ZERO_RESULTS") {
        console.warn("No geocoding results found for coordinates:", lat, lng);
      }

      const emptyResult = {
        municipality: null,
        country: null,
        formattedAddress: null,
      };

      // Cache empty results to avoid repeated failed requests
      setCachedResult(lat, lng, emptyResult);
      return emptyResult;
    }

    if (!data.results || data.results.length === 0) {
      console.warn("No geocoding results found for coordinates:", lat, lng);
      const emptyResult = {
        municipality: null,
        country: null,
        formattedAddress: null,
      };
      setCachedResult(lat, lng, emptyResult);
      return emptyResult;
    }

    const result = data.results[0];
    if (!result) {
      console.warn("No geocoding results found for coordinates:", lat, lng);
      const emptyResult = {
        municipality: null,
        country: null,
        formattedAddress: null,
      };
      setCachedResult(lat, lng, emptyResult);
      return emptyResult;
    }
    console.log("Processing geocoding result for:", lat, lng);

    let municipality: string | null = null;
    let country: string | null = null;

    // Extract municipality and country from address components
    // For Iceland, prioritize administrative_area_level_1 over locality
    for (const component of result.address_components) {
      const types: string[] = component.types;
      console.log("Address component:", component.long_name, "Types:", types);

      // Look for country first
      if (types.includes("country")) {
        country = component.long_name;
        console.log("Found country:", country);
      }

      // For Iceland, prioritize administrative_area_level_1 (municipality)
      if (types.includes("administrative_area_level_1") && !municipality) {
        municipality = component.long_name;
        console.log("Found municipality (admin_area_1):", municipality, "from type:", types);
      }
    }

    // If no administrative_area_level_1 found, fall back to locality
    if (!municipality) {
      for (const component of result.address_components) {
        const types: string[] = component.types;
        if (types.includes("locality")) {
          municipality = component.long_name;
          console.log("Found municipality (locality fallback):", municipality, "from type:", types);
          break;
        }
      }
    }

    const geocodeResult = {
      municipality: await normalizeMunicipalityName(municipality),
      country,
      formattedAddress: result.formatted_address,
    };

    console.log("Final geocoding result:", geocodeResult);

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
      console.log(`Normalized municipality: "${municipalityName}" -> "${officialMunicipality.nafn}"`);
      return officialMunicipality.nafn;
    }

    // If no exact match found, return the original name
    console.log(`Municipality "${municipalityName}" not found in official registry, using as-is`);
    return municipalityName;
  } catch (error) {
    console.warn("Failed to normalize municipality name:", error);
    return municipalityName;
  }
}
