import Image from "next/image";
import { type Playground, type MultilingualName } from "~/types";
import { Zap } from "lucide-react";
// Baby, MapPin, Users icons removed — no longer used in dot-indicator design
import { formatDistance } from "~/lib/geo-utils";
import { useT } from "~/lib/i18n";

function hasEquipmentByName(playground: Playground, nameIs: string): boolean {
  return (
    playground.playgroundEquipment?.some((pe) => {
      const name = pe.equipment.name as string | MultilingualName;
      if (typeof name === "string") return name.toLowerCase() === nameIs.toLowerCase();
      return name.is?.toLowerCase() === nameIs.toLowerCase();
    }) ?? false
  );
}

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
  const hasBouncyPillow = hasEquipmentByName(playground, "Ærslabelgur");

  return (
    <div className="px-4 py-4">
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
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-sans font-semibold leading-snug text-foreground">
            {playground.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {playground.toddlerFriendly && (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-terrain-moss" />
                {t('playground.toddlerFriendly')}
              </span>
            )}
            {playground.publiclyAccessible && (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-terrain-water" />
                {t('forms.publicAccess')}
              </span>
            )}
            {hasBouncyPillow && (
              <span className="flex items-center gap-1.5 text-terrain-heather font-medium">
                <Zap className="h-3 w-3" />
                {t('playground.bouncyPillow')}
              </span>
            )}
            {showDistance && distance !== undefined && (
              <span className="tabular-nums font-medium text-foreground/60">
                {formatDistance(distance)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
