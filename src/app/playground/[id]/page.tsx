import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import PlaygroundDetail from "~/app/_components/playground-detail";

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
      title: "Playground Not Found",
    };
  }

  try {
    const playground = await api.playground.getById({ id: playgroundId });
    return {
      title: `${playground.title} - Leikvellir`,
      description: `Discover ${playground.title} playground in Iceland. ${
        playground.toddlerFriendly ? "Toddler-friendly" : ""
      } ${playground.publiclyAccessible ? "Publicly accessible" : ""} playground.`,
    };
  } catch (error) {
    return {
      title: "Playground Not Found",
    };
  }
}
