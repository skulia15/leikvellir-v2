"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";

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
import { useT } from "~/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { createMultilingualName } from "~/lib/multilingual-utils";

interface EquipmentCreateDialogProps {
    onSuccess: () => void;
    category?: string;
}

export default function EquipmentCreateDialog({
    onSuccess,
    category,
}: EquipmentCreateDialogProps) {
    const [open, setOpen] = useState(false);
    const t = useT();

    const form = useForm<CreateEquipmentInput>({
        resolver: zodResolver(CreateEquipmentSchema),
        mode: "onChange",
        defaultValues: {
            name: {
                is: "",
                en: "",
                pl: "",
            },
            category: (category as CreateEquipmentInput["category"]) || "core_equipment",
            description: "",
            image: "",
        },
    });

    const createMutation = api.equipment.create.useMutation({
        onSuccess: () => {
            toast.success(t('equipment.equipmentCreatedSuccessfully'));
            onSuccess();
            setOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message || t('equipment.failedToCreateEquipment'));
        },
    });

    const onSubmit = (data: CreateEquipmentInput) => {
        // Clean up empty strings and create proper multilingual name
        const cleanData = {
            ...data,
            name: createMultilingualName(
                data.name.is.trim(),
                data.name.en?.trim(),
                data.name.pl?.trim()
            ),
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
                    {t('common.add')} {t('navigation.equipment')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlaygroundEquipmentIcon className="h-5 w-5" />
                        {t('equipment.createNewEquipment')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('equipment.addNewEquipmentToCatalog')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-4">
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
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('equipment.category')} *</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
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
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('actions.creating')}
                                    </>
                                ) : (
                                    t('equipment.createEquipment')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 