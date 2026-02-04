"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { type Equipment, type EquipmentCategory } from "~/types";
import { useLocale, useT } from "~/lib/i18n";
import { PlaygroundEquipmentIcon } from "../icons/playground-icons";
import { handleMixedNameFormat } from "~/lib/multilingual-utils";

interface EquipmentSelectorProps {
    value: number[];
    onChange: (equipmentIds: number[]) => void;
    disabled?: boolean;
    variant?: "card" | "inline";
}

export function EquipmentSelector({ value, onChange, disabled, variant = "card" }: EquipmentSelectorProps) {
    const t = useT();
    const [expandedCategories, setExpandedCategories] = useState<Set<EquipmentCategory>>(
        new Set(["core_equipment"])
    );

    const { data: equipment, isLoading } = api.equipment.getAll.useQuery();

    const toggleCategory = (category: EquipmentCategory) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const toggleEquipment = (equipmentId: number) => {
        if (disabled) return;

        const newValue = value.includes(equipmentId)
            ? value.filter(id => id !== equipmentId)
            : [...value, equipmentId];

        onChange(newValue);
    };

    const currentLanguage = useLocale().locale;

    if (isLoading) {
        const content = (
            <div className="flex items-center justify-center py-6">
                <div className="text-muted-foreground">{t('equipment.loadingEquipment')}</div>
            </div>
        );

        return variant === "card" ? (
            <Card>
                <CardContent className="py-6">
                    {content}
                </CardContent>
            </Card>
        ) : content;
    }

    if (!equipment || equipment.length === 0) {
        const content = (
            <div className="text-center text-muted-foreground py-6">
                {t('equipment.noEquipmentAvailable')}
            </div>
        );

        return variant === "card" ? (
            <Card>
                <CardContent className="py-6">
                    {content}
                </CardContent>
            </Card>
        ) : content;
    }

    // Group equipment by category
    const equipmentByCategory = equipment.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {} as Record<EquipmentCategory, Equipment[]>);

    const selectedCount = value.length;

    const content = (
        <div className="space-y-4">
            {Object.entries(equipmentByCategory).map(([category, categoryEquipment]) => {
                const isExpanded = expandedCategories.has(category as EquipmentCategory);
                const categorySelectedCount = categoryEquipment.filter(eq =>
                    value.includes(eq.id)
                ).length;

                return (
                    <Collapsible
                        key={category}
                        open={isExpanded}
                        onOpenChange={() => toggleCategory(category as EquipmentCategory)}
                    >
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full justify-between p-3 h-auto"
                                disabled={disabled}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-medium">
                                        {t(`equipment.categories.${category as EquipmentCategory}`)}
                                    </span>
                                    {categorySelectedCount > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                            {categorySelectedCount}/{categoryEquipment.length}
                                        </Badge>
                                    )}
                                </div>
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""
                                        }`}
                                />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                            <div className="grid grid-cols-1 gap-2 pl-6">
                                {categoryEquipment.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <Checkbox
                                            checked={value.includes(item.id)}
                                            onCheckedChange={() => toggleEquipment(item.id)}
                                            disabled={disabled}
                                        />
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => !disabled && toggleEquipment(item.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.image && (
                                                    <Image
                                                        src={item.image}
                                                        alt={handleMixedNameFormat(item.name, currentLanguage)}
                                                        width={32}
                                                        height={32}
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm select-none">
                                                        {handleMixedNameFormat(item.name, currentLanguage)}
                                                    </div>
                                                </div>
                                            </div>
                                            {item.description && (
                                                <div className="text-xs text-muted-foreground mt-1 select-none">
                                                    {t(item.description)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}

        </div>
    );

    return variant === "card" ? (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PlaygroundEquipmentIcon className="h-5 w-5" />
                    {t('equipment.playgroundEquipment')}
                    {selectedCount > 0 && (
                        <Badge variant="secondary">
                            {selectedCount} {t('equipment.selected')}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {content}
            </CardContent>
        </Card>
    ) : content;
} 