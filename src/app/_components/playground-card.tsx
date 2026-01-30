import Image from "next/image";
import { type Playground, type MultilingualName } from "~/types";
import { Zap, Footprints, GraduationCap } from "lucide-react";
import { formatDistance } from "~/lib/geo-utils";
import { estimateWalkingTime } from "~/lib/map-utils";
import { useT } from "~/lib/i18n";
import { isSchoolGroundAccessible } from "~/lib/school-hours";

function hasEquipmentByName(playground: Playground, nameIs: string): boolean {
  return (
    playground.playgroundEquipment?.some((pe) => {
      const name = pe.equipment.name as string | MultilingualName;
      if (typeof name === "string") return name.toLowerCase() === nameIs.toLowerCase();
      return name.is?.toLowerCase() === nameIs.toLowerCase();
    }) ?? false
  );
}

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
  const isAccessible = isSchoolGroundAccessible(playground.isSchoolGround ?? false);

  return (
    <div className="px-4 py-4 group">
      <div className="flex flex-row gap-4">
        <div className="relative flex-shrink-0 overflow-hidden rounded-xl">
          <Image
            src={
              playground.coverImage && playground.coverImage.trim() !== ""
                ? playground.coverImage
                : "/playground.jpg"
            }
            alt="Playground"
            width={150}
            height={150}
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {/* School ground badge overlay */}
          {playground.isSchoolGround && (
            <div className="absolute top-1.5 right-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm ${
                  isAccessible
                    ? "bg-amber-500/90 text-white"
                    : "bg-red-500/90 text-white"
                }`}
              >
                <GraduationCap className="h-2.5 w-2.5" />
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-sans font-semibold leading-snug text-foreground">
            {playground.title}
          </h3>

          {/* Municipality */}
          {playground.municipality && (
            <p className="text-xs text-muted-foreground mt-1">
              {playground.municipality}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {/* School ground status - show first if applicable */}
            {playground.isSchoolGround && (
              <span className={`flex items-center gap-1.5 font-medium ${isAccessible ? "text-amber-600" : "text-red-500"}`}>
                <GraduationCap className="h-3 w-3" />
                {playground.schoolType === "preschool"
                  ? t("forms.preschoolType")
                  : playground.schoolType === "elementary"
                    ? t("forms.elementaryType")
                    : t("forms.isSchoolGround")}
              </span>
            )}
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
              <span className="flex items-center gap-1.5 tabular-nums font-medium text-foreground/60">
                <Footprints className="h-3 w-3" />
                {estimateWalkingTime(distance).text} · {formatDistance(distance)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
