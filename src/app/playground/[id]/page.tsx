import { notFound } from "next/navigation";
import PlaygroundDetailClient from "~/app/_components/playground-detail-client";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";
import { api } from "~/trpc/server";

interface PlaygroundPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const playgroundId = parseInt(id);

  if (isNaN(playgroundId)) {
    notFound();
  }

  // Prefetch the data on the server for better performance
  try {
    void api.playground.getById.prefetch({ id: playgroundId });
  } catch {
    // If prefetch fails, let the client handle it
  }

  return <PlaygroundDetailClient playgroundId={playgroundId} />;
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
    return {
      title: `${playground.title} - Leiksvæði`,
      description: `${getTranslation(defaultLocale, 'navigation.map')} ${playground.title} ${getTranslation(defaultLocale, 'playground.title')} ${getTranslation(defaultLocale, 'footer.location')}. ${playground.toddlerFriendly ? getTranslation(defaultLocale, 'playground.toddlerFriendly') : ""
        } ${playground.publiclyAccessible ? getTranslation(defaultLocale, 'playground.publiclyAccessible') : ""} ${getTranslation(defaultLocale, 'playground.title')}.`,
    };
  } catch {
    return {
      title: getTranslation(defaultLocale, 'playground.notFound'),
    };
  }
}
