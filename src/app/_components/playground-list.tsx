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

      // Accessible now filter (publicly accessible OR school grounds that are currently accessible)
      if (filters.accessibleNow !== undefined && filters.accessibleNow) {
        const isCurrentlyAccessible =
          playground.publiclyAccessible ||
          (playground.isSchoolGround && isSchoolGroundAccessible(playground.isSchoolGround));

        if (!isCurrentlyAccessible) {
          return false;
        }
      }

      // Equipment filters
      if (filters.hasFootballField && !playground.playgroundEquipment?.some(pe => {
        const isName = pe.equipment.name?.is?.toLowerCase() || '';
        const enName = pe.equipment.name?.en?.toLowerCase() || '';
        return isName.includes('fótbolt') || enName.includes('football') || enName.includes('soccer');
      })) {
        return false;
      }

      if (filters.hasJumpingPillow && !playground.playgroundEquipment?.some(pe => {
        const isName = pe.equipment.name?.is?.toLowerCase() || '';
        const enName = pe.equipment.name?.en?.toLowerCase() || '';
        return isName.includes('ærslabelgur') || enName.includes('jumping pillow');
      })) {
        return false;
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
        {displayedPlaygrounds.map((playground, index) => {
          const isExiting = exitingPlaygrounds.has(playground.id);
          const currentlyVisible = filteredAndSortedPlaygrounds.some(p => p.id === playground.id);
          const isNewItem = !exitingPlaygrounds.has(playground.id) && currentlyVisible;

          return (
            <div
              key={playground.id}
              className={`
                cursor-pointer hover:bg-muted/50
                ${selectedPlayground?.id === playground.id
                  ? "bg-muted/50"
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
                transition: "background-color 150ms ease-in-out",
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
