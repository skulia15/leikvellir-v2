import { api } from "~/trpc/server";
import PlaygroundsList from "~/app/_components/playgrounds-list";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function PlaygroundsPage() {
  const playgrounds = await api.playground.getAll();

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">All Playgrounds</h1>
              <p className="text-muted-foreground">
                {/* TODO: better description */}
                Hér eru upplýsingar um leikvelli bla bla bla.
              </p>
            </div>
            <Link href="/create-playground">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Playground
              </Button>
            </Link>
          </div>
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
