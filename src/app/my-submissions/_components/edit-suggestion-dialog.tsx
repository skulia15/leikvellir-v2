"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CoordinatePickerMap } from "~/app/_components/coordinate-picker-map";
import MunicipalitySelector from "~/components/municipality-selector";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { EquipmentSelector } from "~/components/ui/equipment-selector";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "~/components/ui/form";
import ImageUpload from "~/components/ui/image-upload";
import { Input } from "~/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";

const editSuggestionFormSchema = z.object({
    title: z.string().min(1).max(256).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    municipality: z.string().nullable().optional(),
    publiclyAccessible: z.boolean().optional(),
    toddlerFriendly: z.boolean().optional(),
    isSchoolGround: z.boolean().optional(),
    schoolType: z.enum(["preschool", "elementary"]).nullable().optional(),
    hasSeating: z.boolean().optional(),
    hasPicnicTable: z.boolean().optional(),
    hasFencing: z.boolean().optional(),
    hasGarbageCan: z.boolean().optional(),
    hasBathroomNearby: z.boolean().optional(),
    hasSoftPlayArea: z.boolean().optional(),
    equipmentIds: z.array(z.number()).optional(),
    coverImage: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    submitAnonymously: z.boolean().optional(),
});

type EditSuggestionFormData = z.infer<typeof editSuggestionFormSchema>;

interface PlaygroundEditSuggestion {
    id: number;
    playgroundId: number;
    status: "pending" | "approved" | "rejected";
    title?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    municipality?: string | null;
    publiclyAccessible?: boolean | null;
    toddlerFriendly?: boolean | null;
    isSchoolGround?: boolean | null;
    schoolType?: "preschool" | "elementary" | null;
    hasSeating?: boolean | null;
    hasPicnicTable?: boolean | null;
    hasFencing?: boolean | null;
    hasGarbageCan?: boolean | null;
    hasBathroomNearby?: boolean | null;
    hasSoftPlayArea?: boolean | null;
    coverImage?: string | null;
    images?: string[] | null;
    equipmentIds?: number[] | null;
    submitAnonymously?: boolean | null;
    createdById: string;
    createdAt: Date;
    reviewedById?: string | null;
    reviewedAt?: Date | null;
    rejectionReason?: string | null;
    updatedAt?: Date | null;
    playground?: {
        id: number;
        title: string;
        coverImage?: string | null;
    };
    suggestionEquipment?: Array<{
        equipmentId: number;
        equipment: {
            id: number;
            name: Record<string, string>;
            category: string;
        };
    }>;
}

interface EditSuggestionDialogProps {
    suggestion: PlaygroundEditSuggestion;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function EditSuggestionDialog({
    suggestion,
    open,
    onOpenChange,
    onSuccess,
}: EditSuggestionDialogProps) {
    const t = useT();

    const validImages = (suggestion.images ?? []).filter(img => img && img.trim() !== "");

    const form = useForm<EditSuggestionFormData>({
        resolver: zodResolver(editSuggestionFormSchema),
        defaultValues: {
            title: suggestion.title ?? undefined,
            latitude: suggestion.latitude ?? undefined,
            longitude: suggestion.longitude ?? undefined,
            municipality: suggestion.municipality,
            publiclyAccessible: suggestion.publiclyAccessible ?? undefined,
            toddlerFriendly: suggestion.toddlerFriendly ?? undefined,
            isSchoolGround: suggestion.isSchoolGround ?? undefined,
            schoolType: suggestion.schoolType,
            hasSeating: suggestion.hasSeating ?? undefined,
            hasPicnicTable: suggestion.hasPicnicTable ?? undefined,
            hasFencing: suggestion.hasFencing ?? undefined,
            hasGarbageCan: suggestion.hasGarbageCan ?? undefined,
            hasBathroomNearby: suggestion.hasBathroomNearby ?? undefined,
            hasSoftPlayArea: suggestion.hasSoftPlayArea ?? undefined,
            equipmentIds: suggestion.equipmentIds ?? suggestion.suggestionEquipment?.map(se => se.equipmentId) ?? undefined,
            coverImage: suggestion.coverImage,
            images: validImages,
            submitAnonymously: suggestion.submitAnonymously ?? undefined,
        },
    });

    // Reset form when suggestion changes
    useEffect(() => {
        const validImages = (suggestion.images ?? []).filter(img => img && img.trim() !== "");

        form.reset({
            title: suggestion.title ?? undefined,
            latitude: suggestion.latitude ?? undefined,
            longitude: suggestion.longitude ?? undefined,
            municipality: suggestion.municipality,
            publiclyAccessible: suggestion.publiclyAccessible ?? undefined,
            toddlerFriendly: suggestion.toddlerFriendly ?? undefined,
            isSchoolGround: suggestion.isSchoolGround ?? undefined,
            schoolType: suggestion.schoolType,
            hasSeating: suggestion.hasSeating ?? undefined,
            hasPicnicTable: suggestion.hasPicnicTable ?? undefined,
            hasFencing: suggestion.hasFencing ?? undefined,
            hasGarbageCan: suggestion.hasGarbageCan ?? undefined,
            hasBathroomNearby: suggestion.hasBathroomNearby ?? undefined,
            hasSoftPlayArea: suggestion.hasSoftPlayArea ?? undefined,
            equipmentIds: suggestion.equipmentIds ?? suggestion.suggestionEquipment?.map(se => se.equipmentId) ?? undefined,
            coverImage: suggestion.coverImage,
            images: validImages,
            submitAnonymously: suggestion.submitAnonymously ?? undefined,
        });
    }, [suggestion, form]);

    const updateMutation = api.playground.updateMyEditSuggestion.useMutation({
        onSuccess: () => {
            toast.success(t('mySubmissions.updateSuccess'));
            onSuccess();
        },
        onError: (error) => {
            if (error.message.includes("already reviewed")) {
                toast.error(t('mySubmissions.alreadyReviewedError'));
            } else {
                toast.error(error.message || t('mySubmissions.updateError'));
            }
        },
    });

    const onSubmit = (data: EditSuggestionFormData) => {
        const validImages = (data.images || []).filter(img => img && img.trim() !== "");

        updateMutation.mutate({
            id: suggestion.id,
            playgroundId: suggestion.playgroundId,
            title: data.title,
            latitude: data.latitude,
            longitude: data.longitude,
            municipality: data.municipality,
            publiclyAccessible: data.publiclyAccessible,
            toddlerFriendly: data.toddlerFriendly,
            isSchoolGround: data.isSchoolGround,
            schoolType: data.schoolType,
            hasSeating: data.hasSeating,
            hasPicnicTable: data.hasPicnicTable,
            hasFencing: data.hasFencing,
            hasGarbageCan: data.hasGarbageCan,
            hasBathroomNearby: data.hasBathroomNearby,
            hasSoftPlayArea: data.hasSoftPlayArea,
            equipmentIds: data.equipmentIds,
            coverImage: data.coverImage,
            images: validImages.length > 0 ? validImages : undefined,
            submitAnonymously: data.submitAnonymously,
        });
    };

    const watchIsSchoolGround = form.watch("isSchoolGround");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('mySubmissions.editSuggestion')}</DialogTitle>
                    <DialogDescription>
                        {t('mySubmissions.editSuggestionDescription')} {suggestion.playground?.title}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="details">{t('admin.details')}</TabsTrigger>
                                <TabsTrigger value="equipment">{t('playground.equipment')}</TabsTrigger>
                                <TabsTrigger value="amenities">{t('playground.amenities')}</TabsTrigger>
                                <TabsTrigger value="images">{t('playground.images')}</TabsTrigger>
                            </TabsList>

