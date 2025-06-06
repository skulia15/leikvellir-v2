import { type MetadataRoute } from 'next';
import { env } from '~/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_BASE_URL || 'https://leiksvaedi.is';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/signin'
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
