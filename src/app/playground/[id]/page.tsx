import { cache } from "react";
import { notFound } from "next/navigation";
import PlaygroundDetailClient from "~/app/_components/playground-detail-client";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { api, HydrateClient } from "~/trpc/server";
import { generatePlaygroundMetadata } from "~/lib/seo/metadata";
import { PlaygroundSchema, BreadcrumbSchema } from "~/lib/seo/structured-data";
import { getBaseUrl } from "~/lib/seo/base-url";

interface PlaygroundPageProps {
  params: Promise<{ id: string }>;
}

const PLAYGROUND_ID_PATTERN = /^\d+$/;

function parsePlaygroundId(id: string): number | null {
  if (!PLAYGROUND_ID_PATTERN.test(id)) {
    return null;
  }
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

const getPlaygroundById = cache(async (id: number) => {
  return api.playground.getById({ id });
});

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const playgroundId = parsePlaygroundId(id);

  if (playgroundId === null) {
    notFound();
  }

  let playground;
  try {
    playground = await getPlaygroundById(playgroundId);
  } catch {
    notFound();
  }

  // The detail payload embeds its own equipment records, but the page also
  // renders the nearby-playgrounds list off getAll, which does not.
  void api.equipment.getCatalog.prefetch();

  const BASE_URL = getBaseUrl();

  // Get the first image for preloading (LCP optimization)
  // This must match the image order in playground-detail.tsx
  const displayImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? []),
  ].filter((img, index, arr) => arr.indexOf(img) === index);
  const firstImage = displayImages[0];

  return (
    <>
      {/* Preload LCP Image with Next.js optimization */}
      {firstImage && (
        <>
          <link
            rel="preload"
            as="image"
            href={`/_next/image?url=${encodeURIComponent(firstImage)}&w=640&q=85`}
            fetchPriority="high"
            media="(max-width: 640px)"
          />
          <link
            rel="preload"
            as="image"
            href={`/_next/image?url=${encodeURIComponent(firstImage)}&w=828&q=85`}
            fetchPriority="high"
            media="(max-width: 768px)"
          />
          <link
            rel="preload"
            as="image"
            href={`/_next/image?url=${encodeURIComponent(firstImage)}&w=1080&q=85`}
            fetchPriority="high"
            media="(min-width: 769px)"
          />
        </>
      )}

      {/* Structured Data */}
      <PlaygroundSchema
        playground={{
          id: playground.id.toString(),
          name: playground.title,
          municipality: playground.municipality,
          latitude: playground.latitude,
          longitude: playground.longitude,
          coverImage: playground.coverImage,
          images: playground.images,
          createdAt: playground.createdAt,
          updatedAt: playground.updatedAt,
        }}
      />

      {/* Breadcrumb Schema */}
      <BreadcrumbSchema
        items={[
          { name: 'Heim', url: BASE_URL },
          { name: 'Leiksvæði', url: `${BASE_URL}/playgrounds` },
          { name: playground.title, url: `${BASE_URL}/playground/${playground.id}` },
        ]}
      />

      <HydrateClient>
        <PlaygroundDetailClient
          playgroundId={playgroundId}
          initialPlayground={playground}
        />
      </HydrateClient>
    </>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const playgroundId = parsePlaygroundId(id);

  if (playgroundId === null) {
    return {
      title: getTranslation(defaultLocale, 'playground.notFound'),
      robots: { index: false, follow: false },
    };
  }

  try {
    const playground = await getPlaygroundById(playgroundId);
    return generatePlaygroundMetadata({
      id: playground.id.toString(),
      name: playground.title,
      municipality: playground.municipality,
      latitude: playground.latitude,
      longitude: playground.longitude,
      coverImage: playground.coverImage,
      images: playground.images,
    });
  } catch {
    return {
      title: getTranslation(defaultLocale, 'playground.notFound'),
      robots: { index: false, follow: false },
    };
  }
}
