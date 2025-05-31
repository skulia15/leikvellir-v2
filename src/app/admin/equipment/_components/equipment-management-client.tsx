"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, Package } from "lucide-react";
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

    // Use tRPC query with initial data
    const { data: equipment, refetch } = api.equipment.getAllAdmin.useQuery(
        undefined,
        { initialData }
    );

    const deleteMutation = api.equipment.delete.useMutation({
        onSuccess: () => {
            toast.success("Equipment deleted successfully");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete equipment");
        },
    });

    const restoreMutation = api.equipment.restore.useMutation({
        onSuccess: () => {
            toast.success("Equipment restored successfully");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to restore equipment");
        },
    });

    const handleDelete = async (equipment: Equipment) => {
        if (confirm(`Are you sure you want to delete "${equipment.nameEnglish}"?`)) {
            await deleteMutation.mutateAsync({ id: equipment.id });
        }
    };

    const handleRestore = async (equipment: Equipment) => {
        await restoreMutation.mutateAsync({ id: equipment.id });
    };

    // Group equipment by category
    const equipmentByCategory = (equipment || []).reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
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
                            <Package className="h-5 w-5 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold">{equipment.length}</div>
                                <div className="text-sm text-muted-foreground">Total Equipment</div>
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
                                <div className="text-sm text-muted-foreground">Active</div>
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
                                <div className="text-sm text-muted-foreground">Inactive</div>
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
                                    <Package className="h-5 w-5" />
                                    {categoryLabels[category] || category}
                                    <Badge variant="outline">
                                        {categoryEquipment.length} items
                                    </Badge>
                                </div>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Equipment
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Equipment</TableHead>
                                        <TableHead>Image</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoryEquipment.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{item.nameEnglish}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {item.nameIcelandic}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.nameEnglish}
                                                        className="w-12 h-12 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                                        <Package className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate">
                                                    {item.description || "No description"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={item.isActive ? "default" : "secondary"}>
                                                    {item.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedEquipment(item)}
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
        </div>
    );
} 