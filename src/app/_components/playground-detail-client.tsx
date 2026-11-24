"use client";

import { api, type RouterOutputs } from "~/trpc/react";
import PlaygroundDetail from "./playground-detail";
import { PlaygroundDetailSkeleton } from "./playground-detail-skeleton";
import { notFound } from "next/navigation";

interface PlaygroundDetailClientProps {
  playgroundId: number;
  initialPlayground?: RouterOutputs["playground"]["getById"];
}

export default function PlaygroundDetailClient({
  playgroundId,
  initialPlayground,
}: PlaygroundDetailClientProps) {
  const { data: playground, isLoading, error } = api.playground.getById.useQuery(
    { id: playgroundId },
    {
      initialData: initialPlayground,
      retry: false,
    },
  );

  if (error) {
    notFound();
  }

  if (isLoading || !playground) {
    return <PlaygroundDetailSkeleton />;
  }

  return <PlaygroundDetail playground={playground} />;
}
