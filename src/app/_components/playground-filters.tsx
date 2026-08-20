"use client";

import { X, Clock, Baby, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useT } from "~/lib/i18n";
import { isSchoolHours } from "~/lib/school-hours";
import { cn } from "~/lib/utils";

export interface PlaygroundFilters {
    toddlerFriendly?: boolean;
    publiclyAccessible?: boolean;
    accessibleNow?: boolean; // Includes publicly accessible + school grounds during accessible hours
}

interface PlaygroundFiltersProps {
    filters: PlaygroundFilters;
    onFiltersChange: (filters: PlaygroundFilters) => void;
}

type FilterKey = keyof PlaygroundFilters;

const FILTER_OPTIONS: { key: FilterKey; icon: typeof Clock; translationKey: string }[] = [
    { key: "accessibleNow", icon: Clock, translationKey: "playground.accessibleNow" },
    { key: "toddlerFriendly", icon: Baby, translationKey: "playground.toddlerFriendly" },
    { key: "publiclyAccessible", icon: Users, translationKey: "playground.publiclyAccessible" },
];

export default function PlaygroundFilters({
    filters,
    onFiltersChange,
}: PlaygroundFiltersProps) {
    const t = useT();

    const toggleFilter = (key: FilterKey) => {
        onFiltersChange({
            ...filters,
            [key]: filters[key] ? undefined : true,
        });
    };

    const clearFilters = () => {
        onFiltersChange({});
    };

    const hasActiveFilters = Object.values(filters).some(
        (value) => value !== undefined,
    );

    return (
        <div className="px-1 py-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("playground.filterGroupLabel")}>
                <AnimatePresence mode="popLayout">
                    {FILTER_OPTIONS.map(({ key, icon: Icon, translationKey }) => {
                        const isActive = filters[key] === true;

                        return (
                            <motion.button
                                key={key}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => toggleFilter(key)}
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
                                    <span className={cn(
                                        "text-xs",
                                        isActive ? "text-primary-foreground/70" : "text-muted-foreground",
                                    )}>
                                        ({t("playground.excludesSchoolHours")})
                                    </span>
                                )}
                                {isActive && (
                                    <X className="h-3 w-3 ml-0.5" aria-hidden="true" />
                                )}
                            </motion.button>
                        );
                    })}

                    {/* Clear all button */}
                    {hasActiveFilters && (
                        <motion.button
                            key="clear-all"
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border hover:bg-accent"
                        >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("forms.clearFilters")}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
