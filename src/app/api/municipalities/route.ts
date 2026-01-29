import { NextResponse } from 'next/server';

interface ApiResult {
  Result: Array<{
    Landshluti: string;
    Sveitarfelog: Array<{
      Svfn: string;
      Nafn: string;
      Fulltnafn: string;
    }>;
  }>;
}

// Cache the municipalities data to avoid excessive API calls
// TODO: Find a better caching strategy for this data
let municipalitiesCache: {
  data: ApiResult;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Check if we have valid cached data
    if (municipalitiesCache &&
      Date.now() - municipalitiesCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(municipalitiesCache.data);
    }

    // Fetch fresh data from the Icelandic registry
    const response = await fetch('https://svc.skra.is/talnaefni/api/Sveitarfelog', {
      headers: {
        'User-Agent': 'Leiksvæði-App/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Icelandic registry API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as ApiResult;

    // Validate the response structure
    if (!data?.Result || !Array.isArray(data.Result)) {
      throw new Error('Invalid response structure from Icelandic registry');
    }

    // Update cache
    municipalitiesCache = {
      data,
      timestamp: Date.now(),
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching municipalities:', error);

    // If we have cached data, return it even if stale
    if (municipalitiesCache) {
      return NextResponse.json(municipalitiesCache.data);
    }

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to fetch municipalities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
