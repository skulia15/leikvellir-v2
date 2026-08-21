/**
 * Custom playground marker for the Mapbox map.
 * Color-coded based on accessibility: green (public), amber (school, accessible), red (school, not accessible).
 */
import { Marker } from "react-map-gl/mapbox";
import { MapPin, GraduationCap, Check } from "lucide-react";
import { type Playground } from "~/types";
import {
  getPlaygroundMarkerColor,
  isSchoolGroundAccessible,
} from "~/lib/school-hours";
import { useT } from "~/lib/i18n";

interface MapMarkerProps {
  playground: Playground;
  isSelected?: boolean;
  /** True when the signed-in user has ever checked in here. */
  hasCheckedIn?: boolean;
  onClick: (playground: Playground) => void;
  /** Pointer entered the pin. Only fires for a real mouse, never for touch. */
  onHoverStart?: (playground: Playground) => void;
  onHoverEnd?: (playground: Playground) => void;
}

export function MapMarker({
  playground,
  isSelected,
  hasCheckedIn,
  onClick,
  onHoverStart,
  onHoverEnd,
}: MapMarkerProps) {
  const t = useT();
  const markerColor = getPlaygroundMarkerColor(
    playground.isSchoolGround,
    playground.schoolType,
  );
  const isSchoolGround = playground.isSchoolGround;
  const isAccessible =
    !isSchoolGround || isSchoolGroundAccessible(isSchoolGround);

  // Marker colour alone cannot carry access status (WCAG 1.4.1), so the
  // accessible name states it in words.
  const statusLabel = !isSchoolGround
    ? t("playground.publiclyAccessible")
    : isAccessible
      ? t("playground.openNow")
      : t("playground.closedNow");

  // Same reasoning as above for the visited badge: a 16px checkmark is not
  // self-explanatory, and is invisible to a screen reader, so the name says it.
  const accessibleName = hasCheckedIn
    ? `${playground.title} — ${statusLabel} — ${t("checkIn.visitedBadgeLabel")}`
    : `${playground.title} — ${statusLabel}`;

  return (
    <Marker
      longitude={playground.longitude}
      latitude={playground.latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(playground);
      }}
    >
      <div
        // Touch devices fire a synthetic mouseenter on tap, which would open
        // the hover preview and then immediately have it treated as a click.
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") onHoverStart?.(playground);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") onHoverEnd?.(playground);
        }}
        role="button"
        tabIndex={0}
        aria-label={accessibleName}
        title={accessibleName}
        aria-pressed={isSelected}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(playground);
          }
        }}
        className={`
          relative flex h-11 w-11 items-center justify-center rounded-full text-white
          shadow-lg cursor-pointer transition-transform duration-200
          hover:scale-110 animate-marker-scale-up
          ${isSelected ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-primary" : ""}
        `}
        style={{ backgroundColor: markerColor }}
      >
        {isSchoolGround ? (
          <GraduationCap className="h-5 w-5" />
        ) : (
          <MapPin className="h-5 w-5" />
        )}

        {hasCheckedIn && (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center
              justify-center rounded-full bg-white shadow ring-1 ring-black/10"
          >
            <Check className="h-2.5 w-2.5 text-green-600" strokeWidth={3} />
          </span>
        )}
      </div>
    </Marker>
  );
}
