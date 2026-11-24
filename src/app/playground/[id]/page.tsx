import { cache } from "react";
import { notFound } from "next/navigation";
import PlaygroundDetailClient from "~/app/_components/playground-detail-client";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { HydrateClient, publicApi } from "~/trpc/server";
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

// ISR: rendered on first request, then served statically and regenerated at most every 5 min
// (mutations also purge via revalidatePath)
export const revalidate = 300;

// Empty list = no pages built at deploy time; each id is rendered on demand and cached
export function generateStaticParams() {
  return [];
}

// Public (session-less) lookup so the page stays cacheable: only approved playgrounds resolve.
const getPlaygroundById = cache(async (id: number) => {
  return publicApi.playground.getById({ id });
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
    // Not publicly visible. It may still be a pending/rejected playground its creator or an
    // admin can see, so let the client fetch it with the user's session; it renders the
    // not-found page itself if that fails too. (Metadata marks this noindex.)
    return (
      <HydrateClient>
        <PlaygroundDetailClient playgroundId={playgroundId} />
      </HydrateClient>
    );
  }

  // Nearby list is its own minimal query; the detail payload embeds its own
  // equipment, so no catalog or full getAll is needed on this page.
  void publicApi.playground.getNearby.prefetch({
    id: playground.id,
    latitude: playground.latitude,
    longitude: playground.longitude,
    limit: 3,
  });

  const BASE_URL = getBaseUrl();

  return (
    <>
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
