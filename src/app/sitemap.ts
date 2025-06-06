import { type MetadataRoute } from 'next';
import { db } from '~/server/db';
import { playgrounds } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '~/env';

// Base URL for the site - fallback to default if not configured
const BASE_URL = env.NEXT_PUBLIC_BASE_URL || 'https://leiksvaedi.is';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      url: `${BASE_URL}/create-playground`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
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

    return [...staticPages, ...playgroundPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return just static pages if database query fails
    return staticPages;
  }
}
