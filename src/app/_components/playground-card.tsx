import { Badge } from "~/components/ui/badge";
import Image from "next/image";
import { type Playground } from "~/types";
import { Baby, MapPin, Users } from "lucide-react";
import { formatDistance } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";

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
  const t = useT();

  return (
    <div className="px-2 py-4">
      <div className="flex flex-row gap-4">
        <div className="relative flex-shrink-0">
          <Image
            src={
              playground.coverImage && playground.coverImage.trim() !== ""
                ? playground.coverImage
                : "/playground.jpg"
            }
            alt="Playground"
            width={150}
            height={150}
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-md object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="text-base sm:text-lg font-semibold leading-tight text-foreground group-hover:text-primary transition-colors duration-200">
              {playground.title}
            </h3>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {playground.toddlerFriendly && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Baby className="h-3 w-3" />
                {t('playground.toddlerFriendly')}
              </Badge>
            )}
            {playground.publiclyAccessible && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                {t('forms.publicAccess')}
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
    </div>
  );
}
