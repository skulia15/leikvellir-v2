"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Compass, Footprints, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { type Playground } from "~/types";
import { calculateDistance, formatDistance } from "~/lib/geo-utils";
import { estimateWalkingTime } from "~/lib/map-utils";
import { useT } from "~/lib/i18n";
import { blurPlaceholderProps } from "~/lib/image-placeholder";

interface NearbyPlaygroundsProps {
  currentPlayground: Playground;
  allPlaygrounds: Playground[];
  /** Maximum number of nearby playgrounds to show */
  limit?: number;
}

interface NearbyPlayground extends Playground {
  distance: number;
}

export default function NearbyPlaygrounds({
  currentPlayground,
  allPlaygrounds,
  limit = 3,
}: NearbyPlaygroundsProps) {
  const t = useT();

  // Calculate distances and sort by proximity
  const nearbyPlaygrounds: NearbyPlayground[] = allPlaygrounds
    .filter((p) => p.id !== currentPlayground.id)
    .map((p) => ({
      ...p,
      distance: calculateDistance(
        currentPlayground.latitude,
        currentPlayground.longitude,
        p.latitude,
        p.longitude
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  if (nearbyPlaygrounds.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-terrain-moss/10">
            <Compass className="h-4 w-4 text-terrain-moss" />
          </span>
          <span>{t('playground.nearbyPlaygrounds')}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {nearbyPlaygrounds.map((playground, index) => (
            <Link
              key={playground.id}
              href={`/playground/${playground.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Thumbnail with rank indicator */}
              <div className="relative flex-shrink-0">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
                  <Image
                    src={
                      playground.coverImage && playground.coverImage.trim() !== ""
                        ? playground.coverImage
                        : "/playground.jpg"
                    }
                    {...blurPlaceholderProps(playground.coverImageBlur)}
                    alt={playground.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="56px"
                  />
                </div>

                {/* Distance rank badge */}
                <span
                  className="absolute -top-1.5 -left-1.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm"
                  style={{
                    backgroundColor: index === 0
                      ? 'hsl(var(--terrain-moss))'
                      : index === 1
                        ? 'hsl(var(--terrain-water))'
                        : 'hsl(var(--terrain-stone))',
                    color: 'white',
                  }}
                >
                  {index + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {playground.title}
                </h4>

                {playground.municipality && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{playground.municipality}</span>
                  </p>
                )}

                {/* Distance info */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md"
                    style={{
                      backgroundColor: index === 0
                        ? 'hsl(var(--terrain-moss) / 0.1)'
                        : index === 1
                          ? 'hsl(var(--terrain-water) / 0.1)'
                          : 'hsl(var(--muted))',
                      color: index === 0
                        ? 'hsl(var(--terrain-moss))'
                        : index === 1
                          ? 'hsl(var(--terrain-water))'
                          : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    <Footprints className="h-3 w-3" />
                    {estimateWalkingTime(playground.distance).text}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDistance(playground.distance)}
                  </span>
                </div>
              </div>

              {/* Arrow indicator */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Footer link to map view */}
        <div className="p-4 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <Link
              href={`/?lat=${currentPlayground.latitude}&lng=${currentPlayground.longitude}&playground=${currentPlayground.id}`}
            >
              <MapPin className="mr-2 h-4 w-4" />
              {t('playground.exploreOnMap')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
