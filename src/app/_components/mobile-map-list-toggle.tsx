"use client";

import { Map, List } from "lucide-react";
import { motion } from "motion/react";
import { useT } from "~/lib/i18n";

interface MobileMapListToggleProps {
    view: "map" | "list";
    onViewChange: (view: "map" | "list") => void;
}

export function MobileMapListToggle({ view, onViewChange }: MobileMapListToggleProps) {
    const t = useT();

    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            onClick={() => onViewChange(view === "map" ? "list" : "map")}
            className="flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg active:scale-95 transition-transform"
        >
            {view === "map" ? (
                <>
                    <List className="h-4 w-4" />
                    {t("playground.listView")}
                </>
            ) : (
                <>
                    <Map className="h-4 w-4" />
                    {t("playground.mapView")}
                </>
            )}
        </motion.button>
    );
}
