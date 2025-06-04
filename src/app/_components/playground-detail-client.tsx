"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import PlaygroundDetail from "./playground-detail";
import { PlaygroundDetailSkeleton } from "./playground-detail-skeleton";
import { notFound } from "next/navigation";

interface PlaygroundDetailClientProps {
  playgroundId: number;
}

export default function PlaygroundDetailClient({ playgroundId }: PlaygroundDetailClientProps) {
  const [showSkeleton, setShowSkeleton] = useState(true);

  const { data: playground, isLoading, error } = api.playground.getById.useQuery(
    { id: playgroundId },
    {
      retry: false,
    }
  );

  // Show skeleton for at least 200ms for better UX
  useEffect(() => {
    if (playground) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [playground]);

  if (error) {
    notFound();
  }

  if (isLoading || showSkeleton || !playground) {
    return <PlaygroundDetailSkeleton />;
  }

  return <PlaygroundDetail playground={playground} />;
}
