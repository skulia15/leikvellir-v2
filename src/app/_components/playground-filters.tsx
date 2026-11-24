"use client";

import { useState } from "react";
import {
  Armchair,
  Baby,
  Bath,
  ChevronDown,
  Circle,
  Clock,
  Fence,
  Heart,
  Mountain,
  RotateCcw,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Utensils,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "~/components/ui/input";
import { useT } from "~/lib/i18n";
import { isSchoolHours } from "~/lib/school-hours";
import {
  type AmenityFilterKey,
  type MapPlaygroundFilters,
  countSecondaryMapFilters,
  hasActiveMapFilters,
} from "~/lib/search-utils";
import { cn } from "~/lib/utils";
import { type EquipmentCategory } from "~/types";

export type PlaygroundFilters = MapPlaygroundFilters;

interface PlaygroundFiltersProps {
  filters: PlaygroundFilters;
  onFiltersChange: (filters: PlaygroundFilters) => void;
  compact?: boolean;
  onSearchFocus?: () => void;
}

type PrimaryFilterKey = "accessibleNow" | "toddlerFriendly" | "publiclyAccessible";

const PRIMARY_FILTER_OPTIONS: {
  key: PrimaryFilterKey;
  icon: LucideIcon;
  translationKey: string;
}[] = [
  { key: "accessibleNow", icon: Clock, translationKey: "playground.accessibleNow" },
  { key: "toddlerFriendly", icon: Baby, translationKey: "playground.toddlerFriendly" },
  { key: "publiclyAccessible", icon: Users, translationKey: "playground.publiclyAccessible" },
];

const EQUIPMENT_CATEGORY_OPTIONS: {
  key: EquipmentCategory;
  icon: LucideIcon;
}[] = [
  { key: "climbing_and_movement", icon: Mountain },
  { key: "imaginative_and_themed", icon: Sparkles },
  { key: "spinning_and_motion", icon: RotateCcw },
  { key: "fitness_and_obstacle", icon: Route },
];

const AMENITY_FILTER_OPTIONS: {
  key: AmenityFilterKey;
  icon: LucideIcon;
  translationKey: string;
}[] = [
  { key: "hasFencing", icon: Fence, translationKey: "forms.hasFencing" },
  { key: "hasBathroomNearby", icon: Bath, translationKey: "forms.hasBathroomNearby" },
  { key: "hasPicnicTable", icon: Utensils, translationKey: "forms.hasPicnicTable" },
  { key: "hasSeating", icon: Armchair, translationKey: "forms.hasSeating" },
  { key: "hasSoftPlayArea", icon: Heart, translationKey: "forms.hasSoftPlayArea" },
];

export default function PlaygroundFilters({
  filters,
  onFiltersChange,
  compact = false,
  onSearchFocus,
}: PlaygroundFiltersProps) {
  const t = useT();
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const toggleBooleanFilter = (
    key: PrimaryFilterKey | AmenityFilterKey | "bouncyPillow" | "footballField",
  ) => {
    onFiltersChange({
      ...filters,
      [key]: filters[key] ? undefined : true,
    });
  };

  const toggleCategory = (category: EquipmentCategory) => {
    const current = filters.categories ?? [];
    const exists = current.includes(category);
    const next = exists
      ? current.filter((c) => c !== category)
      : [...current, category];

    onFiltersChange({
      ...filters,
      categories: next.length > 0 ? next : undefined,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value.length > 0 ? value : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = hasActiveMapFilters(filters);
  const secondaryCount = countSecondaryMapFilters(filters);
  const searchValue = filters.search ?? "";

  return (
    <div className={cn("space-y-2.5", compact ? "py-1" : "px-1 py-3")}>
      {/* Search input */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          placeholder={t("playground.searchPlaceholder")}
          aria-label={t("playground.searchPlaceholder")}
          className="h-10 pl-9 pr-9 text-sm"
        />
        {searchValue.length > 0 && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            aria-label={t("common.close")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter pills — hidden in compact mobile peek so header never overflows */}
      {!compact && (
        <>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t("playground.filterGroupLabel")}
          >
            <AnimatePresence mode="popLayout">
              {PRIMARY_FILTER_OPTIONS.map(({ key, icon: Icon, translationKey }) => {
                const isActive = filters[key] === true;

                return (
                  <motion.button
                    key={key}
                    type="button"
                    aria-pressed={isActive}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleBooleanFilter(key)}
                    className={cn(
                      // min-h-11: these sit in a draggable sheet header and are
                      // tapped one-handed outdoors, so they need a full target.
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(translationKey)}
                    {key === "accessibleNow" && isSchoolHours() && (
                      <span
                        className={cn(
                          "text-xs",
                          isActive
                            ? "text-primary-foreground/95"
                            : "text-muted-foreground",
                        )}
                      >
                        ({t("playground.excludesSchoolHours")})
                      </span>
                    )}
                    {isActive && (
                      <X className="h-3 w-3 ml-0.5" aria-hidden="true" />
                    )}
                  </motion.button>
                );
              })}

              {/* Equipment & Amenity filters toggle */}
              <motion.button
                key="more-filters-toggle"
                type="button"
                layout
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMoreFilters((prev) => !prev)}
                aria-expanded={showMoreFilters}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors border",
                  showMoreFilters || secondaryCount > 0
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                {t("forms.filters")}
                {secondaryCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground tabular-nums">
                    {secondaryCount}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    showMoreFilters && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </motion.button>

              {/* Clear all button */}
              {hasActiveFilters && (
                <motion.button
                  key="clear-all"
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={clearFilters}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("forms.clearFilters")}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Expandable Equipment & Amenities filter panel */}
          <AnimatePresence initial={false}>
            {showMoreFilters && (
              <motion.div
                key="secondary-filters-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                  {/* Equipment filters */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("playground.filterByEquipment")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-pressed={Boolean(filters.bouncyPillow)}
                        onClick={() => toggleBooleanFilter("bouncyPillow")}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          filters.bouncyPillow
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                        )}
                      >
                        <Zap className="h-3 w-3" aria-hidden="true" />
                        {t("playground.bouncyPillow")}
                      </button>

                      <button
                        type="button"
                        aria-pressed={Boolean(filters.footballField)}
                        onClick={() => toggleBooleanFilter("footballField")}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          filters.footballField
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                        )}
                      >
                        <Circle className="h-3 w-3" aria-hidden="true" />
                        {t("playground.footballField")}
                      </button>

                      {EQUIPMENT_CATEGORY_OPTIONS.map(({ key, icon: Icon }) => {
                        const isActive = filters.categories?.includes(key) ?? false;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => toggleCategory(key)}
                            className={cn(
                              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                            )}
                          >
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {t(`equipment.categories.${key}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amenity filters */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("forms.amenities")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {AMENITY_FILTER_OPTIONS.map(({ key, icon: Icon, translationKey }) => {
                        const isActive = filters[key] === true;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => toggleBooleanFilter(key)}
                            className={cn(
                              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                            )}
                          >
                            <Icon className="h-3 w-3" aria-hidden="true" />
                            {t(translationKey)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
