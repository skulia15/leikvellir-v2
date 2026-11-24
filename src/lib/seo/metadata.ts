import { type Metadata } from 'next';
import { getBaseUrl } from './base-url';
import { formatIcelandicLocation } from '~/lib/icelandic-declension';

const BASE_URL = getBaseUrl();
const DEFAULT_TITLE = 'Leiksvæði - Uppgötvaðu og kortleggðu leikvelli á Íslandi';
const DEFAULT_DESCRIPTION = 'Uppgötvaðu og kortleggðu leiksvæði víðsvegar um Ísland. Finndu skemmtilega leikvelli með leiktækjum og ítarlegum upplýsingum fyrir fjölskylduna.';

const DEFAULT_KEYWORDS = [
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
  'children',
];

const DEFAULT_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
};

const NO_INDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
};

interface SEOProps {
  title?: string;
  /** Use title verbatim without appending `| DEFAULT_TITLE` */
  exactTitle?: boolean;
  description?: string;
  image?: string;
  /** Full canonical/OG URL. Takes precedence over `path`. */
  url?: string;
  /** Route path relative to BASE_URL (e.g. '/', '/playgrounds', '/contact'). */
  path?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
  noIndex?: boolean;
}

function resolveCanonicalUrl(url?: string, path?: string): string | undefined {
  if (url) return url;
  if (path === undefined) return undefined;
  if (path === '/' || path === '') return BASE_URL;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Site-wide root layout metadata.
 * Intentionally omits `alternates` and `openGraph`/`twitter` URLs so child routes
 * never inherit the homepage canonical URL or homepage OG metadata via shallow merge.
 */
export function generateRootMetadata(): Metadata {
  return {
    metadataBase: new URL(BASE_URL),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS.join(', '),
    authors: [{ name: 'Leiksvæði.is' }],
    robots: DEFAULT_ROBOTS,
    verification: {
      google: 'T6ALXq-rzn0arBTQuAPGDqNpTKMf49319JZIAsW3Mfo',
    },
    applicationName: 'Leiksvæði',
    generator: 'Next.js',
    referrer: 'origin-when-cross-origin',
    appleWebApp: {
      capable: true,
      title: 'Leiksvæði',
      statusBarStyle: 'default',
    },
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
    manifest: '/manifest.json',
  };
}

export function generateMetadata({
  title,
  exactTitle = false,
  description = DEFAULT_DESCRIPTION,
  image = `${BASE_URL}/og-image.png`,
  url,
  path,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
}: SEOProps = {}): Metadata {
  const fullTitle = title
    ? exactTitle
      ? title
      : `${title} | ${DEFAULT_TITLE}`
    : DEFAULT_TITLE;
  const canonicalUrl = resolveCanonicalUrl(url, path);

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: authors ? authors.map(name => ({ name })) : [{ name: 'Leiksvæði.is' }],

    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
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
    },

    robots: noIndex ? NO_INDEX_ROBOTS : DEFAULT_ROBOTS,

    // Alternate languages
    // Language is client-side (localStorage), not URL-based — all languages share the same URL
    ...(canonicalUrl && !noIndex
      ? {
          alternates: {
            canonical: canonicalUrl,
          },
        }
      : {}),
  };
}

// Helper for playground-specific metadata
export function generatePlaygroundMetadata(playground: {
  id: string;
  name: string;
  municipality?: string | null;
  latitude: number;
  longitude: number;
  coverImage?: string | null;
  images?: string[] | null;
}) {
  const title = playground.name;
  const description = `${playground.name} - leiksvæði ${formatIcelandicLocation(playground.municipality)}. Skoðaðu leiktæki, myndir, aðgengi og staðsetningu. Finndu fleiri leiksvæði á Íslandi.`;
  const allImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? []),
  ].filter((img, index, arr) => Boolean(img) && arr.indexOf(img) === index);
  const image = allImages[0] || `${BASE_URL}/og-image.png`;
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
