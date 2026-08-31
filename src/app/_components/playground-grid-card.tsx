import Image from "next/image";
import { MapPin, GraduationCap, Zap, Footprints, Camera } from "lucide-react";
import { Card } from "~/components/ui/card";
import { type Playground } from "~/types";
import { formatDistance } from "~/lib/geo-utils";
import { estimateWalkingTime } from "~/lib/map-utils";
import { useT } from "~/lib/i18n";
import { blurPlaceholderProps } from "~/lib/image-placeholder";
import { hasEquipmentNamed, useEquipmentLookup } from "~/lib/hooks/use-equipment-lookup";

interface PlaygroundGridCardProps {
  playground: Playground;
  distance?: number;
  showDistance?: boolean;
}

export default function PlaygroundGridCard({
  playground,
  distance,
  showDistance = false,
}: PlaygroundGridCardProps) {
  const t = useT();
  const equipmentLookup = useEquipmentLookup();
  const hasBouncyPillow = hasEquipmentNamed(playground, "Ærslabelgur", equipmentLookup);

  return (
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow group">
      {/* Image section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {playground.coverImage && playground.coverImage.trim() !== "" ? (
          <Image
            src={playground.coverImage}
            {...blurPlaceholderProps(playground.coverImageBlur)}
            alt={playground.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <p className="text-xs font-medium">{t("forms.addPhotos")}</p>
          </div>
        )}

        {/* School ground badge overlay */}
        {playground.isSchoolGround && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              <GraduationCap className="h-3 w-3" />
              {playground.schoolType === "preschool"
                ? t("forms.preschoolType")
                : playground.schoolType === "elementary"
                  ? t("forms.elementaryType")
                  : t("forms.isSchoolGround")}
            </span>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-4 space-y-2.5">
        <h3 className="font-sans font-bold text-base leading-snug text-foreground line-clamp-2">
          {playground.title}
        </h3>

        {/* Municipality */}
        {playground.municipality && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {playground.municipality}
          </p>
        )}

        {/* Feature dot indicators */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {playground.toddlerFriendly && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-terrain-moss" />
              {t("playground.toddlerFriendly")}
            </span>
          )}
          {playground.publiclyAccessible && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-terrain-water" />
              {t("forms.publicAccess")}
            </span>
          )}
          {playground.hasFencing && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-terrain-gold" />
              {t("forms.hasFencing")}
            </span>
          )}
          {playground.hasSeating && (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-terrain-stone" />
              {t("forms.hasSeating")}
            </span>
          )}
          {hasBouncyPillow && (
            <span className="flex items-center gap-1.5 text-terrain-heather font-medium">
              <Zap className="h-3 w-3" />
              {t("playground.bouncyPillow")}
            </span>
          )}
        </div>

        {/* Walking time & distance */}
        {showDistance && distance !== undefined && (
          <div className="pt-2 border-t border-border">
            <span className="flex items-center gap-1.5 text-xs tabular-nums font-medium text-muted-foreground">
              <Footprints className="h-3 w-3" />
              {estimateWalkingTime(distance).text} · {formatDistance(distance)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
