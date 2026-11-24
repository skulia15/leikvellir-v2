import Image from "next/image";
import { type Playground } from "~/types";
import { Zap, Footprints, GraduationCap, Camera } from "lucide-react";
import { formatDistance } from "~/lib/geo-utils";
import { estimateWalkingTime } from "~/lib/map-utils";
import { useLocale, useT } from "~/lib/i18n";
import { blurPlaceholderProps } from "~/lib/image-placeholder";
import { isSchoolGroundAccessible } from "~/lib/school-hours";
import { hasEquipmentNamed, useEquipmentLookup } from "~/lib/hooks/use-equipment-lookup";

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
  const { locale } = useLocale();
  const equipmentLookup = useEquipmentLookup();
  const hasBouncyPillow = hasEquipmentNamed(playground, "Ærslabelgur", equipmentLookup);
  const isAccessible = isSchoolGroundAccessible(playground.isSchoolGround ?? false);
  const hasCover = !!playground.coverImage && playground.coverImage.trim() !== "";

  return (
    <div className="px-4 py-4 group">
      <div className="flex flex-row gap-4">
        <div className="relative flex-shrink-0 overflow-hidden rounded-xl">
          {hasCover ? (
            <Image
              src={playground.coverImage!}
              {...blurPlaceholderProps(playground.coverImageBlur)}
              alt=""
              width={150}
              height={150}
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            // Matches PlaygroundGridCard: no cover means say so, not a stock photo
            <div
              aria-hidden="true"
              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"
            >
              <Camera className="h-6 w-6" />
            </div>
          )}
          {/* School ground badge overlay — icon plus text, never colour alone */}
          {playground.isSchoolGround && (
            <div className="absolute top-1.5 right-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm ${
                  isAccessible ? "bg-status-limited-surface" : "bg-status-closed-surface"
                }`}
              >
                <GraduationCap className="h-2.5 w-2.5" aria-hidden="true" />
                {isAccessible ? t("playground.openNow") : t("playground.closedNow")}
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
              <span className={`flex items-center gap-1.5 font-medium ${isAccessible ? "text-status-limited" : "text-status-closed"}`}>
                <GraduationCap className="h-3 w-3" aria-hidden="true" />
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
                <Zap className="h-3 w-3" aria-hidden="true" />
                {t('playground.bouncyPillow')}
              </span>
            )}
            {showDistance && distance !== undefined && (
              <span className="flex items-center gap-1.5 tabular-nums font-medium text-foreground">
                <Footprints className="h-3 w-3" aria-hidden="true" />
                {estimateWalkingTime(distance, locale).text} · {formatDistance(distance, locale)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
