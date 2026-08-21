"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import PlaygroundFilters, {
  type PlaygroundFilters as PlaygroundFiltersType,
} from "./playground-filters";
import { useT } from "~/lib/i18n";

interface MapFiltersSheetProps {
  filters: PlaygroundFiltersType;
  onFiltersChange: (filters: PlaygroundFiltersType) => void;
  playgroundCount: number;
  onExpand?: () => void;
}

export default function MapFiltersSheet({
  filters,
  onFiltersChange,
  playgroundCount,
  onExpand,
}: MapFiltersSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useT();

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined,
  ).length;

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) onExpand?.();
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-full h-8 px-3"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-sm font-medium">{t("forms.filters")}</span>
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {expanded && (
        <div className="pt-2">
          <PlaygroundFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        </div>
      )}
    </div>
  );
}
