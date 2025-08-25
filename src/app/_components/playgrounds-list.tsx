"use client";

import { MapPin, Navigation, SortAsc, Filter, Map } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Checkbox } from "~/components/ui/checkbox";
import { type Playground } from "~/types";
import PlaygroundCard from "./playground-card";
import { PlaygroundsListSkeleton } from "./playgrounds-page-skeleton";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, sortPlaygroundsByDistance } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";

interface PlaygroundsListProps {
  playgrounds: Playground[];
  isLoading?: boolean;
}

type SortOption = "proximity" | "popularity" | "newest" | "name";

export default function PlaygroundsList({ playgrounds, isLoading = false }: PlaygroundsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortedPlaygrounds, setSortedPlaygrounds] = useState<(Playground & { distance?: number })[]>([]);
  const [filters, setFilters] = useState({
    toddlerFriendly: false,
    publiclyAccessible: false,
    hasFootballField: false,
    hasJumpingPillow: false,
  });
  const t = useT();

  const { userLocation, isLoading: locationLoading, permission, requestLocation } = useUserLocation();

  // Filter and sort playgrounds based on selected options
  useEffect(() => {
    let filtered = [...playgrounds];

    // Apply filters
    if (filters.toddlerFriendly) {
      filtered = filtered.filter(p => p.toddlerFriendly);
    }
    if (filters.publiclyAccessible) {
      filtered = filtered.filter(p => p.publiclyAccessible);
    }
    if (filters.hasFootballField) {
      filtered = filtered.filter(p => {
        // Check if playground has football field equipment
        return p.playgroundEquipment?.some(pe => {
          const isName = pe.equipment.name?.is?.toLowerCase() || '';
          const enName = pe.equipment.name?.en?.toLowerCase() || '';
          
          return isName.includes('fótbolt') ||
                 enName.includes('football') ||
                 enName.includes('soccer');
        });
      });
    }
    if (filters.hasJumpingPillow) {
      filtered = filtered.filter(p => {
        // Check if playground has jumping pillow equipment (ærslabelgur)
        return p.playgroundEquipment?.some(pe => {
          const isName = pe.equipment.name?.is?.toLowerCase() || '';
          const enName = pe.equipment.name?.en?.toLowerCase() || '';

          return isName.includes('ærslabelgur') ||
            enName.includes('jumping pillow');
        });
      });
    }

    // Sort filtered results
    let sorted = [...filtered];
    switch (sortBy) {
      case "proximity":
        sorted = sortPlaygroundsByDistance(filtered, userLocation);
        break;
      case "popularity":
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
  }, [sortBy, userLocation, playgrounds, filters]);

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
            <div className="flex items-center gap-4">
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('playground.filters')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="toddler-friendly"
                  checked={filters.toddlerFriendly}
                  onCheckedChange={(checked) =>
                    setFilters(prev => ({ ...prev, toddlerFriendly: !!checked }))
                  }
                />
                <label
                  htmlFor="toddler-friendly"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Hentar ungabörnum
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="publicly-accessible"
                  checked={filters.publiclyAccessible}
                  onCheckedChange={(checked) =>
                    setFilters(prev => ({ ...prev, publiclyAccessible: !!checked }))
                  }
                />
                <label
                  htmlFor="publicly-accessible"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Aðgengilegt núna
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-football"
                  checked={filters.hasFootballField}
                  onCheckedChange={(checked) =>
                    setFilters(prev => ({ ...prev, hasFootballField: !!checked }))
                  }
                />
                <label
                  htmlFor="has-football"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Fótboltavöllur
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-jumping-pillow"
                  checked={filters.hasJumpingPillow}
                  onCheckedChange={(checked) =>
                    setFilters(prev => ({ ...prev, hasJumpingPillow: !!checked }))
                  }
                />
                <label
                  htmlFor="has-jumping-pillow"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Ærslabelgur
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center">
              {/* Clear filters button */}
              {(filters.toddlerFriendly || filters.publiclyAccessible || filters.hasFootballField || filters.hasJumpingPillow) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    toddlerFriendly: false,
                    publiclyAccessible: false,
                    hasFootballField: false,
                    hasJumpingPillow: false,
                  })}
                >
                  {t('playground.clearFilters')}
                </Button>
              )}
              
              {/* View on map button */}
              <Link
                href={{
                  pathname: '/',
                  query: {
                    ...(filters.toddlerFriendly && { toddlerFriendly: 'true' }),
                    ...(filters.publiclyAccessible && { publiclyAccessible: 'true' }),
                    ...(filters.hasFootballField && { hasFootballField: 'true' }),
                    ...(filters.hasJumpingPillow && { hasJumpingPillow: 'true' }),
                  }
                }}
                className="ml-auto"
              >
                <Button variant="default" size="sm" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {t('playground.viewOnMap')}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playgrounds Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('playground.showing')} {t('playground.playgroundsCount', { count: sortedPlaygrounds.length })}
        </p>
        {sortBy === "proximity" && userLocation && (
          <p className="text-sm text-muted-foreground">
            {t('playground.sortedByDistance')}
          </p>
        )}
      </div>

      {/* Playgrounds List */}
      <div className="space-y-4">
        {sortedPlaygrounds.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">{t('playground.noPlaygroundsFound')}</h3>
              <p className="text-muted-foreground">
                {t('playground.beFirstToAdd')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border">
            {sortedPlaygrounds.map((playground) => (
              <div key={playground.id}>
                <Link
                  href={`/playground/${playground.id}`}
                  className="block transition-transform hover:scale-[1.005]"
                >
                  <PlaygroundCard
                    playground={playground}
                    distance={playground.distance || getPlaygroundDistance(playground, userLocation)}
                    showDistance={!!userLocation}
                  />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
