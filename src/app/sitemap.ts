import { type MetadataRoute } from 'next';
import { db } from '~/server/db';
import { playgrounds } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { getBaseUrl } from '~/lib/seo/base-url';
import { MIN_INDEXABLE_PLAYGROUNDS, municipalityPath } from '~/lib/municipality-slug';
import { getMunicipalities } from '~/server/queries/municipalities';

// Rendered per request: at build time there is no database access on the
// Workers build (postgres.js uses `cloudflare:sockets`), and a prerendered
// sitemap would silently ship without any playground URLs.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = getBaseUrl();
  
  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/playgrounds`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/leiksvaedi`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Get all approved playgrounds for dynamic pages
  try {
    const approvedPlaygrounds = await db
      .select({
        id: playgrounds.id,
        updatedAt: playgrounds.updatedAt,
      })
      .from(playgrounds)
      .where(eq(playgrounds.status, 'approved'));

    // Generate sitemap entries for each playground
    const playgroundPages: MetadataRoute.Sitemap = approvedPlaygrounds.map((playground) => ({
      url: `${BASE_URL}/playground/${playground.id}`,
      lastModified: playground.updatedAt ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    let municipalityPages: MetadataRoute.Sitemap = [];
    try {
      const municipalities = await getMunicipalities();
      municipalityPages = municipalities
        .filter((m) => m.playgroundCount >= MIN_INDEXABLE_PLAYGROUNDS)
        .map((m) => ({
          url: `${BASE_URL}${municipalityPath(m.name)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }));
    } catch (error) {
      console.error('Error listing municipalities for sitemap:', error);
    }

    return [...staticPages, ...municipalityPages, ...playgroundPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return just static pages if database query fails
    return staticPages;
  }
}
