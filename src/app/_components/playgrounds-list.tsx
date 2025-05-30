"use client";

import { MapPin, Navigation, SortAsc } from "lucide-react";
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
import { type Playground } from "~/types";
import PlaygroundCard from "./playground-card";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, sortPlaygroundsByDistance } from "~/lib/geo-utils";

interface PlaygroundsListProps {
  playgrounds: Playground[];
}

type SortOption = "proximity" | "popularity" | "newest" | "name";

export default function PlaygroundsList({ playgrounds }: PlaygroundsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortedPlaygrounds, setSortedPlaygrounds] = useState<(Playground & { distance?: number })[]>([]);

  const { userLocation, isLoading, permission, requestLocation } = useUserLocation();

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

  return (
    <div className="space-y-6">
      {/* Sorting Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Sort by:</span>
              </div>
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="proximity" disabled={!userLocation}>
                    Distance {!userLocation && "(Location needed)"}
                  </SelectItem>
                  <SelectItem value="popularity" disabled>
                    Popularity (Coming Soon)
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
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                {isLoading ? "Finding..." : "Enable Location for Distance Sorting"}
              </Button>
            )}

            {userLocation && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location enabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Playgrounds Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {sortedPlaygrounds.length} playground
          {sortedPlaygrounds.length !== 1 ? "s" : ""}
        </p>
        {sortBy === "proximity" && userLocation && (
          <p className="text-sm text-muted-foreground">
            Sorted by distance from your location
          </p>
        )}
      </div>

      {/* Playgrounds List */}
      <div className="space-y-4">
        {sortedPlaygrounds.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No Playgrounds Found</h3>
              <p className="text-muted-foreground">
                Be the first to add a playground to the database!
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedPlaygrounds.map((playground) => (
            <Link
              key={playground.id}
              href={`/playground/${playground.id}`}
              className="block transition-transform hover:scale-[1.02]"
            >
              <PlaygroundCard
                playground={playground}
                distance={playground.distance || getPlaygroundDistance(playground, userLocation)}
                showDistance={!!userLocation}
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
