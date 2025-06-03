"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import ImageUpload from "~/components/ui/image-upload";
import { CoordinatePickerMap } from "~/app/_components/coordinate-picker-map";
import { EquipmentSelector } from "~/components/ui/equipment-selector";
import { toast } from "sonner";
import { useTranslation } from "~/lib/i18n";
import { reverseGeocode } from "~/lib/geocoding";
import MunicipalitySelector from "~/components/municipality-selector";

// Create a schema that matches the backend update mutation
const updatePlaygroundSchema = z.object({
    title: z.string().min(1, "Title is required").max(256, "Title too long"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    municipality: z.string().max(256).optional(),
    publiclyAccessible: z.boolean(),
    toddlerFriendly: z.boolean(),
    coverImage: z.string().nullable(),
    images: z.array(z.string()),
    equipmentIds: z.array(z.number()),
});

type UpdatePlaygroundForm = z.infer<typeof updatePlaygroundSchema>;

interface EditPlaygroundDialogProps {
    playground: Playground;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPlaygroundDeleted?: () => void;
}

export default function EditPlaygroundDialog({
    playground,
    open,
    onOpenChange,
    onPlaygroundDeleted,
}: EditPlaygroundDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [coordinateMethod, setCoordinateMethod] = useState<"manual" | "map">("map");
    const previousCoordinatesRef = useRef<{ lat: number; lng: number } | null>(null);
    const utils = api.useUtils();
    const { t } = useTranslation();

    const form = useForm<UpdatePlaygroundForm>({
        resolver: zodResolver(updatePlaygroundSchema),
        defaultValues: {
            title: playground.title,
            latitude: playground.latitude,
            longitude: playground.longitude,
            municipality: playground.municipality || "",
            publiclyAccessible: playground.publiclyAccessible,
            toddlerFriendly: playground.toddlerFriendly,
            coverImage: playground.coverImage,
            images: playground.images ?? [],
            equipmentIds: playground.playgroundEquipment?.map(pe => pe.equipmentId) ?? [],
        },
    });

    const updatePlayground = api.playground.update.useMutation({
        onSuccess: () => {
            toast.success(t('success.playgroundUpdated'));
            void utils.playground.getAll.invalidate();
            void utils.playground.getAllForAdmin.invalidate();
            onOpenChange(false);
        },
        onError: (error: { message: string }) => {
            toast.error(t('admin.failedToUpdatePlayground', { error: error.message }));
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    const deletePlayground = api.playground.delete.useMutation({
        onSuccess: () => {
            toast.success(t('success.playgroundDeleted'));
            void utils.playground.getAll.invalidate();
            void utils.playground.getAllForAdmin.invalidate();
            void utils.playground.getPendingSubmissions.invalidate();
            onOpenChange(false);
            onPlaygroundDeleted?.();
        },
        onError: (error: { message: string }) => {
            toast.error(t('admin.failedToDeletePlayground', { error: error.message }));
        },
        onSettled: () => {
            setIsDeleting(false);
        },
    });

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deletePlayground.mutateAsync({ id: playground.id });
        } catch (error) {
            // Error handling is done in the mutation callbacks
        }
    };

    const onSubmit = async (data: UpdatePlaygroundForm) => {
        setIsSubmitting(true);
        try {
            // Filter out empty image URLs
            const cleanImages = data.images?.filter((img) => img.trim() !== "") || [];

            await updatePlayground.mutateAsync({
                id: playground.id,
                ...data,
                images: cleanImages,
            });
        } catch (error) {
            // Error handling is done in the mutation callbacks
        }
    };

    // Helper function to get current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    form.setValue("latitude", position.coords.latitude);
                    form.setValue("longitude", position.coords.longitude);
                },
                (error) => {
                    console.error("Error getting location:", error);
                },
            );
        }
    };

    // Handle coordinate changes from map
    const handleMapCoordinateChange = async (lat: number, lng: number) => {
        form.setValue("latitude", lat);
        form.setValue("longitude", lng);
        
        // Auto-fill municipality using reverse geocoding
        try {
            const geocodeResult = await reverseGeocode(lat, lng);
            if (geocodeResult.municipality) {
                // Always update municipality when map pin is moved
                form.setValue("municipality", geocodeResult.municipality);
                console.log("Municipality auto-filled from map:", geocodeResult.municipality);
            }
        } catch (error) {
            console.error("Failed to reverse geocode coordinates:", error);
        }
    };

    const currentLatitude = form.watch("latitude");
    const currentLongitude = form.watch("longitude");

    // Auto-fill municipality when coordinates change (manual entry)
    useEffect(() => {
        const currentCoords = { lat: currentLatitude, lng: currentLongitude };
        const previousCoords = previousCoordinatesRef.current;
        
        // Skip if coordinates haven't actually changed
        if (previousCoords && 
            Math.abs(previousCoords.lat - currentCoords.lat) < 0.000001 &&
            Math.abs(previousCoords.lng - currentCoords.lng) < 0.000001) {
            return;
        }
        
        // Skip if this is the initial form population (no previous coordinates)
        if (!previousCoords) {
            previousCoordinatesRef.current = currentCoords;
            return;
        }

        // Update the reference for next comparison
        previousCoordinatesRef.current = currentCoords;

        const timeoutId = setTimeout(async () => {
            if (currentLatitude && currentLongitude) {
                try {
                    const geocodeResult = await reverseGeocode(currentLatitude, currentLongitude);
                    if (geocodeResult.municipality) {
                        // Always update municipality when coordinates change
                        form.setValue("municipality", geocodeResult.municipality);
                        console.log("Municipality auto-filled:", geocodeResult.municipality);
                    }
                } catch (error) {
                    console.error("Failed to reverse geocode coordinates:", error);
                }
            }
        }, 1000); // Debounce for 1 second

        return () => clearTimeout(timeoutId);
    }, [currentLatitude, currentLongitude, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {t('playground.editPlayground')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('admin.updatePlaygroundDetails')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Title */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('playground.playgroundName')} *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('playground.enterPlaygroundName')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Location Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">{t('playground.location')}</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={getCurrentLocation}
                                    className="text-sm"
                                >
                                    <MapPin className="mr-2 h-4 w-4" />
                                    {t('forms.useCurrentLocation')}
                                </Button>
                            </div>

                            <Tabs
                                value={coordinateMethod}
                                onValueChange={(value) =>
                                    setCoordinateMethod(value as "manual" | "map")
                                }
                                className="w-full"
                            >
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="map">{t('forms.pickOnMap')}</TabsTrigger>
                                    <TabsTrigger value="manual">{t('forms.manualEntry')}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="manual" className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="latitude"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('playground.latitude')} *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="64.1466"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>{t('forms.range')}: -90 to 90</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="longitude"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('playground.longitude')} *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="any"
                                                            placeholder="-21.9426"
                                                            {...field}
                                                            onChange={(e) =>
                                                                field.onChange(parseFloat(e.target.value) || 0)
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormDescription>{t('forms.range')}: -180 to 180</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="map" className="space-y-4">
                                    <div className="rounded-lg border">
                                        <CoordinatePickerMap
                                            latitude={currentLatitude}
                                            longitude={currentLongitude}
                                            onCoordinateChange={handleMapCoordinateChange}
                                            className="h-80 w-full"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-muted-foreground">
                                                {t('forms.selectedLatitude')}:
                                            </span>
                                            <span className="rounded bg-muted px-2 py-1 font-mono">
                                                {currentLatitude.toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-muted-foreground">
                                                {t('forms.selectedLongitude')}:
                                            </span>
                                            <span className="rounded bg-muted px-2 py-1 font-mono">
                                                {currentLongitude.toFixed(6)}
                                            </span>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Municipality Field - positioned after location */}
                        <FormField
                            control={form.control}
                            name="municipality"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('playground.municipality')}</FormLabel>
                                    <FormControl>
                                        <MunicipalitySelector
                                            value={field.value || ""}
                                            onValueChange={field.onChange}
                                            placeholder={t('playground.selectMunicipality')}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('playground.municipalityDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Accessibility Options */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">{t('forms.accessibilityAndFeatures')}</h3>

                            <FormField
                                control={form.control}
                                name="publiclyAccessible"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{t('playground.publiclyAccessible')}</FormLabel>
                                            <FormDescription>
                                                {t('forms.publiclyAccessibleDescription')}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="toddlerFriendly"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>{t('playground.toddlerFriendly')}</FormLabel>
                                            <FormDescription>
                                                {t('forms.toddlerFriendlyDescription')}
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Equipment Section */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="equipmentIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('playground.playgroundEquipment')}</FormLabel>
                                        <FormControl>
                                            <EquipmentSelector
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t('forms.selectEquipmentAtPlayground')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Images Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">{t('playground.images')}</h3>

                            <FormField
                                control={form.control}
                                name="images"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('playground.playgroundImages')}</FormLabel>
                                        <FormControl>
                                            <ImageUpload
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                config={{
                                                    maxFiles: 8,
                                                    maxSize: 4 * 1024 * 1024, // 4MB
                                                }}
                                                showCoverSelection
                                                coverImage={form.watch("coverImage")}
                                                onCoverImageChange={(url) => {
                                                    form.setValue("coverImage", url);
                                                }}
                                                disabled={isSubmitting}
                                                onReset={() => field.onChange([])}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t('forms.playgroundImagesDescription')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="flex justify-between">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={isSubmitting || isDeleting}
                                        className="mr-auto"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('playground.deletePlayground')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('forms.areYouSure')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('forms.deleteConfirmation')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {isDeleting ? t('actions.deleting') : t('playground.deletePlayground')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSubmitting || isDeleting}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={isSubmitting || isDeleting}>
                                    {isSubmitting ? t('actions.updating') : t('forms.updatePlayground')}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 