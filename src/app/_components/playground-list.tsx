"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import PlaygroundCard from "./playground-card";
import { type PlaygroundFilters } from "./playground-filters";
import { sortPlaygroundsByDistance, getPlaygroundDistance, type UserLocation } from "~/lib/geo-utils";
import { isSchoolGroundAccessible } from "~/lib/school-hours";
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
      // Toddler friendly filter
      if (filters.toddlerFriendly !== undefined && playground.toddlerFriendly !== filters.toddlerFriendly) {
        return false;
      }
      
      // Publicly accessible filter
      if (filters.publiclyAccessible !== undefined && playground.publiclyAccessible !== filters.publiclyAccessible) {
        return false;
      }
      
      // Accessible now filter (publicly accessible OR school grounds that are currently accessible)
      if (filters.accessibleNow !== undefined && filters.accessibleNow) {
        const isCurrentlyAccessible = 
          playground.publiclyAccessible || 
          (playground.isSchoolGround && isSchoolGroundAccessible(playground.isSchoolGround));
        
        if (!isCurrentlyAccessible) {
          return false;
        }
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
    <div className="">
      {userLocation && (
        <div className="px-4 py-3 text-xs text-muted-foreground border-b bg-muted/30">
          {t('playground.sortedByDistance')}
        </div>
      )}
      <div className="divide-y divide-border">
        {filteredAndSortedPlaygrounds.map((playground) => (
          <div
            key={playground.id}
            className={`cursor-pointer transition-all duration-200 ease-in-out hover:bg-muted/50 ${selectedPlayground?.id === playground.id
              ? "bg-muted/50"
              : ""
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
    </div>
  );
}