                            {/* Details Tab */}
                            <TabsContent value="details" className="space-y-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.title')}</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value ?? ""} />
                                            </FormControl>
                                            <FormDescription>
                                                {t('mySubmissions.leaveEmptyToKeepOriginal')}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="municipality"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.municipality')}</FormLabel>
                                            <FormControl>
                                                <MunicipalitySelector
                                                    value={field.value ?? ""}
                                                    onValueChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <FormLabel>{t('playground.location')}</FormLabel>
                                    <div className="h-64 rounded-lg overflow-hidden border">
                                        <CoordinatePickerMap
                                            latitude={form.watch("latitude") ?? 64.071}
                                            longitude={form.watch("longitude") ?? -21.954}
                                            onCoordinateChange={(lat, lng) => {
                                                form.setValue("latitude", lat);
                                                form.setValue("longitude", lng);
                                            }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="latitude"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('playground.latitude')}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.00001"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="longitude"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('playground.longitude')}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.00001"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="publiclyAccessible"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value ?? false}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    {t('playground.publiclyAccessible')}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="toddlerFriendly"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value ?? false}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    {t('playground.toddlerFriendly')}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isSchoolGround"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value ?? false}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked);
                                                            if (!checked) {
                                                                form.setValue("schoolType", null);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    {t('forms.isSchoolGround')}
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    {watchIsSchoolGround && (
                                        <FormField
                                            control={form.control}
                                            name="schoolType"
                                            render={({ field }) => (
                                                <FormItem className="ml-6">
                                                    <FormLabel>{t('forms.schoolType')}</FormLabel>
                                                    <Select
                                                        value={field.value ?? ""}
                                                        onValueChange={(value) => field.onChange(value || null)}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('forms.selectSchoolType')} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="preschool">{t('playground.preschool')}</SelectItem>
                                                            <SelectItem value="elementary">{t('playground.elementary')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="submitAnonymously"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value ?? false}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div>
                                                    <FormLabel className="font-normal">
                                                        {t('playground.submitAnonymously')}
                                                    </FormLabel>
                                                    <FormDescription>
                                                        {t('forms.submitAnonymouslyDescription')}
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>

                            {/* Equipment Tab */}
                            <TabsContent value="equipment" className="mt-4">
                                <FormField
                                    control={form.control}
                                    name="equipmentIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.selectEquipment')}</FormLabel>
                                            <FormControl>
                                                <EquipmentSelector
                                                    value={field.value ?? []}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            {/* Amenities Tab */}
                            <TabsContent value="amenities" className="space-y-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="hasSeating"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t('forms.hasSeating')}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hasPicnicTable"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t('forms.hasPicnicTable')}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hasFencing"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t('forms.hasFencing')}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hasGarbageCan"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t('forms.hasGarbageCan')}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hasBathroomNearby"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t('forms.hasBathroomNearby')}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hasSoftPlayArea"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="font-normal">{t('forms.hasSoftPlayArea')}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            {/* Images Tab */}
                            <TabsContent value="images" className="mt-4">
                                <FormField
                                    control={form.control}
                                    name="images"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.images')}</FormLabel>
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value ?? []}
                                                    onChange={field.onChange}
                                                    coverImage={form.watch("coverImage") ?? null}
                                                    onCoverImageChange={(img) => form.setValue("coverImage", img)}
                                                    showCoverSelection
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t('admin.uploadImagesDescription')}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>
                        </Tabs>

                        <Separator />

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
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
                                        {t('common.saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {t('common.saveChanges')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
