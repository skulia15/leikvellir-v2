"use client";

import { useState } from "react";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import { type Equipment } from "~/types";
import { toast } from "sonner";
import EquipmentEditDialog from "./equipment-edit-dialog";
import EquipmentCreateDialog from "./equipment-create-dialog";
import { PlaygroundEquipmentIcon } from "~/components/icons";
import { useT } from "~/lib/i18n";

interface EquipmentManagementClientProps {
    initialData: Equipment[];
}

const categoryLabels: Record<string, string> = {
    core_equipment: "Core Equipment",
    climbing_and_movement: "Climbing & Movement",
    imaginative_and_themed: "Imaginative & Themed",
    spinning_and_motion: "Spinning & Motion",
    fitness_and_obstacle: "Fitness & Obstacle",
    toddler_friendly: "Toddler Friendly",
    additional_common_equipment: "Additional Equipment",
};

export default function EquipmentManagementClient({
    initialData,
}: EquipmentManagementClientProps) {
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const t = useT();

    // Use tRPC query with initial data
    const { data: equipment, refetch } = api.equipment.getAllAdmin.useQuery(
        undefined,
        { initialData }
    );

    const deleteMutation = api.equipment.delete.useMutation({
        onSuccess: () => {
            toast.success(t("equipment.delete.success"));
            void refetch();
        },
        onError: (error) => {
            toast.error(error.message || t("equipment.delete.error"));
        },
    });

    const restoreMutation = api.equipment.restore.useMutation({
        onSuccess: () => {
            toast.success(t("equipment.restore.success"));
            void refetch();
        },
        onError: (error) => {
            toast.error(error.message || t("equipment.restore.error"));
        },
    });

    const handleEdit = (equipment: Equipment) => {
        setSelectedEquipment(equipment);
        setIsEditDialogOpen(true);
    };

    const handleDelete = async (equipment: Equipment) => {
        if (confirm(`${t("equipment.delete.confirm")} "${t(equipment.name)}"?`)) {
            try {
                await deleteMutation.mutateAsync({ id: equipment.id });
            } catch (_error) {
                // Error handling is already done in the mutation onError
            }
        }
    };

    const handleRestore = async (equipment: Equipment) => {
        try {
            await restoreMutation.mutateAsync({ id: equipment.id });
        } catch (_error) {
            // Error handling is already done in the mutation onError
        }
    };

    // Group equipment by category
    const equipmentByCategory = (equipment || []).reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category]!.push(item);
        return acc;
    }, {} as Record<string, Equipment[]>);

    const activeCount = (equipment || []).filter(eq => eq.isActive).length;
    const inactiveCount = (equipment || []).filter(eq => !eq.isActive).length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2">
                            <PlaygroundEquipmentIcon className="h-5 w-5 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold">{equipment?.length || 0}</div>
                                <div className="text-sm text-muted-foreground">{t("equipment.total")}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <div>
                                <div className="text-2xl font-bold">{activeCount}</div>
                                <div className="text-sm text-muted-foreground">{t("equipment.active")}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <div>
                                <div className="text-2xl font-bold">{inactiveCount}</div>
                                <div className="text-sm text-muted-foreground">{t("equipment.inactive")}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Equipment by Category */}
            <div className="space-y-6">
                {Object.entries(equipmentByCategory).map(([category, categoryEquipment]) => (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PlaygroundEquipmentIcon className="h-5 w-5" />
                                    {categoryLabels[category] || category}
                                    <Badge variant="outline" className="text-xs">
                                        {categoryEquipment.length} {t("equipment.itemsText")}
                                    </Badge>
                                </div>
                                <EquipmentCreateDialog
                                    onSuccess={refetch}
                                    category={category}
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('admin.equipmentTable')}</TableHead>
                                        <TableHead>{t('admin.image')}</TableHead>
                                        <TableHead>{t('admin.description')}</TableHead>
                                        <TableHead>{t('admin.status')}</TableHead>
                                        <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoryEquipment.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{t(item.name)}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.image ? (
                                                    <Image
                                                        src={item.image}
                                                        alt={t(item.name)}
                                                        width={48}
                                                        height={48}
                                                        className="w-12 h-12 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                                        <PlaygroundEquipmentIcon className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate">
                                                    {item.description ? t(item.description) : t('admin.noDescription')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.isActive ? "default" : "secondary"}>
                                                    {item.isActive ? t('admin.active') : t('admin.inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {item.isActive ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(item)}
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRestore(item)}
                                                            disabled={restoreMutation.isPending}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Dialog */}
            <EquipmentEditDialog
                equipment={selectedEquipment}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={refetch}
            />
        </div>
    );
} 