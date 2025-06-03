/**
 * Fetches municipalities from the official Icelandic registry
 * API: https://svc.skra.is/talnaefni/api/Sveitarfelog
 */

export interface Municipality {
  svfn: string; // Municipality code
  nafn: string; // Short name
  fulltnafn: string; // Full official name
}

export interface MunicipalityRegion {
  landshluti: string; // Region name
  sveitarfelog: Municipality[];
}

interface ApiResponse {
  Result: Array<{
    Landshluti: string;
    Sveitarfelog: Array<{
      Svfn: string;
      Nafn: string;
      Fulltnafn: string;
    }>;
  }>;
}

interface ApiErrorResponse {
  error: string;
  message?: string;
}

let municipalitiesCache: Municipality[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches all municipalities, returns flattened array
 */
export async function fetchMunicipalities(): Promise<Municipality[]> {
  // Return cached data if still valid
  if (municipalitiesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return municipalitiesCache;
  }

  try {
    // Use our Next.js API route instead of calling external API directly
    const response = await fetch('/api/municipalities');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse | ApiErrorResponse = await response.json();
    
    // Check for error response from our API
    if ('error' in data) {
      throw new Error((data as ApiErrorResponse).message || 'API returned an error');
    }
    
    // Flatten all municipalities from all regions
    const municipalities: Municipality[] = (data as ApiResponse).Result.flatMap(region => 
      region.Sveitarfelog.map(muni => ({
        svfn: muni.Svfn,
        nafn: muni.Nafn,
        fulltnafn: muni.Fulltnafn
      }))
    );

    // Sort alphabetically by name
    municipalities.sort((a, b) => a.nafn.localeCompare(b.nafn, 'is'));

    // Cache the results
    municipalitiesCache = municipalities;
    cacheTimestamp = Date.now();

    return municipalities;
  } catch (error) {
    console.error('Failed to fetch municipalities:', error);
    
    // Return empty array on error, or cached data if available
    return municipalitiesCache || [];
  }
}

/**
 * Fetches municipalities grouped by region
 */
export async function fetchMunicipalitiesByRegion(): Promise<MunicipalityRegion[]> {
  try {
    // Use our Next.js API route instead of calling external API directly
    const response = await fetch('/api/municipalities');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse | ApiErrorResponse = await response.json();
    
    // Check for error response from our API
    if ('error' in data) {
      throw new Error((data as ApiErrorResponse).message || 'API returned an error');
    }
    
    return (data as ApiResponse).Result.map(region => ({
      landshluti: region.Landshluti,
      sveitarfelog: region.Sveitarfelog.map(muni => ({
        svfn: muni.Svfn,
        nafn: muni.Nafn,
        fulltnafn: muni.Fulltnafn
      })).sort((a, b) => a.nafn.localeCompare(b.nafn, 'is'))
    }));
  } catch (error) {
    console.error('Failed to fetch municipalities by region:', error);
    return [];
  }
}

/**
 * Finds a municipality by name (supports both short and full names)
 */
export async function findMunicipalityByName(name: string): Promise<Municipality | null> {
  const municipalities = await fetchMunicipalities();
  
  return municipalities.find(m => 
    m.nafn.toLowerCase() === name.toLowerCase() || 
    m.fulltnafn.toLowerCase() === name.toLowerCase()
  ) || null;
}
