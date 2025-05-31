"use client";

import { useState } from "react";
import { ChevronDown, Package } from "lucide-react";
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

interface EquipmentSelectorProps {
    value: number[];
    onChange: (equipmentIds: number[]) => void;
    disabled?: boolean;
}

const categoryLabels: Record<EquipmentCategory, string> = {
    core_equipment: "Core Equipment",
    climbing_and_movement: "Climbing & Movement",
    imaginative_and_themed: "Imaginative & Themed",
    spinning_and_motion: "Spinning & Motion",
    fitness_and_obstacle: "Fitness & Obstacle",
    toddler_friendly: "Toddler Friendly",
    additional_common_equipment: "Additional Equipment",
};

function CategoryCheckbox({
    checked,
    onChange,
    disabled
}: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}) {
    return (
        <Checkbox
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
        />
    );
}

export function EquipmentSelector({ value, onChange, disabled }: EquipmentSelectorProps) {
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

    const selectAllInCategory = (categoryEquipment: Equipment[]) => {
        if (disabled) return;

        const categoryIds = categoryEquipment.map(eq => eq.id);
        const allSelected = categoryIds.every(id => value.includes(id));

        if (allSelected) {
            // Deselect all in category
            onChange(value.filter(id => !categoryIds.includes(id)));
        } else {
            // Select all in category
            const newValue = [...new Set([...value, ...categoryIds])];
            onChange(newValue);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-6">
                    <div className="flex items-center justify-center">
                        <div className="text-muted-foreground">Loading equipment...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!equipment || equipment.length === 0) {
        return (
            <Card>
                <CardContent className="py-6">
                    <div className="text-center text-muted-foreground">
                        No equipment available
                    </div>
                </CardContent>
            </Card>
        );
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Playground Equipment
                    {selectedCount > 0 && (
                        <Badge variant="secondary">
                            {selectedCount} selected
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {Object.entries(equipmentByCategory).map(([category, categoryEquipment]) => {
                    const isExpanded = expandedCategories.has(category as EquipmentCategory);
                    const categorySelectedCount = categoryEquipment.filter(eq =>
                        value.includes(eq.id)
                    ).length;
                    const allCategorySelected = categorySelectedCount === categoryEquipment.length;

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
                                        <div className="flex items-center gap-2">
                                            <CategoryCheckbox
                                                checked={allCategorySelected}
                                                onChange={() => selectAllInCategory(categoryEquipment)}
                                                disabled={disabled}
                                            />
                                            <span className="font-medium">
                                                {categoryLabels[category as EquipmentCategory]}
                                            </span>
                                        </div>
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
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {item.image && (
                                                        <Image
                                                            src={item.image}
                                                            alt={item.nameEnglish}
                                                            width={32}
                                                            height={32}
                                                            className="w-8 h-8 rounded object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm">
                                                            {item.nameEnglish}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.nameIcelandic}
                                                        </div>
                                                    </div>
                                                </div>
                                                {item.description && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {item.description}
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

                {selectedCount > 0 && (
                    <div className="pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onChange([])}
                            disabled={disabled}
                            className="w-full"
                        >
                            Clear All Selections
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 