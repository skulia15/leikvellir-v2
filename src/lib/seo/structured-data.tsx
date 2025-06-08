import Script from 'next/script';
import { getBaseUrl } from './base-url';

const BASE_URL = getBaseUrl();

interface OrganizationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
}

export function OrganizationSchema({
  name = 'Leiksvæði',
  description = 'Finndu og kortleggðu leiksvæði víðsvegar um landið',
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
    sameAs: [
      // Add social media links when available
      // 'https://www.facebook.com/leiskvæði ',
      // 'https://twitter.com/leiskvæði',
      // 'https://www.instagram.com/leiskvæði'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Icelandic', 'English']
    }
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(organizationData),
      }}
    />
  );
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

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(websiteData),
      }}
    />
  );
}

interface PlaygroundSchemaProps {
  playground: {
    id: string;
    name: string;
    municipality?: string | null;
    latitude: number;
    longitude: number;
    images?: string[] | null;
    createdAt: Date;
    updatedAt?: Date | null;
  };
}

export function PlaygroundSchema({ playground }: PlaygroundSchemaProps) {
  const playgroundData = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    '@id': `${BASE_URL}/playground/${playground.id}`,
    name: playground.name,
    description: `Leikvöllur í ${playground.municipality || 'á Íslandi'}`,
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
    ...(playground.images?.length && {
      image: playground.images.map(image => ({
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

  return (
    <Script
      id={`playground-schema-${playground.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(playgroundData),
      }}
    />
  );
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

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbData),
      }}
    />
  );
}
