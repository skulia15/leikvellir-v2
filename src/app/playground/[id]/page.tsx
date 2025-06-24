import { notFound } from "next/navigation";
import PlaygroundDetailClient from "~/app/_components/playground-detail-client";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { api } from "~/trpc/server";
import { generatePlaygroundMetadata } from "~/lib/seo/metadata";
import { PlaygroundSchema, BreadcrumbSchema } from "~/lib/seo/structured-data";
import { getBaseUrl } from "~/lib/seo/base-url";

interface PlaygroundPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const playgroundId = parseInt(id);

  if (isNaN(playgroundId)) {
    notFound();
  }

  // Get playground data for structured data
  let playground;
  try {
    playground = await api.playground.getById({ id: playgroundId });
  } catch {
    notFound();
  }

  // Prefetch the data on the server for better performance
  try {
    void api.playground.getById.prefetch({ id: playgroundId });
  } catch {
    // If prefetch fails, let the client handle it
  }

  const BASE_URL = getBaseUrl();

  // Get the first image for preloading (LCP optimization)
  // This must match the image order in playground-detail.tsx
  const displayImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? [])
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
          images: playground.images,
          createdAt: playground.createdAt,
          updatedAt: playground.updatedAt,
        }}
      />

      {/* Breadcrumb Schema */}
      <BreadcrumbSchema
        items={[
          { name: 'Heim', url: BASE_URL },
          { name: 'Leikvellir', url: `${BASE_URL}/playgrounds` },
          { name: playground.title, url: `${BASE_URL}/playground/${playground.id}` }
        ]}
      />

      <PlaygroundDetailClient playgroundId={playgroundId} />
    </>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const playgroundId = parseInt(id);

  if (isNaN(playgroundId)) {
    return {
      title: getTranslation(defaultLocale, 'playground.notFound'),
    };
  }

  try {
    const playground = await api.playground.getById({ id: playgroundId });
    return generatePlaygroundMetadata({
      id: playground.id.toString(),
      name: playground.title,
      municipality: playground.municipality,
      latitude: playground.latitude,
      longitude: playground.longitude,
      images: playground.images,
    });
  } catch {
    return {
      title: getTranslation(defaultLocale, 'playground.notFound'),
    };
  }
}
