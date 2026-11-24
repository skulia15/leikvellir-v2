"use client";

import { MapPin, Navigation, Search, SortAsc, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { type Playground, type EquipmentCategory } from "~/types";
import {
  resolveEquipment,
  useEquipmentLookup,
} from "~/lib/hooks/use-equipment-lookup";
import PlaygroundGridCard from "./playground-grid-card";
import EquipmentCategoryFilter from "./equipment-category-filter";
import { PlaygroundsListSkeleton } from "./playgrounds-page-skeleton";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, sortPlaygroundsByDistance } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";
import { isAfterSchoolHours } from "~/lib/school-hours";
import {
  compareIcelandic,
  hasEquipmentByName,
  matchesPlaygroundSearch,
} from "~/lib/search-utils";
import {
  type ListSortOption,
  parsePlaygroundsListParams,
  recordInAppNavigation,
  replaceUrlSearchParams,
  serializePlaygroundsListParams,
} from "~/lib/url-state";

const PAGE_SIZE = 24;
/** Roughly the first two rows on desktop — the cards likely to be the LCP element. */
const PRIORITY_CARD_COUNT = 6;

interface PlaygroundsListProps {
  playgrounds: Playground[];
  isLoading?: boolean;
  initialMunicipality?: string;
}

export default function PlaygroundsList({
  playgrounds,
  isLoading = false,
  initialMunicipality,
}: PlaygroundsListProps) {
  const equipmentLookup = useEquipmentLookup();
  const { userLocation, isLoading: locationLoading, requestLocation } = useUserLocation();
  const searchParams = useSearchParams();
  const t = useT();

  const initialUrlState = useMemo(() => {
    const parsed = parsePlaygroundsListParams(searchParams);
    if (parsed.municipality === "__all__" && initialMunicipality) {
      parsed.municipality = initialMunicipality;
    }
    return parsed;
    // Only compute initial snapshot on mount; external URL changes are handled via effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default to URL sort if provided, else proximity when location available, otherwise newest
  const [sortBy, setSortBy] = useState<ListSortOption>(
    initialUrlState.sortBy ?? (userLocation ? "proximity" : "newest"),
  );
  const [hasExplicitSort, setHasExplicitSort] = useState<boolean>(
    initialUrlState.sortBy !== null,
  );
  const [hasSetInitialSort, setHasSetInitialSort] = useState<boolean>(
    initialUrlState.sortBy !== null,
  );
  const [searchQuery, setSearchQuery] = useState<string>(initialUrlState.search);
  const [activeCategories, setActiveCategories] = useState<Set<EquipmentCategory>>(
    () => new Set(initialUrlState.activeCategories),
  );
  const [bouncyPillowActive, setBouncyPillowActive] = useState<boolean>(
    initialUrlState.bouncyPillow,
  );
  const [footballFieldActive, setFootballFieldActive] = useState<boolean>(
    initialUrlState.footballField,
  );
  const [openNowActive, setOpenNowActive] = useState<boolean>(
    initialUrlState.openNow,
  );
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(
    initialUrlState.municipality,
  );
  const lastWrittenQueryRef = useRef<string | null>(null);

  // Record in-app navigation so playground detail Back button knows history is in-app
  useEffect(() => {
    recordInAppNavigation("/playgrounds");
  }, []);

  // Switch to proximity sorting when location becomes available (only once, if user/URL didn't set sort)
  useEffect(() => {
    if (userLocation && !hasSetInitialSort && !hasExplicitSort) {
      setSortBy("proximity");
      setHasSetInitialSort(true);
    }
  }, [userLocation, hasSetInitialSort, hasExplicitSort]);

  // Sync state to URL search params cleanly via replaceState
  useEffect(() => {
    const params = serializePlaygroundsListParams({
      search: searchQuery,
      municipality: selectedMunicipality,
      sortBy: hasExplicitSort ? sortBy : null,
      activeCategories: Array.from(activeCategories),
      bouncyPillow: bouncyPillowActive,
      footballField: footballFieldActive,
      openNow: openNowActive,
    });
    const nextQuery = params.toString();
    lastWrittenQueryRef.current = nextQuery;
    replaceUrlSearchParams(params);
  }, [
    searchQuery,
    selectedMunicipality,
    sortBy,
    hasExplicitSort,
    activeCategories,
    bouncyPillowActive,
    footballFieldActive,
    openNowActive,
  ]);

  // React to external URL navigation (e.g. Back/Forward or clicking a filtered link)
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (lastWrittenQueryRef.current === searchParamsString) {
      return;
    }
    const parsed = parsePlaygroundsListParams(searchParams);
    setSearchQuery(parsed.search);
    setSelectedMunicipality(parsed.municipality);
    setActiveCategories(new Set(parsed.activeCategories));
    setBouncyPillowActive(parsed.bouncyPillow);
    setFootballFieldActive(parsed.footballField);
    setOpenNowActive(parsed.openNow);
    if (parsed.sortBy) {
      setSortBy(parsed.sortBy);
      setHasExplicitSort(true);
      setHasSetInitialSort(true);
    } else {
      setHasExplicitSort(false);
      setSortBy(userLocation ? "proximity" : "newest");
    }
  }, [searchParams, searchParamsString, userLocation]);

  // Sort playgrounds based on selected option
  const sortedPlaygrounds = useMemo<(Playground & { distance?: number })[]>(() => {
    switch (sortBy) {
      case "proximity":
        return sortPlaygroundsByDistance(playgrounds, userLocation);
      case "newest":
        return [...playgrounds].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case "name":
        return [...playgrounds].sort((a, b) => compareIcelandic(a.title, b.title));
    }
  }, [sortBy, userLocation, playgrounds]);

  // Category counts and the bouncy-pillow / football-field id sets in one pass
  // over the full list (stable counts). The sets also feed the filters and the
  // cards, so equipment is resolved once per playground rather than per use.
  const { categoryCounts, bouncyPillowIds, footballFieldIds } = useMemo(() => {
    const counts = new Map<EquipmentCategory, number>();
    const bouncy = new Set<number>();
    const football = new Set<number>();
    for (const pg of playgrounds) {
      const categories = new Set(
        resolveEquipment(pg, equipmentLookup).map((item) => item.category),
      );
      for (const cat of categories) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
      if (hasEquipmentByName(pg, "Ærslabelgur", equipmentLookup)) bouncy.add(pg.id);
      if (hasEquipmentByName(pg, "Fótboltavöllur", equipmentLookup)) football.add(pg.id);
    }
    return { categoryCounts: counts, bouncyPillowIds: bouncy, footballFieldIds: football };
  }, [playgrounds, equipmentLookup]);

  const bouncyPillowCount = bouncyPillowIds.size;
  const footballFieldCount = footballFieldIds.size;

  // School hours are the same for every school ground, so check once per render
  const schoolAccessibleNow = isAfterSchoolHours();

  // Count school ground playgrounds currently closed (for "open now" filter)
  // Uses the exact same predicate as the filter to ensure count matches
  const closedSchoolGroundCount = useMemo(() => {
    if (schoolAccessibleNow) return 0;
    return playgrounds.filter((pg) => pg.isSchoolGround).length;
  }, [playgrounds, schoolAccessibleNow]);

  // Unique sorted municipalities for the dropdown filter
  const municipalities = useMemo(() => {
    const set = new Set<string>();
    for (const pg of playgrounds) {
      if (pg.municipality) set.add(pg.municipality);
    }
    return Array.from(set).sort(compareIcelandic);
  }, [playgrounds]);

  // Filter by search, municipality, equipment categories (OR logic), bouncy pillow, football field, and open now
  const filteredPlaygrounds = useMemo(() => {
    let result = sortedPlaygrounds;

    // Diacritic-insensitive search filter (title + municipality)
    if (searchQuery.trim().length > 0) {
      result = result.filter((pg) => matchesPlaygroundSearch(pg, searchQuery));
    }

    // Municipality filter
    if (selectedMunicipality !== "__all__") {
      result = result.filter((pg) => pg.municipality === selectedMunicipality);
    }

    // Equipment category filter (OR logic)
    if (activeCategories.size > 0) {
      result = result.filter((playground) =>
        resolveEquipment(playground, equipmentLookup).some((item) =>
          activeCategories.has(item.category),
        ),
      );
    }

    // Bouncy pillow filter
    if (bouncyPillowActive) {
      result = result.filter((pg) => bouncyPillowIds.has(pg.id));
    }

    // Football field filter
    if (footballFieldActive) {
      result = result.filter((pg) => footballFieldIds.has(pg.id));
    }

    // Open now filter — hide school grounds that are currently closed
    if (openNowActive && !schoolAccessibleNow) {
      result = result.filter((pg) => !pg.isSchoolGround);
    }

    return result;
  }, [
    sortedPlaygrounds,
    searchQuery,
    selectedMunicipality,
    activeCategories,
    bouncyPillowActive,
    footballFieldActive,
    openNowActive,
    equipmentLookup,
    bouncyPillowIds,
    footballFieldIds,
    schoolAccessibleNow,
  ]);

  // Pagination resets whenever sort, search or filters change. Derived from a
  // key rather than reset in an effect, so a filter change never renders the
  // previous (possibly large) page count first.
  const paginationKey = JSON.stringify([
    sortBy,
    searchQuery,
    selectedMunicipality,
    Array.from(activeCategories).sort(),
    bouncyPillowActive,
    footballFieldActive,
    openNowActive,
  ]);
  const [pagination, setPagination] = useState({ key: paginationKey, count: PAGE_SIZE });
  const visibleCount = pagination.key === paginationKey ? pagination.count : PAGE_SIZE;
  const visiblePlaygrounds = useMemo(
    () => filteredPlaygrounds.slice(0, visibleCount),
    [filteredPlaygrounds, visibleCount],
  );
  const remainingCount = filteredPlaygrounds.length - visiblePlaygrounds.length;

  const handleLoadMore = useCallback(() => {
    setPagination({ key: paginationKey, count: visibleCount + PAGE_SIZE });
  }, [paginationKey, visibleCount]);

  const handleToggleCategory = useCallback((category: EquipmentCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const handleToggleBouncyPillow = useCallback(() => {
    setBouncyPillowActive((prev) => !prev);
  }, []);

  const handleToggleFootballField = useCallback(() => {
    setFootballFieldActive((prev) => !prev);
  }, []);

  const handleToggleOpenNow = useCallback(() => {
    setOpenNowActive((prev) => !prev);
  }, []);

  const handleMunicipalityChange = useCallback((value: string) => {
    setSelectedMunicipality(value);
  }, []);

  const handleSortChange = useCallback(
    (value: ListSortOption) => {
      setSortBy(value);
      setHasExplicitSort(true);
      setHasSetInitialSort(true);
      // Request location if user selects proximity sort without location
      if (value === "proximity" && !userLocation) {
        requestLocation();
      }
    },
    [userLocation, requestLocation],
  );

  const handleClearAllCategories = useCallback(() => {
    setSearchQuery("");
    setActiveCategories(new Set());
    setBouncyPillowActive(false);
    setFootballFieldActive(false);
    setOpenNowActive(false);
    setSelectedMunicipality("__all__");
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedMunicipality !== "__all__" ||
    activeCategories.size > 0 ||
    bouncyPillowActive ||
    footballFieldActive ||
    openNowActive;

  // Show skeleton while loading
  if (isLoading) {
    return <PlaygroundsListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Search & Sorting Controls */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("playground.searchPlaceholder")}
              aria-label={t("playground.searchPlaceholder")}
              className="pl-10 pr-9"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={t("common.close")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">{t('playground.sortBy')}</span>
              </div>
              <Select
                value={sortBy}
                onValueChange={(value) => handleSortChange(value as ListSortOption)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('playground.newestFirst')}</SelectItem>
                  <SelectItem value="name">{t('playground.nameAZ')}</SelectItem>
                  <SelectItem value="proximity">
                    {t('playground.distanceFromYou')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Municipality Filter */}
              {municipalities.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm font-medium">{t('playground.municipality')}</span>
                  </div>
                  <Select
                    value={selectedMunicipality}
                    onValueChange={handleMunicipalityChange}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder={t('playground.selectMunicipality')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">
                        {t('playground.allMunicipalities')}
                      </SelectItem>
                      {municipalities.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Location Permission - show button unless location is available */}
            {!userLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocation}
                disabled={locationLoading}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                {locationLoading ? t('playground.finding') : t('playground.enableLocationSorting')}
              </Button>
            )}

            {userLocation && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {t('playground.locationEnabled')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Category Filters */}
      <EquipmentCategoryFilter
        activeCategories={activeCategories}
        onToggleCategory={handleToggleCategory}
        bouncyPillowActive={bouncyPillowActive}
        onToggleBouncyPillow={handleToggleBouncyPillow}
        bouncyPillowCount={bouncyPillowCount}
        footballFieldActive={footballFieldActive}
        onToggleFootballField={handleToggleFootballField}
        footballFieldCount={footballFieldCount}
        openNowActive={openNowActive}
        onToggleOpenNow={handleToggleOpenNow}
        closedSchoolGroundCount={closedSchoolGroundCount}
        onClearAll={handleClearAllCategories}
        categoryCounts={categoryCounts}
      />

      {/* Playgrounds Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters
            ? t('playground.showingFiltered', {
                filtered: filteredPlaygrounds.length,
                total: sortedPlaygrounds.length,
              })
            : `${t('playground.showing')} ${t('playground.playgroundsCount', { count: sortedPlaygrounds.length })}`}
        </p>
        {sortBy === "proximity" && userLocation && (
          <p className="text-sm text-muted-foreground">
            {t('playground.sortedByDistance')}
          </p>
        )}
      </div>

      {/* Playgrounds Grid */}
      {filteredPlaygrounds.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-medium font-display">
              {hasActiveFilters
                ? t('playground.noPlaygroundsMatchingFilters')
                : t('playground.noPlaygroundsFound')}
            </h3>
            {!hasActiveFilters && (
              <p className="text-muted-foreground">
                {t('playground.beFirstToAdd')}
              </p>
            )}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllCategories}
                className="mt-4"
              >
                {t('playground.clearAllFilters')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {visiblePlaygrounds.map((playground, index) => (
              <Link
                key={playground.id}
                href={`/playground/${playground.id}`}
                className="block"
              >
                <PlaygroundGridCard
                  playground={playground}
                  distance={playground.distance ?? getPlaygroundDistance(playground, userLocation)}
                  showDistance={!!userLocation}
                  priority={index < PRIORITY_CARD_COUNT}
                  hasBouncyPillow={bouncyPillowIds.has(playground.id)}
                />
              </Link>
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                className="min-w-[220px]"
              >
                {t("playground.loadMore", { remaining: remainingCount })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
