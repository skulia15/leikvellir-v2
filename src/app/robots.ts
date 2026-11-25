import { type MetadataRoute } from 'next';
import { getBaseUrl } from '~/lib/seo/base-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

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
