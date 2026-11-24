"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import PlaygroundCard from "./playground-card";
import { type PlaygroundFilters } from "./playground-filters";
import {
  sortPlaygroundsByDistance,
  getPlaygroundDistance,
  type UserLocation,
} from "~/lib/geo-utils";
import { useEquipmentLookup } from "~/lib/hooks/use-equipment-lookup";
import { isAfterSchoolHours } from "~/lib/school-hours";
import {
  hasActiveMapFilters,
  hasEquipmentByName,
  matchesMapFilters,
} from "~/lib/search-utils";
import { useT } from "~/lib/i18n";

/** Only the first few new rows stagger in; the rest appear at once. */
const MAX_STAGGERED_ITEMS = 8;

interface PlaygroundListProps {
  filters: PlaygroundFilters;
  userLocation: UserLocation | null;
  selectedPlayground: Playground | null;
  onPlaygroundSelect: (playground: Playground | null) => void;
  visiblePlaygrounds?: (Playground & { distance?: number | null })[];
  totalVisibleCount?: number;
  onClearFilters?: () => void;
  scrollToSelectedSeq?: number;
}

export default function PlaygroundList({
  filters,
  userLocation,
  selectedPlayground,
  onPlaygroundSelect,
  visiblePlaygrounds,
  totalVisibleCount,
  onClearFilters,
  scrollToSelectedSeq = 0,
}: PlaygroundListProps) {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();
  const equipmentLookup = useEquipmentLookup();
  const t = useT();

  const filteredAndSortedPlaygrounds = useMemo(() => {
    // Use visible playgrounds if provided, otherwise fall back to all playgrounds
    if (visiblePlaygrounds) {
      // If using visible playgrounds from map, they're already filtered and sorted
      return visiblePlaygrounds;
    }

    const playgroundsToUse = playgrounds || [];
    const filtered = playgroundsToUse.filter((playground) =>
      matchesMapFilters(playground, filters, equipmentLookup),
    );

    // Sort by distance using shared utility
    return sortPlaygroundsByDistance(filtered, userLocation);
  }, [playgrounds, filters, userLocation, visiblePlaygrounds, equipmentLookup]);

  // Track playground IDs for smooth animations. Initialized from the current
  // list so the SSR HTML contains real playground links, not an empty list.
  const [displayedPlaygrounds, setDisplayedPlaygrounds] = useState<
    (Playground & { distance?: number | null })[]
  >(() => filteredAndSortedPlaygrounds);
  const [exitingPlaygrounds, setExitingPlaygrounds] = useState<Set<number>>(
    new Set(),
  );
  const displayedRef = useRef<(Playground & { distance?: number | null })[]>(
    filteredAndSortedPlaygrounds,
  );
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const lastScrolledSeqRef = useRef<number>(0);

  // O(1) membership for the render loop (was an O(N) .some() per row).
  const currentIdSet = useMemo(
    () => new Set(filteredAndSortedPlaygrounds.map((p) => p.id)),
    [filteredAndSortedPlaygrounds],
  );

  // Resolved once here so each memoized card doesn't build its own lookup.
  const bouncyPillowIds = useMemo(() => {
    const ids = new Set<number>();
    for (const p of displayedPlaygrounds) {
      if (hasEquipmentByName(p, "Ærslabelgur", equipmentLookup)) ids.add(p.id);
    }
    return ids;
  }, [displayedPlaygrounds, equipmentLookup]);

  // Same answer for every school ground, so check once per render.
  const schoolAccessibleNow = isAfterSchoolHours();

  // Handle playground list animations with staggered timing.
  // The currently-rendered list is mirrored in a ref so this effect depends only
  // on its input; depending on `displayedPlaygrounds` re-ran it on its own output.
  useEffect(() => {
    const playgroundsToRemove = displayedRef.current.filter(
      (p) => !currentIdSet.has(p.id),
    );

    if (playgroundsToRemove.length === 0) {
      // Update immediately for additions, let CSS handle enter animations
      displayedRef.current = filteredAndSortedPlaygrounds;
      setDisplayedPlaygrounds(filteredAndSortedPlaygrounds);
      return;
    }

    // Start exit animation, then swap in the new list once it completes
    setExitingPlaygrounds(new Set(playgroundsToRemove.map((p) => p.id)));
    const timer = setTimeout(() => {
      displayedRef.current = filteredAndSortedPlaygrounds;
      setDisplayedPlaygrounds(filteredAndSortedPlaygrounds);
      setExitingPlaygrounds(new Set());
    }, 300);

    return () => clearTimeout(timer);
  }, [filteredAndSortedPlaygrounds, currentIdSet]);

  // Scroll the selected card into view when a map pin (or deep link) selects a playground
  useEffect(() => {
    if (
      !selectedPlayground ||
      scrollToSelectedSeq === 0 ||
      scrollToSelectedSeq === lastScrolledSeqRef.current
    ) {
      return;
    }

    const element = itemRefs.current.get(selectedPlayground.id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      lastScrolledSeqRef.current = scrollToSelectedSeq;
    }
  }, [selectedPlayground, scrollToSelectedSeq, displayedPlaygrounds]);

  if (!playgrounds) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {t("playground.loadingPlaygrounds")}
          </p>
        </div>
      </div>
    );
  }

  if (displayedPlaygrounds.length === 0 && !exitingPlaygrounds.size) {
    const hasActiveFilters = hasActiveMapFilters(filters);
    const isFilteredOut = hasActiveFilters && (totalVisibleCount ?? 0) > 0;

    return (
      <div className="flex h-32 items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {isFilteredOut
              ? t("playground.noPlaygroundsMatchingFilters")
              : t("playground.noPlaygroundsInArea")}
          </p>
          {isFilteredOut && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t("forms.clearFilters")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {userLocation && (
        <div className="px-4 py-2.5 text-xs tracking-[0.08em] uppercase font-medium text-muted-foreground border-b border-border">
          {t("playground.sortedByDistance")}
        </div>
      )}
      <ul className="divide-y divide-border">
        {displayedPlaygrounds.map((playground, index) => {
          const isExiting = exitingPlaygrounds.has(playground.id);
          const currentlyVisible = currentIdSet.has(playground.id);
          const isNewItem = !isExiting && currentlyVisible;
          const isSelected = selectedPlayground?.id === playground.id;

          return (
            <li
              key={playground.id}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(playground.id, node);
                } else {
                  itemRefs.current.delete(playground.id);
                }
              }}
              data-playground-id={playground.id}
              className={`
                flex items-stretch transition-colors
                ${isSelected ? "bg-accent/60 ring-1 ring-inset ring-primary/25" : "hover:bg-accent/50"}
                ${
                  isExiting
                    ? "animate-out slide-out-to-left fade-out duration-300 ease-in-out pointer-events-none"
                    : isNewItem
                      ? "animate-in slide-in-from-right fade-in duration-400 ease-out"
                      : "opacity-100 transform-none"
                }
              `}
              style={{
                // Capped stagger so long lists don't take seconds to appear
                animationDelay:
                  isNewItem && index < MAX_STAGGERED_ITEMS
                    ? `${index * 30}ms`
                    : undefined,
              }}
            >
              {/* Primary action: show this playground on the map. A real button,
                  so it is reachable by keyboard and announces its pressed state. */}
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => !isExiting && onPlaygroundSelect(playground)}
                className="flex-1 min-w-0 text-left cursor-pointer rounded-lg"
              >
                <PlaygroundCard
                  playground={playground}
                  distance={
                    playground.distance ??
                    getPlaygroundDistance(playground, userLocation)
                  }
                  showDistance={!!userLocation}
                  hasBouncyPillow={bouncyPillowIds.has(playground.id)}
                  isSchoolAccessibleNow={schoolAccessibleNow}
                />
              </button>
              {/* Sibling (never nested) link: the crawlable route to the detail
                  page, and a 44px target for thumbs. */}
              <Link
                href={`/playground/${playground.id}`}
                aria-label={`${t("playground.viewDetails")}: ${playground.title}`}
                className="flex w-11 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
