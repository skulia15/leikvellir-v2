"use client";

import { useState } from "react";
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
import { toast } from "sonner";

// Create a schema that matches the backend update mutation
const updatePlaygroundSchema = z.object({
    title: z.string().min(1, "Title is required").max(256, "Title too long"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    publiclyAccessible: z.boolean(),
    toddlerFriendly: z.boolean(),
    coverImage: z.string().nullable(),
    images: z.array(z.string()),
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
    const utils = api.useUtils();

    const form = useForm<UpdatePlaygroundForm>({
        resolver: zodResolver(updatePlaygroundSchema),
        defaultValues: {
            title: playground.title,
            latitude: playground.latitude,
            longitude: playground.longitude,
            publiclyAccessible: playground.publiclyAccessible,
            toddlerFriendly: playground.toddlerFriendly,
            coverImage: playground.coverImage,
            images: playground.images ?? [],
        },
    });

    const updatePlayground = api.playground.update.useMutation({
        onSuccess: () => {
            toast.success("Playground updated successfully");
            void utils.playground.getAll.invalidate();
            void utils.playground.getAllForAdmin.invalidate();
            onOpenChange(false);
        },
        onError: (error: { message: string }) => {
            toast.error(`Failed to update playground: ${error.message}`);
        },
        onSettled: () => {
            setIsSubmitting(false);
        },
    });

    const deletePlayground = api.playground.delete.useMutation({
        onSuccess: () => {
            toast.success("Playground deleted successfully");
            void utils.playground.getAll.invalidate();
            void utils.playground.getAllForAdmin.invalidate();
            void utils.playground.getPendingSubmissions.invalidate();
            onOpenChange(false);
            onPlaygroundDeleted?.();
        },
        onError: (error: { message: string }) => {
            toast.error(`Failed to delete playground: ${error.message}`);
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
    const handleMapCoordinateChange = (lat: number, lng: number) => {
        form.setValue("latitude", lat);
        form.setValue("longitude", lng);
    };

    const currentLatitude = form.watch("latitude");
    const currentLongitude = form.watch("longitude");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Edit Playground
                    </DialogTitle>
                    <DialogDescription>
                        Update the playground details below.
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
                                    <FormLabel>Playground Name *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter playground name (e.g., Central Park Playground)"
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
                                <h3 className="text-lg font-medium">Location</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={getCurrentLocation}
                                    className="text-sm"
                                >
                                    <MapPin className="mr-2 h-4 w-4" />
                                    Use Current Location
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
                                    <TabsTrigger value="map">Pick on Map</TabsTrigger>
                                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                </TabsList>

                                <TabsContent value="manual" className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="latitude"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Latitude *</FormLabel>
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
                                                    <FormDescription>Range: -90 to 90</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="longitude"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Longitude *</FormLabel>
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
                                                    <FormDescription>Range: -180 to 180</FormDescription>
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
                                                Selected Latitude:
                                            </span>
                                            <span className="rounded bg-muted px-2 py-1 font-mono">
                                                {currentLatitude.toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <span className="font-medium text-muted-foreground">
                                                Selected Longitude:
                                            </span>
                                            <span className="rounded bg-muted px-2 py-1 font-mono">
                                                {currentLongitude.toFixed(6)}
                                            </span>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Accessibility Options */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Accessibility & Features</h3>

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
                                            <FormLabel>Publicly Accessible</FormLabel>
                                            <FormDescription>
                                                This playground is open to the general public
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
                                            <FormLabel>Toddler Friendly</FormLabel>
                                            <FormDescription>
                                                Safe and suitable for children under 3 years old
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Images Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Images</h3>

                            <FormField
                                control={form.control}
                                name="images"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Playground Images</FormLabel>
                                        <FormControl>
                                            <ImageUpload
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                config={{
                                                    maxFiles: 8,
                                                    maxSize: 5 * 1024 * 1024, // 5MB
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
                                            Upload up to 8 images and click on an image to set it as the cover.
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
                                        Delete Playground
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the playground
                                            &quot;{playground.title}&quot; and remove all associated data and images from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {isDeleting ? "Deleting..." : "Delete Playground"}
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
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || isDeleting}>
                                    {isSubmitting ? "Updating..." : "Update Playground"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 