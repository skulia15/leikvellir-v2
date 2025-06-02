"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import PlaygroundCard from "./playground-card";
import { type PlaygroundFilters } from "./playground-filters";
import { sortPlaygroundsByDistance, getPlaygroundDistance, type UserLocation } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";

interface PlaygroundListProps {
  filters: PlaygroundFilters;
  userLocation: UserLocation | null;
  selectedPlayground: Playground | null;
  onPlaygroundSelect: (playground: Playground | null) => void;
  visiblePlaygrounds?: (Playground & { distance?: number | null })[];
}

export default function PlaygroundList({
  filters,
  userLocation,
  selectedPlayground,
  onPlaygroundSelect,
  visiblePlaygrounds,
}: PlaygroundListProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const t = useT();

  const filteredAndSortedPlaygrounds = useMemo(() => {
    // Use visible playgrounds if provided, otherwise fall back to all playgrounds
    const playgroundsToUse = visiblePlaygrounds || playgrounds || [];

    if (visiblePlaygrounds) {
      // If using visible playgrounds from map, they're already filtered and sorted
      return visiblePlaygrounds;
    }

    // Original filtering logic for fallback
    const filtered = playgroundsToUse.filter((playground) => {
      if (filters.toddlerFriendly !== undefined && playground.toddlerFriendly !== filters.toddlerFriendly) {
        return false;
      }
      if (filters.publiclyAccessible !== undefined && playground.publiclyAccessible !== filters.publiclyAccessible) {
        return false;
      }
      return true;
    });

    // Sort by distance using shared utility
    return sortPlaygroundsByDistance(filtered, userLocation);
  }, [playgrounds, filters, userLocation, visiblePlaygrounds]);

  if (!playgrounds) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('playground.loadingPlaygrounds')}</p>
        </div>
      </div>
    );
  }

  if (filteredAndSortedPlaygrounds.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('playground.noPlaygroundsMatchingFilters')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {userLocation && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          {t('playground.sortedByDistance')}
        </div>
      )}
      {filteredAndSortedPlaygrounds.map((playground) => (
        <div
          key={playground.id}
          className={`cursor-pointer transition-colors ${selectedPlayground?.id === playground.id
            ? "bg-muted/50"
            : "hover:bg-muted/30"
            }`}
          onClick={() => onPlaygroundSelect(playground)}
        >
          <PlaygroundCard
            playground={playground}
            distance={playground.distance ?? getPlaygroundDistance(playground, userLocation)}
            showDistance={!!userLocation}
          />
        </div>
      ))}
    </div>
  );
}
