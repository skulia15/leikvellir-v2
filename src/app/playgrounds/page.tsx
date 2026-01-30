"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import PlaygroundsList from "~/app/_components/playgrounds-list";
import { PlaygroundsPageSkeleton } from "~/app/_components/playgrounds-page-skeleton";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useT } from "~/lib/i18n";

export default function PlaygroundsPage() {
  const { data: playgrounds, isLoading } = api.playground.getAll.useQuery();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const searchParams = useSearchParams();
  const initialMunicipality = searchParams.get("municipality") ?? undefined;
  const t = useT();

  // Show skeleton for at least 200ms for better UX
  useEffect(() => {
    if (playgrounds) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [playgrounds]);

  if (isLoading || showSkeleton || !playgrounds) {
    return <PlaygroundsPageSkeleton />;
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">{t('playground.allPlaygrounds')}</h1>
              <p className="text-muted-foreground">
                {t('playground.allPlaygroundsDescription')}
              </p>
            </div>
            <Link href="/create-playground">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('playground.createPlayground')}
              </Button>
            </Link>
          </div>
        </div>

        <PlaygroundsList playgrounds={playgrounds || []} initialMunicipality={initialMunicipality} />
      </div>
    </div>
  );
}
