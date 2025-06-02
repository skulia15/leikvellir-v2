"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Package, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";

import { api } from "~/trpc/react";
import { CreateEquipmentSchema, type CreateEquipmentInput } from "~/types";
import { toast } from "sonner";
import { PlaygroundEquipmentIcon } from "~/components/icons";

interface EquipmentCreateDialogProps {
    onSuccess: () => void;
    category?: string;
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

export default function EquipmentCreateDialog({
    onSuccess,
    category,
}: EquipmentCreateDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm<CreateEquipmentInput>({
        resolver: zodResolver(CreateEquipmentSchema),
        mode: "onChange",
        defaultValues: {
            nameEnglish: "",
            nameIcelandic: "",
            category: (category as CreateEquipmentInput["category"]) || "core_equipment",
            description: "",
            image: "",
        },
    });

    const createMutation = api.equipment.create.useMutation({
        onSuccess: () => {
            toast.success("Equipment created successfully");
            onSuccess();
            setOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create equipment");
        },
    });

    const onSubmit = (data: CreateEquipmentInput) => {
        // Clean up empty strings
        const cleanData = {
            ...data,
            description: data.description?.trim() || undefined,
            image: data.image?.trim() || undefined,
        };

        createMutation.mutate(cleanData);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Equipment
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlaygroundEquipmentIcon className="h-5 w-5" />
                        Create New Equipment
                    </DialogTitle>
                    <DialogDescription>
                        Add a new equipment item to the catalog.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="nameEnglish"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>English Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter English name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="nameIcelandic"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Icelandic Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter Icelandic name"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(categoryLabels).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="image"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image URL</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter image URL (optional)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter equipment description (optional)"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={createMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Equipment"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 