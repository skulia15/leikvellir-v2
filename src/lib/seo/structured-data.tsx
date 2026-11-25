import { getBaseUrl } from './base-url';
import { formatIcelandicLocation } from '~/lib/icelandic-declension';

const BASE_URL = getBaseUrl();

const JSON_LD_ESCAPE_MAP: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Safely serializes structured data for embedding inside a `<script type="application/ld+json">` tag.
 * Escapes `<`, `>`, `&`, `\u2028`, and `\u2029` to prevent `</script>` breakout and XSS while remaining valid JSON.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (char) => JSON_LD_ESCAPE_MAP[char] ?? char,
  );
}

/**
 * Renders a JSON-LD structured data script tag.
 * Uses a plain <script> tag (not next/script) to ensure the structured data
 * is present in the initial server-rendered HTML for reliable crawler parsing.
 */
function JsonLd({ id, data }: { id: string; data: Record<string, unknown> }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}

interface OrganizationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
}

export function OrganizationSchema({
  name = 'Leiksvæði',
  description = 'Finndu og kortleggðu leiksvæði og róluvelli víðsvegar um landið',
  url = BASE_URL,
  logo = `${BASE_URL}/android-chrome-512x512.png`
}: OrganizationSchemaProps = {}) {
  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Icelandic', 'English']
    }
  };

  return <JsonLd id="organization-schema" data={organizationData} />;
}

interface WebsiteSchemaProps {
  name?: string;
  description?: string;
  url?: string;
}

export function WebsiteSchema({
  name = 'Leiksvæði',
  description = 'Finndu og kortleggðu leiksvæði víðsvegar um Ísland',
  url = BASE_URL
}: WebsiteSchemaProps = {}) {
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/playgrounds?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    inLanguage: ['is', 'en'],
    publisher: {
      '@type': 'Organization',
      name: 'Leiksvæði',
      url
    }
  };

  return <JsonLd id="website-schema" data={websiteData} />;
}

interface PlaygroundSchemaProps {
  playground: {
    id: string;
    name: string;
    municipality?: string | null;
    latitude: number;
    longitude: number;
    coverImage?: string | null;
    images?: string[] | null;
    createdAt: Date;
    updatedAt?: Date | null;
  };
}

export function PlaygroundSchema({ playground }: PlaygroundSchemaProps) {
  const allImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? []),
  ].filter((img, index, arr) => Boolean(img) && arr.indexOf(img) === index);

  const playgroundData = {
    '@context': 'https://schema.org',
    '@type': 'Playground',
    '@id': `${BASE_URL}/playground/${playground.id}`,
    name: playground.name,
    description: `${playground.name} - leiksvæði ${formatIcelandicLocation(playground.municipality)}`,
    url: `${BASE_URL}/playground/${playground.id}`,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: playground.latitude,
      longitude: playground.longitude
    },
    ...(playground.municipality && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: playground.municipality,
        addressCountry: 'IS'
      }
    }),
    ...(allImages.length > 0 && {
      image: allImages.map(image => ({
        '@type': 'ImageObject',
        url: image,
        caption: playground.name
      }))
    }),
    dateCreated: playground.createdAt.toISOString(),
    ...(playground.updatedAt && {
      dateModified: playground.updatedAt.toISOString()
    }),
    isAccessibleForFree: true,
    amenityFeature: [
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Playground Equipment',
        value: true
      },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Child Friendly',
        value: true
      }
    ],
    audience: {
      '@type': 'PeopleAudience',
      audienceType: 'Children and Families'
    }
  };

  return <JsonLd id={`playground-schema-${playground.id}`} data={playgroundData} />;
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };

  return <JsonLd id="breadcrumb-schema" data={breadcrumbData} />;
}

interface PlaygroundListSchemaProps {
  playgrounds: Array<{
    id: number;
    name: string;
    municipality?: string | null;
  }>;
  name?: string;
  description?: string;
}

export function PlaygroundListSchema({
  playgrounds,
  name = 'Leiksvæði á Íslandi',
  description = 'Listi yfir leiksvæði á Íslandi',
}: PlaygroundListSchemaProps) {
  const listData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: playgrounds.length,
    itemListElement: playgrounds.slice(0, 100).map((playground, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: playground.name,
      url: `${BASE_URL}/playground/${playground.id}`,
      item: {
        '@type': 'Playground',
        name: playground.name,
        url: `${BASE_URL}/playground/${playground.id}`,
        ...(playground.municipality && {
          address: {
            '@type': 'PostalAddress',
            addressLocality: playground.municipality,
            addressCountry: 'IS'
          }
        })
      }
    }))
  };

  return <JsonLd id="playground-list-schema" data={listData} />;
}

interface FAQSchemaProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQSchema({ questions }: FAQSchemaProps) {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer
      }
    }))
  };

  return <JsonLd id="faq-schema" data={faqData} />;
}
