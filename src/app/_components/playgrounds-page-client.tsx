"use client";

import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import PlaygroundsList from "~/app/_components/playgrounds-list";
import { PlaygroundsPageSkeleton } from "~/app/_components/playgrounds-page-skeleton";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useT } from "~/lib/i18n";

export default function PlaygroundsPageClient() {
  // Prefetched and dehydrated by the server component, so this resolves from
  // the hydrated cache rather than issuing a second request for the same list.
  const { data: playgrounds, isLoading } = api.playground.getAll.useQuery();
  const searchParams = useSearchParams();
  const initialMunicipality = searchParams.get("municipality") ?? undefined;
  const t = useT();

  if (isLoading || !playgrounds) {
    return <PlaygroundsPageSkeleton />;
  }

  return (
    <div className="bg-background">
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{t('playground.allPlaygrounds')}</h1>
              <p className="text-muted-foreground">
                {t('playground.allPlaygroundsDescription')}
              </p>
            </div>
            <Button asChild className="flex items-center gap-2">
              <Link href="/create-playground">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('playground.createPlayground')}
              </Link>
            </Button>
          </div>
        </div>

        <PlaygroundsList playgrounds={playgrounds} initialMunicipality={initialMunicipality} />
      </div>
    </div>
  );
}
