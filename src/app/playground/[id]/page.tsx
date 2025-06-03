import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import PlaygroundDetail from "~/app/_components/playground-detail";
import { getTranslation } from "~/lib/i18n/server";
import { defaultLocale } from "~/lib/i18n/config";

interface PlaygroundPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const playgroundId = parseInt(id);

  if (isNaN(playgroundId)) {
    notFound();
  }

  try {
    const playground = await api.playground.getById({ id: playgroundId });
    return <PlaygroundDetail playground={playground} />;
  } catch (error) {
    console.error("Failed to fetch playground:", error);
    notFound();
  }
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
