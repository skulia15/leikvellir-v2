import { type Metadata } from 'next';
import { getBaseUrl } from './base-url';

const BASE_URL = getBaseUrl();
const DEFAULT_TITLE = 'Leiksvæði | Leikvellir á Íslandi';
const DEFAULT_DESCRIPTION = 'Uppgötvaðu og kortlegðu leiksvæði víðsvegar um Ísland. Finndu skemmtilega leikvelli með leiktækjum og ítarlegum upplýsingum fyrir fjölskylduna.';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
}

export function generateMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  image = `${BASE_URL}/og-image.png`,
  url = BASE_URL,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  keywords = [
    'leiksvæði',
    'leikvöllur',
    'leikvellir',
    'róló',
    'róluvellir',
    'fjölskylda',
    'íslenska',
    'reykjavík',
    'playground',
    'iceland',
    'family',
    'children'
  ]
}: SEOProps = {}): Metadata {
  const fullTitle = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: authors ? authors.map(name => ({ name })) : [{ name: 'Leiksvæði.is' }],

    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'Leiksvæði',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title || DEFAULT_TITLE,
        }
      ],
      locale: 'is_IS',
      type,
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        authors,
      }),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@leiskvæði',
      site: '@leiskvæði',
    },

    // Additional metadata
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Verification
    verification: {
      google: 'T6ALXq-rzn0arBTQuAPGDqNpTKMf49319JZIAsW3Mfo',
    },

    // Alternate languages
    // Language is client-side (localStorage), not URL-based — all languages share the same URL
    alternates: {
      canonical: url,
    },

    // App-specific
    applicationName: 'Leiksvæði',
    generator: 'Next.js',
    referrer: 'origin-when-cross-origin',

    // Apple
    appleWebApp: {
      capable: true,
      title: 'Leiksvæði',
      statusBarStyle: 'default',
    },

    // Icons
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180' },
      ],
      other: [
        { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#10b981' },
      ],
    },

    // Manifest
    manifest: '/manifest.json',
  };
}

// Helper for playground-specific metadata
export function generatePlaygroundMetadata(playground: {
  id: string;
  name: string;
  municipality?: string | null;
  latitude: number;
  longitude: number;
  images?: string[] | null;
}) {
  const title = playground.name;
  const locationText = playground.municipality || 'á Íslandi';
  const description = `${playground.name} - leiksvæði í ${locationText}. Skoðaðu leiktæki, myndir, aðgengi og staðsetningu. Finndu fleiri leiksvæði á Íslandi.`;
  const image = playground.images?.[0] || `${BASE_URL}/og-image.png`;
  const url = `${BASE_URL}/playground/${playground.id}`;

  return generateMetadata({
    title,
    description,
    image,
    url,
    type: 'article',
    keywords: [
      'leiksvæði',
      'leikvöllur',
      'leikvellir',
      'róló',
      'róluvellir',
      playground.name.toLowerCase(),
      playground.municipality?.toLowerCase(),
      'íslenska',
      'playground',
      'iceland'
    ].filter(Boolean) as string[],
  });
}
