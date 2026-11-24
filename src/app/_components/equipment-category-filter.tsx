"use client";

import {
  X,
  Mountain,
  Sparkles,
  Baby,
  Zap,
  Clock,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type EquipmentCategory } from "~/types";
import { cn } from "~/lib/utils";
import { useT } from "~/lib/i18n";

const CATEGORY_CONFIG: { key: EquipmentCategory; icon: LucideIcon }[] = [
  { key: "toddler_friendly", icon: Baby },
];

const CATEGORY_CONFIG_END: { key: EquipmentCategory; icon: LucideIcon }[] = [
  { key: "climbing_and_movement", icon: Mountain },
  { key: "imaginative_and_themed", icon: Sparkles },
];

interface EquipmentCategoryFilterProps {
  activeCategories: Set<EquipmentCategory>;
  onToggleCategory: (category: EquipmentCategory) => void;
  bouncyPillowActive: boolean;
  onToggleBouncyPillow: () => void;
  bouncyPillowCount: number;
  footballFieldActive: boolean;
  onToggleFootballField: () => void;
  footballFieldCount: number;
  openNowActive: boolean;
  onToggleOpenNow: () => void;
  closedSchoolGroundCount: number;
  onClearAll: () => void;
  categoryCounts: Map<EquipmentCategory, number>;
}

export default function EquipmentCategoryFilter({
  activeCategories,
  onToggleCategory,
  bouncyPillowActive,
  onToggleBouncyPillow,
  bouncyPillowCount,
  footballFieldActive,
  onToggleFootballField,
  footballFieldCount,
  openNowActive,
  onToggleOpenNow,
  closedSchoolGroundCount,
  onClearAll,
  categoryCounts,
}: EquipmentCategoryFilterProps) {
  const t = useT();
  const hasActiveFilters = activeCategories.size > 0 || bouncyPillowActive || footballFieldActive || openNowActive;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {t("playground.filterByEquipment")}
      </p>
      <div
        role="group"
        aria-label={t("playground.filterByEquipment")}
        className="flex flex-wrap gap-2"
      >
        <AnimatePresence mode="popLayout">
          {/* Open now — hides school ground playgrounds during school hours */}
          {closedSchoolGroundCount > 0 && (
            <motion.button
              key="open-now"
              type="button"
              aria-pressed={openNowActive}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={onToggleOpenNow}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                openNowActive
                  ? "bg-terrain-moss-text text-card shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {t("playground.openNow")}
            </motion.button>
          )}

          {CATEGORY_CONFIG.map(({ key, icon: Icon }) => {
            const count = categoryCounts.get(key) ?? 0;
            const isActive = activeCategories.has(key);

            if (count === 0) return null;

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
                onClick={() => onToggleCategory(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`equipment.categories.${key}`)}
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive
                      ? "text-primary-foreground/95"
                      : "text-muted-foreground",
                  )}
                >
                  ({count})
                </span>
              </motion.button>
            );
          })}

          {/* Ærslabelgur (bouncy pillow) — special equipment filter */}
          {bouncyPillowCount > 0 && (
            <motion.button
              key="bouncy-pillow"
              type="button"
              aria-pressed={bouncyPillowActive}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleBouncyPillow}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                bouncyPillowActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              {t("playground.bouncyPillow")}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  bouncyPillowActive
                    ? "text-primary-foreground/95"
                    : "text-muted-foreground",
                )}
              >
                ({bouncyPillowCount})
              </span>
            </motion.button>
          )}

          {/* Fótboltavöllur (football field) — special equipment filter */}
          {footballFieldCount > 0 && (
            <motion.button
              key="football-field"
              type="button"
              aria-pressed={footballFieldActive}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleFootballField}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                footballFieldActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              )}
            >
              <Circle className="h-3.5 w-3.5" aria-hidden="true" />
              {t("playground.footballField")}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  footballFieldActive
                    ? "text-primary-foreground/95"
                    : "text-muted-foreground",
                )}
              >
                ({footballFieldCount})
              </span>
            </motion.button>
          )}

          {/* Secondary category pills — at the end */}
          {CATEGORY_CONFIG_END.map(({ key, icon: Icon }) => {
            const count = categoryCounts.get(key) ?? 0;
            const isActive = activeCategories.has(key);

            if (count === 0) return null;

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
                onClick={() => onToggleCategory(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`equipment.categories.${key}`)}
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive
                      ? "text-primary-foreground/95"
                      : "text-muted-foreground",
                  )}
                >
                  ({count})
                </span>
              </motion.button>
            );
          })}

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
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t("playground.clearAllFilters")}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
