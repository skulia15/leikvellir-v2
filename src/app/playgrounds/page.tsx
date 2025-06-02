"use client";

import { api } from "~/trpc/react";
import PlaygroundsList from "~/app/_components/playgrounds-list";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useT } from "~/lib/i18n";

export default function PlaygroundsPage() {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const t = useT();

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-6">
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

        <PlaygroundsList playgrounds={playgrounds || []} />
      </div>
    </div>
  );
}
