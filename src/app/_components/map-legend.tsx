"use client";

/**
 * Marker legend. The map encodes access status as colour, which is meaningless
 * to a first-time visitor and invisible to anyone who cannot distinguish the
 * hues — so the key is available on the map itself rather than in documentation.
 * Collapsed by default: it explains, it does not compete with the map.
 */
import { useState } from "react";
import { Info, X, MapPin, GraduationCap } from "lucide-react";
import { MARKER_COLORS } from "~/lib/school-hours";
import { useT } from "~/lib/i18n";

export function MapLegend() {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  const entries = [
    {
      color: MARKER_COLORS.open,
      icon: MapPin,
      label: t("playground.legendPublic"),
    },
    {
      color: MARKER_COLORS.limited,
      icon: GraduationCap,
      label: t("playground.legendSchoolOpen"),
    },
    {
      color: MARKER_COLORS.closed,
      icon: GraduationCap,
      label: t("playground.legendSchoolClosed"),
    },
  ];

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("playground.legendTitle")}
        className="absolute bottom-8 left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border transition-colors hover:bg-accent"
      >
        <Info className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-8 left-3 z-10 w-64 rounded-xl bg-card p-4 shadow-lg ring-1 ring-border">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {t("playground.legendTitle")}
        </h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label={t("common.close")}
          className="-mr-1.5 -mt-1.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ul className="space-y-2.5">
        {entries.map(({ color, icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2.5 text-sm text-foreground"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: color }}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            {label}
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {t("playground.schoolHours")}
      </p>
    </div>
  );
}
