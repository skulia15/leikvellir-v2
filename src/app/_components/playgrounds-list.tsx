"use client";

import { MapPin, Navigation, SortAsc } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { type Playground, type EquipmentCategory, type MultilingualName } from "~/types";
import PlaygroundGridCard from "./playground-grid-card";
import EquipmentCategoryFilter from "./equipment-category-filter";
import { PlaygroundsListSkeleton } from "./playgrounds-page-skeleton";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, sortPlaygroundsByDistance } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";
import { isSchoolGroundAccessible } from "~/lib/school-hours";

interface PlaygroundsListProps {
  playgrounds: Playground[];
  isLoading?: boolean;
  initialMunicipality?: string;
}

type SortOption = "proximity" | "popularity" | "newest" | "name";

function hasEquipmentByName(playground: Playground, nameIs: string): boolean {
  return (
    playground.playgroundEquipment?.some((pe) => {
      const name = pe.equipment.name as string | MultilingualName;
      if (typeof name === "string") return name.toLowerCase() === nameIs.toLowerCase();
      return name.is?.toLowerCase() === nameIs.toLowerCase();
    }) ?? false
  );
}

export default function PlaygroundsList({ playgrounds, isLoading = false, initialMunicipality }: PlaygroundsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortedPlaygrounds, setSortedPlaygrounds] = useState<(Playground & { distance?: number })[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<EquipmentCategory>>(new Set());
  const [bouncyPillowActive, setBouncyPillowActive] = useState(false);
  const [footballFieldActive, setFootballFieldActive] = useState(false);
  const [openNowActive, setOpenNowActive] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(initialMunicipality ?? "__all__");
  const t = useT();

  const { userLocation, isLoading: locationLoading, permission, requestLocation } = useUserLocation();

  // Sort playgrounds based on selected option
  useEffect(() => {
    let sorted = [...playgrounds];

    switch (sortBy) {
      case "proximity":
        // Use shared utility for distance sorting
        sorted = sortPlaygroundsByDistance(playgrounds, userLocation);
        break;
      case "popularity":
        // Placeholder for popularity sorting - will use rating when implemented
        sorted = sorted.map(p => ({ ...p })).sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
        sorted = sorted.map(p => ({ ...p })).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "name":
        sorted = sorted.map(p => ({ ...p })).sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setSortedPlaygrounds(sorted);
  }, [sortBy, userLocation, playgrounds]);

  // Compute category counts from the full sorted list (stable counts)
  const categoryCounts = useMemo(() => {
    const counts = new Map<EquipmentCategory, number>();
    for (const pg of sortedPlaygrounds) {
      const categories = new Set(
        pg.playgroundEquipment?.map((pe) => pe.equipment.category) ?? [],
      );
      for (const cat of categories) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
    return counts;
  }, [sortedPlaygrounds]);

  // Count playgrounds with bouncy pillow (stable count from full list)
  const bouncyPillowCount = useMemo(() => {
    return sortedPlaygrounds.filter((pg) => hasEquipmentByName(pg, "Ærslabelgur")).length;
  }, [sortedPlaygrounds]);

  // Count playgrounds with football field (stable count from full list)
  const footballFieldCount = useMemo(() => {
    return sortedPlaygrounds.filter((pg) => hasEquipmentByName(pg, "Fótboltavöllur")).length;
  }, [sortedPlaygrounds]);

  // Count school ground playgrounds currently closed (for "open now" filter)
  // Uses the exact same predicate as the filter to ensure count matches
  const closedSchoolGroundCount = useMemo(() => {
    return sortedPlaygrounds.filter(
      (pg) => !isSchoolGroundAccessible(pg.isSchoolGround),
    ).length;
  }, [sortedPlaygrounds]);

  // Unique sorted municipalities for the dropdown filter
  const municipalities = useMemo(() => {
    const set = new Set<string>();
    for (const pg of playgrounds) {
      if (pg.municipality) set.add(pg.municipality);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "is"));
  }, [playgrounds]);

  // Filter by municipality, equipment categories (OR logic), bouncy pillow, and open now
  const filteredPlaygrounds = useMemo(() => {
    let result = sortedPlaygrounds;

    // Municipality filter
    if (selectedMunicipality !== "__all__") {
      result = result.filter((pg) => pg.municipality === selectedMunicipality);
    }

    // Equipment category filter (OR logic)
    if (activeCategories.size > 0) {
      result = result.filter((playground) =>
        playground.playgroundEquipment?.some((pe) =>
          activeCategories.has(pe.equipment.category),
        ),
      );
    }

    // Bouncy pillow filter
    if (bouncyPillowActive) {
      result = result.filter((pg) => hasEquipmentByName(pg, "Ærslabelgur"));
    }

    // Football field filter
    if (footballFieldActive) {
      result = result.filter((pg) => hasEquipmentByName(pg, "Fótboltavöllur"));
    }

    // Open now filter — hide school grounds that are currently closed
    if (openNowActive) {
      result = result.filter((pg) => isSchoolGroundAccessible(pg.isSchoolGround));
    }

    return result;
  }, [sortedPlaygrounds, selectedMunicipality, activeCategories, bouncyPillowActive, footballFieldActive, openNowActive]);

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
    const url = new URL(window.location.href);
    if (value === "__all__") {
      url.searchParams.delete("municipality");
    } else {
      url.searchParams.set("municipality", value);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleClearAllCategories = useCallback(() => {
    setActiveCategories(new Set());
    setBouncyPillowActive(false);
    setFootballFieldActive(false);
    setOpenNowActive(false);
    setSelectedMunicipality("__all__");
    const url = new URL(window.location.href);
    url.searchParams.delete("municipality");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const hasActiveFilters = selectedMunicipality !== "__all__" || activeCategories.size > 0 || bouncyPillowActive || footballFieldActive || openNowActive;

  // Show skeleton while loading
  if (isLoading) {
    return <PlaygroundsListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Sorting Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('playground.sortBy')}</span>
              </div>
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('playground.newestFirst')}</SelectItem>
                  <SelectItem value="name">{t('playground.nameAZ')}</SelectItem>
                  <SelectItem value="proximity" disabled={!userLocation}>
                    {t('playground.distanceFromYou')} {!userLocation && t('playground.locationNeeded')}
                  </SelectItem>
                  <SelectItem value="popularity" disabled>
                    {t('playground.popularity')} {t('playground.comingSoon')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Municipality Filter */}
              {municipalities.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
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

            {/* Location Permission */}
            {permission === "prompt" && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocation}
                disabled={locationLoading}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                {locationLoading ? t('playground.finding') : t('playground.enableLocationSorting')}
              </Button>
            )}

            {userLocation && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
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
            <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium font-display">
              {hasActiveFilters
                ? t('playground.noPlaygroundsInCategory')
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
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredPlaygrounds.map((playground, index) => (
              <motion.div
                key={playground.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index < 9 ? index * 0.04 : 0 }}
              >
                <Link
                  href={`/playground/${playground.id}`}
                  className="block"
                >
                  <PlaygroundGridCard
                    playground={playground}
                    distance={playground.distance || getPlaygroundDistance(playground, userLocation)}
                    showDistance={!!userLocation}
                  />
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
