"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { UpdateEquipmentSchema, type Equipment, type UpdateEquipmentInput } from "~/types";
import { toast } from "sonner";
import { PlaygroundEquipmentIcon } from "~/components/icons";
import { useT } from "~/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createMultilingualName } from "~/lib/multilingual-utils";

interface EquipmentEditDialogProps {
    equipment: Equipment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function EquipmentEditDialog({
    equipment,
    open,
    onOpenChange,
    onSuccess,
}: EquipmentEditDialogProps) {
    const t = useT();
    const form = useForm<UpdateEquipmentInput>({
        resolver: zodResolver(UpdateEquipmentSchema),
        mode: "onChange",
    });

    const updateMutation = api.equipment.update.useMutation({
        onSuccess: () => {
            toast.success(t('success.equipmentUpdated'));
            onSuccess();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message || t('errors.failedToUpdateEquipment'));
        },
    });

    // Reset form when equipment changes
    useEffect(() => {
        if (equipment) {
            // Handle both legacy string names and new multilingual names
            const nameValue = typeof equipment.name === 'string' 
                ? { is: equipment.name, en: "", pl: "" }
                : {
                    is: equipment.name.is || "",
                    en: equipment.name.en || "",
                    pl: equipment.name.pl || "",
                  };

            form.reset({
                id: equipment.id,
                name: nameValue,
                category: equipment.category,
                description: equipment.description || "",
                image: equipment.image || "",
            });
        }
    }, [equipment, form]);

    const onSubmit = (data: UpdateEquipmentInput) => {
        if (!equipment) return;

        // Clean up empty strings and create proper multilingual name
        const cleanData = {
            ...data,
            name: data.name ? createMultilingualName(
                data.name.is.trim(),
                data.name.en?.trim(),
                data.name.pl?.trim()
            ) : undefined,
            description: data.description?.trim() || null,
            image: data.image?.trim() || null,
        };

        updateMutation.mutate(cleanData);
    };

    if (!equipment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlaygroundEquipmentIcon className="h-5 w-5" />
                        {t('equipment.editEquipment')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('equipment.updateDetails')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <FormLabel className="text-sm font-medium">{t('equipment.equipmentName')} *</FormLabel>
                            <Tabs defaultValue="is" className="mt-2">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="is">Íslenska *</TabsTrigger>
                                    <TabsTrigger value="en">English</TabsTrigger>
                                    <TabsTrigger value="pl">Polski</TabsTrigger>
                                </TabsList>
                                <TabsContent value="is" className="mt-2">
                                    <FormField
                                        control={form.control}
                                        name="name.is"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Sláðu inn íslenskt heiti"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>
                                <TabsContent value="en" className="mt-2">
                                    <FormField
                                        control={form.control}
                                        name="name.en"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter English name (optional)"
                                                        {...field}
                                                        value={field.value || ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>
                                <TabsContent value="pl" className="mt-2">
                                    <FormField
                                        control={form.control}
                                        name="name.pl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Wpisz polską nazwę (opcjonalne)"
                                                        {...field}
                                                        value={field.value || ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('equipment.category')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('equipment.selectCategory')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(Object.entries({
                                                core_equipment: t('equipment.categories.core_equipment'),
                                                climbing_and_movement: t('equipment.categories.climbing_and_movement'),
                                                imaginative_and_themed: t('equipment.categories.imaginative_and_themed'),
                                                spinning_and_motion: t('equipment.categories.spinning_and_motion'),
                                                fitness_and_obstacle: t('equipment.categories.fitness_and_obstacle'),
                                                toddler_friendly: t('equipment.categories.toddler_friendly'),
                                                additional_common_equipment: t('equipment.categories.additional_common_equipment'),
                                            })).map(([value, label]) => (
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
                                    <FormLabel>{t('equipment.imageUrl')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('equipment.enterImageUrl')}
                                            {...field}
                                            value={field.value || ""}
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
                                    <FormLabel>{t('equipment.description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('equipment.enterDescription')}
                                            {...field}
                                            value={field.value || ""}
                                            rows={3}
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
                                onClick={() => onOpenChange(false)}
                                disabled={updateMutation.isPending}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('actions.updating')}
                                    </>
                                ) : (
                                    t('common.update')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 