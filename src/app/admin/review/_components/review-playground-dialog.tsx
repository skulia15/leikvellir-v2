"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    Check,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CoordinatePickerMap } from "~/app/_components/coordinate-picker-map";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
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
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { useT } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";

const reviewFormSchema = z.object({
    title: z.string().min(1, "Title is required").max(256),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    publiclyAccessible: z.boolean(),
    toddlerFriendly: z.boolean(),
    coverImage: z.string().nullable(),
    images: z.array(z.string()),
    rejectionReason: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface ReviewPlaygroundDialogProps {
    playground: Playground;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onReview: () => void;
}

export default function ReviewPlaygroundDialog({
    playground,
    open,
    onOpenChange,
    onReview,
}: ReviewPlaygroundDialogProps) {
    const [selectedAction, setSelectedAction] = useState<"approve" | "reject" | null>(null);
    const [showRejectionReason, setShowRejectionReason] = useState(false);
    const t = useT();

    // Ensure we have a cover image - use existing cover or first image as default
    const validImages = (playground.images ?? []).filter(img => img && img.trim() !== "");
    const firstImage = validImages.length > 0 ? validImages[0] : null;
    const defaultCoverImage = playground.coverImage ?? firstImage;

    const form = useForm<ReviewFormData>({
        resolver: zodResolver(reviewFormSchema),
        defaultValues: {
            title: playground.title,
            latitude: playground.latitude,
            longitude: playground.longitude,
            publiclyAccessible: playground.publiclyAccessible,
            toddlerFriendly: playground.toddlerFriendly,
            coverImage: defaultCoverImage,
            images: validImages,
            rejectionReason: "",
        },
    });

    // Auto-select first image as cover if no cover is selected
    useEffect(() => {
        const currentImages = form.getValues("images") || [];
        let currentCover = form.getValues("coverImage");

        // If no cover is selected but there are images, select the first one
        if (!currentCover && currentImages.length > 0) {
            currentCover = currentImages[0] || null;
            form.setValue("coverImage", currentCover);
            toast.info("Automatically selected first image as cover");
        }
    }, [form, open]); // Run when dialog opens

    const reviewMutation = api.playground.review.useMutation({
        onSuccess: () => {
            toast.success(
                selectedAction === "approve"
                    ? "Playground approved successfully"
                    : "Playground rejected"
            );
            onReview();
            onOpenChange(false);
            setSelectedAction(null);
            setShowRejectionReason(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to review playground");
        },
    });

    const handleReview = (action: "approve" | "reject") => {
        if (action === "reject") {
            setSelectedAction("reject");
            setShowRejectionReason(true);
            return;
        }

        const formData = form.getValues();

        // Ensure there's a cover image when approving
        if (action === "approve") {
            const currentImages = formData.images || [];
            let currentCover = formData.coverImage;

            // If no cover is selected but there are images, select the first one
            if (!currentCover && currentImages.length > 0) {
                currentCover = currentImages[0] || null;
                form.setValue("coverImage", currentCover);
                toast.info("Automatically selected first image as cover");
            }

            // Validate that we have a cover image for approval
            if (!currentCover) {
                toast.error("A cover image must be selected before approving. Please add images or select a cover.");
                return;
            }
        }

        reviewMutation.mutate({
            id: playground.id,
            action,
            ...formData,
        });
    };

    const handleRejectWithReason = () => {
        const formData = form.getValues();
        const rejectionReason = formData.rejectionReason;

        if (!rejectionReason || rejectionReason.trim() === "") {
            toast.error("Please provide a rejection reason");
            return;
        }

        reviewMutation.mutate({
            id: playground.id,
            action: "reject",
            rejectionReason,
            ...formData,
        });
    };

    const formatCoordinates = (lat: number, lng: number) => {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    };

    const displayImages = playground.coverImage
        ? [playground.coverImage, ...validImages]
        : validImages.length > 0
            ? validImages
            : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {t('admin.reviewPlaygroundSubmission')}
                        <Badge variant="secondary">#{playground.id}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {t('admin.reviewSubmissionDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <Tabs defaultValue="details" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="details">{t('admin.details')}</TabsTrigger>
                            <TabsTrigger value="images">{t('admin.images')}</TabsTrigger>
                            <TabsTrigger value="location">{t('admin.location')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.playgroundName')}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
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
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">{t('admin.submissionDetails')}</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">{t('admin.submittedBy')}:</span>
                                        <span className="ml-2 font-medium">{playground.createdById}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">{t('admin.submittedOn')}:</span>
                                        <span className="ml-2 font-medium">
                                            {new Date(playground.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="images" className="space-y-4">
                            <div className="space-y-4">
                                {/* Cover Image Info */}
                                {form.watch("coverImage") && (
                                    <div className="rounded-md border border-green-200 bg-green-50 p-3">
                                        <p className="text-sm text-green-800">
                                            <strong>{t('admin.coverImageSelected')}:</strong> {t('admin.coverImageDescription')}
                                        </p>
                                    </div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="images"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.playgroundImages')}</FormLabel>
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    config={{
                                                        maxFiles: 8,
                                                        maxSize: 4 * 1024 * 1024, // 4MB
                                                    }}
                                                    coverImage={form.watch("coverImage")}
                                                    onCoverImageChange={(url) => form.setValue("coverImage", url)}
                                                    showCoverSelection={true}
                                                    onReset={() => field.onChange([])}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t('admin.uploadImagesDescription')}
                                                <strong> {t('admin.coverImageRequired')}</strong>
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="location" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="latitude"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('playground.latitude')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                                                    step="any"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="h-64 w-full rounded-lg overflow-hidden border">
                                <CoordinatePickerMap
                                    latitude={form.watch("latitude")}
                                    longitude={form.watch("longitude")}
                                    onCoordinateChange={(lat, lng) => {
                                        form.setValue("latitude", lat);
                                        form.setValue("longitude", lng);
                                    }}
                                    className="h-full w-full"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {showRejectionReason && (
                        <div className="space-y-4 border-t pt-4">
                            <FormField
                                control={form.control}
                                name="rejectionReason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('admin.rejectionReason')}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t('admin.rejectionReasonPlaceholder')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4 border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                                setSelectedAction(null);
                                setShowRejectionReason(false);
                            }}
                        >
                            {t('common.cancel')}
                        </Button>

                        <div className="flex items-center gap-2">
                            {showRejectionReason ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowRejectionReason(false);
                                            setSelectedAction(null);
                                        }}
                                    >
                                        {t('common.back')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleRejectWithReason}
                                        disabled={reviewMutation.isPending}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        {t('admin.rejectSubmission')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => handleReview("reject")}
                                        disabled={reviewMutation.isPending}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        {t('admin.reject')}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => handleReview("approve")}
                                        disabled={reviewMutation.isPending}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        {t('admin.approve')}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 