"use client";

import { MapPin, Navigation, SortAsc } from "lucide-react";
import { useEffect, useState } from "react";
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

interface PlaygroundsListProps {
  playgrounds: Playground[];
}

type SortOption = "proximity" | "popularity" | "newest" | "name";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function PlaygroundsList({ playgrounds }: PlaygroundsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [sortedPlaygrounds, setSortedPlaygrounds] =
    useState<Playground[]>(playgrounds);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationPermission("granted");
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationPermission("denied");
        },
      );
    } else {
      setLocationPermission("denied");
    }
  };

  // Sort playgrounds based on selected option
  useEffect(() => {
    let sorted = [...playgrounds];

    switch (sortBy) {
      case "proximity":
        if (userLocation) {
          sorted = sorted.sort((a, b) => {
            const distanceA = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              a.latitude,
              a.longitude,
            );
            const distanceB = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              b.latitude,
              b.longitude,
            );
            return distanceA - distanceB;
          });
        }
        break;
      case "popularity":
        // Placeholder for popularity sorting - will use rating when implemented
        sorted = sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "newest":
        sorted = sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "name":
        sorted = sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setSortedPlaygrounds(sorted);
  }, [sortBy, userLocation, playgrounds]);

  const getDistanceText = (playground: Playground): string => {
    if (!userLocation) return "";
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      playground.latitude,
      playground.longitude,
    );
    return distance < 1
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`;
  };

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
            {locationPermission !== "granted" && (
              <Button
                variant="outline"
                size="sm"
                onClick={getUserLocation}
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Enable Location for Distance Sorting
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
            <div key={playground.id} className="relative">
              <PlaygroundCard playground={playground} />
              {/* Distance badge for proximity sorting */}
              {sortBy === "proximity" && userLocation && (
                <div className="absolute right-2 top-2">
                  <Badge variant="secondary" className="text-xs">
                    {getDistanceText(playground)}
                  </Badge>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
