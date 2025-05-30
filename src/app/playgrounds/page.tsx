import { api } from "~/trpc/server";
import PlaygroundsList from "~/app/_components/playgrounds-list";

export default async function PlaygroundsPage() {
  const playgrounds = await api.playground.getAll();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">All Playgrounds</h1>
          <p className="text-muted-foreground">
            {/* TODO: better description */}
            Hér eru upplýsingar um leikvelli bla bla bla.
          </p>
        </div>

        <PlaygroundsList playgrounds={playgrounds || []} />
      </div>
    </div>
  );
}

export const metadata = {
  title: "All Playgrounds - Leikvellir",
  description:
    "Browse and discover playgrounds. Find the perfect playground for your family.",
};
