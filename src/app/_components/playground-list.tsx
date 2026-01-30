"use client";

import { useMemo, useEffect, useState } from "react";
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
  totalVisibleCount?: number;
  onClearFilters?: () => void;
}

export default function PlaygroundList({
  filters,
  userLocation,
  selectedPlayground,
  onPlaygroundSelect,
  visiblePlaygrounds,
  totalVisibleCount,
  onClearFilters,
}: PlaygroundListProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const t = useT();

  // Track playground IDs for smooth animations
  const [displayedPlaygrounds, setDisplayedPlaygrounds] = useState<(Playground & { distance?: number | null })[]>([]);
  const [exitingPlaygrounds, setExitingPlaygrounds] = useState<Set<number>>(new Set());

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

      // Accessible now filter: school grounds must pass school hours check,
      // non-school grounds use the publiclyAccessible flag
      if (filters.accessibleNow !== undefined && filters.accessibleNow) {
        const isCurrentlyAccessible = playground.isSchoolGround
          ? isSchoolGroundAccessible(playground.isSchoolGround)
          : playground.publiclyAccessible;

        if (!isCurrentlyAccessible) {
          return false;
        }
      }

      return true;
    });

    // Sort by distance using shared utility
    return sortPlaygroundsByDistance(filtered, userLocation);
  }, [playgrounds, filters, userLocation, visiblePlaygrounds]);

  // Handle playground list animations with staggered timing
  useEffect(() => {
    const currentIds = new Set(filteredAndSortedPlaygrounds.map(p => p.id));

    // Find playgrounds that need to be removed (exit animation)
    const playgroundsToRemove = displayedPlaygrounds.filter(p => !currentIds.has(p.id));

    if (playgroundsToRemove.length > 0) {
      // Start exit animation for removed playgrounds
      setExitingPlaygrounds(new Set(playgroundsToRemove.map(p => p.id)));

      // Remove them after animation completes (longer duration for smoother exit)
      setTimeout(() => {
        setDisplayedPlaygrounds(filteredAndSortedPlaygrounds);
        setExitingPlaygrounds(new Set());
      }, 300); // Increased from 200ms for smoother animation
    } else {
      // Update immediately for additions, let CSS handle enter animations
      setDisplayedPlaygrounds(filteredAndSortedPlaygrounds);
    }
  }, [filteredAndSortedPlaygrounds, displayedPlaygrounds]);

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

  if (displayedPlaygrounds.length === 0 && !exitingPlaygrounds.size) {
    const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);
    const isFilteredOut = hasActiveFilters && (totalVisibleCount ?? 0) > 0;

    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {isFilteredOut
              ? t('playground.noPlaygroundsMatchingFilters')
              : t('playground.noPlaygroundsInArea')}
          </p>
          {isFilteredOut && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t('forms.clearFilters')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {userLocation && (
        <div className="px-4 py-2.5 text-[11px] tracking-[0.08em] uppercase font-medium text-muted-foreground border-b border-border">
          {t('playground.sortedByDistance')}
        </div>
      )}
      <div className="divide-y divide-border">
        {displayedPlaygrounds.map((playground, index) => {
          const isExiting = exitingPlaygrounds.has(playground.id);
          const currentlyVisible = filteredAndSortedPlaygrounds.some(p => p.id === playground.id);
          const isNewItem = !exitingPlaygrounds.has(playground.id) && currentlyVisible;

          return (
            <div
              key={playground.id}
              className={`
                cursor-pointer hover:bg-accent/50 transition-all
                ${selectedPlayground?.id === playground.id
                  ? "bg-accent/60"
                  : ""
                }
                ${isExiting
                  ? "animate-out slide-out-to-left fade-out duration-300 ease-in-out pointer-events-none"
                  : isNewItem
                    ? "animate-in slide-in-from-right fade-in duration-400 ease-out"
                    : "opacity-100 transform-none"
                }
              `}
              style={{
                // Staggered animation delay for smoother appearance
                animationDelay: isNewItem ? `${index * 50}ms` : undefined,
                // Smooth transitions for hover and selection states
                transition: "all 200ms ease-in-out",
              }}
              onClick={() => !isExiting && onPlaygroundSelect(playground)}
            >
              <PlaygroundCard
                playground={playground}
                distance={playground.distance ?? getPlaygroundDistance(playground, userLocation)}
                showDistance={!!userLocation}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
