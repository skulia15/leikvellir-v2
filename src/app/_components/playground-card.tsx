import { Card, CardContent, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import Image from "next/image";
import { type Playground } from "~/types";
import { MapPin } from "lucide-react";
import { formatDistance } from "~/lib/geo-utils";

// TODO: Remove this type use trpc for types instead, like posts is doing

interface PlaygroundCardProps {
  playground: Playground;
  distance?: number;
  showDistance?: boolean;
}

export default function PlaygroundCard({
  playground,
  distance,
  showDistance = false,
}: PlaygroundCardProps) {
  return (
    <Card className="cursor-pointer border-0 py-2 transition-colors">
      <CardContent className="py-0">
        <div className="flex flex-row gap-3">
          <div className="relative">
            <Image
              src={
                playground.coverImage && playground.coverImage.trim() !== ""
                  ? playground.coverImage
                  : "/playground.jpg"
              }
              alt="Playground"
              width={80}
              height={80}
              className="rounded-md object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg leading-tight">{playground.title}</CardTitle>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {playground.toddlerFriendly && (
                <Badge variant="secondary" className="text-xs">
                  Toddler Friendly
                </Badge>
              )}
              {playground.publiclyAccessible && (
                <Badge variant="outline" className="text-xs">
                  Public Access
                </Badge>
              )}
              {showDistance && distance !== undefined && (
                <Badge variant="default" className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {formatDistance(distance)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
