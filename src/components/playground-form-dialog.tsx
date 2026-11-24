"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  X,
  Loader2,
  Save,
  Trash2,
  User,
  Calendar,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "~/components/ui/badge";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";

import { useDateLocale, useTranslation } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { type Playground } from "~/types";
import { reverseGeocode } from "~/lib/geocoding";
import { PlaygroundFormFields } from "~/components/playground-form-fields";

const playgroundFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(256),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  municipality: z.string().nullable(),
  publiclyAccessible: z.boolean(),
  toddlerFriendly: z.boolean(),
  isSchoolGround: z.boolean(),
  schoolType: z.enum(["preschool", "elementary"]).nullable(),
  hasSeating: z.boolean(),
  hasPicnicTable: z.boolean(),
  hasFencing: z.boolean(),
  hasGarbageCan: z.boolean(),
  hasBathroomNearby: z.boolean(),
  hasSoftPlayArea: z.boolean(),
  equipmentIds: z.array(z.number()),
  coverImage: z.string().nullable(),
  images: z.array(z.string()),
  submitAnonymously: z.boolean(),
  rejectionReason: z.string().optional(),
});

type PlaygroundFormData = z.infer<typeof playgroundFormSchema>;

export type PlaygroundFormMode = "edit-pending" | "review" | "edit-approved";

interface PlaygroundFormDialogProps {
  playground: Playground;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onDeleted?: () => void;
  mode: PlaygroundFormMode;
}

export default function PlaygroundFormDialog({
  playground,
  open,
  onOpenChange,
  onSuccess,
  onDeleted,
  mode,
}: PlaygroundFormDialogProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const utils = api.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showRejectionReason, setShowRejectionReason] = useState(false);
  const [coordinateMethod, setCoordinateMethod] = useState<"manual" | "map">("map");
  const previousCoordinatesRef = useRef<{ lat: number; lng: number } | null>(null);

  // Helper to get default form values from playground
  const getDefaultValues = (pg: Playground): PlaygroundFormData => {
    const validImages = (pg.images ?? []).filter(img => img && img.trim() !== "");
    const firstImage = validImages.length > 0 ? validImages[0] : null;
    const defaultCoverImage = pg.coverImage ?? firstImage;

    return {
      title: pg.title,
      latitude: pg.latitude,
      longitude: pg.longitude,
      municipality: pg.municipality,
      publiclyAccessible: pg.publiclyAccessible,
      toddlerFriendly: pg.toddlerFriendly,
      isSchoolGround: pg.isSchoolGround ?? false,
      schoolType: pg.schoolType ?? null,
      hasSeating: pg.hasSeating ?? false,
      hasPicnicTable: pg.hasPicnicTable ?? false,
      hasFencing: pg.hasFencing ?? false,
      hasGarbageCan: pg.hasGarbageCan ?? false,
      hasBathroomNearby: pg.hasBathroomNearby ?? false,
      hasSoftPlayArea: pg.hasSoftPlayArea ?? false,
      equipmentIds: pg.playgroundEquipment?.map(pe => pe.equipment?.id ?? pe.equipmentId) ?? [],
      coverImage: defaultCoverImage ?? null,
      images: validImages,
      submitAnonymously: pg.submitAnonymously ?? false,
      rejectionReason: "",
    };
  };

  const form = useForm<PlaygroundFormData>({
    resolver: zodResolver(playgroundFormSchema),
    defaultValues: getDefaultValues(playground),
  });

  // Reset form when playground changes
  useEffect(() => {
    setShowRejectionReason(false);
    previousCoordinatesRef.current = null;
    form.reset(getDefaultValues(playground));
  }, [playground.id, form, playground]);

  // Auto-select first image as cover if none selected
  useEffect(() => {
    const currentImages = form.getValues("images") || [];
    const currentCover = form.getValues("coverImage");

    if (!currentCover && currentImages.length > 0) {
      form.setValue("coverImage", currentImages[0] ?? null);
    }
  }, [form, open]);

  // Update mutation for approved playgrounds (admin edit)
  const updateApprovedMutation = api.playground.update.useMutation({
    onSuccess: () => {
      toast.success(t("admin.playgroundUpdated"));
      void utils.playground.getAll.invalidate();
      void utils.playground.getAllForAdmin.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(t("admin.failedToUpdatePlayground", { error: error.message }));
    },
    onSettled: () => setIsSubmitting(false),
  });

  // Update mutation for pending playgrounds (owner edit)
  const updatePendingMutation = api.playground.updateMySubmission.useMutation({
    onSuccess: () => {
      toast.success(t("mySubmissions.updateSuccess"));
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      if (error.message.includes("already reviewed")) {
        toast.error(t("mySubmissions.alreadyReviewedError"));
      } else {
        toast.error(error.message || t("mySubmissions.updateError"));
      }
    },
    onSettled: () => setIsSubmitting(false),
  });

  // Review mutation for admin approval/rejection
  const reviewMutation = api.playground.review.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "approve"
          ? t("admin.playgroundApproved")
          : t("admin.playgroundRejected")
      );
      void utils.playground.getPendingSubmissions.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || t("admin.failedToReview"));
    },
    onSettled: () => setIsSubmitting(false),
  });

  // Delete mutation for admin
  const deleteMutation = api.playground.delete.useMutation({
    onSuccess: () => {
      toast.success(t("success.playgroundDeleted"));
      void utils.playground.getAll.invalidate();
      void utils.playground.getAllForAdmin.invalidate();
      onDeleted?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(t("admin.failedToDeletePlayground", { error: error.message }));
    },
    onSettled: () => setIsDeleting(false),
  });

  const handleCoordinateChange = async (lat: number, lng: number) => {
    try {
      const geocodeResult = await reverseGeocode(lat, lng);
      if (geocodeResult.municipality) {
        form.setValue("municipality", geocodeResult.municipality);
      }
    } catch (error) {
      console.error("Failed to reverse geocode coordinates:", error);
    }
  };

  // Auto-fill municipality when coordinates change manually
  const currentLatitude = form.watch("latitude");
  const currentLongitude = form.watch("longitude");

  useEffect(() => {
    const currentCoords = { lat: currentLatitude, lng: currentLongitude };
    const previousCoords = previousCoordinatesRef.current;

    if (previousCoords &&
        Math.abs(previousCoords.lat - currentCoords.lat) < 0.000001 &&
        Math.abs(previousCoords.lng - currentCoords.lng) < 0.000001) {
      return;
    }

    if (!previousCoords) {
      previousCoordinatesRef.current = currentCoords;
      return;
    }

    previousCoordinatesRef.current = currentCoords;

    const timeoutId = setTimeout(() => {
      void handleCoordinateChange(currentLatitude, currentLongitude);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentLatitude, currentLongitude]);

  const onInvalid = () => {
    toast.error(t("errors.validationError"));
  };

  const onValidSave = async (formData: PlaygroundFormData) => {
    const validImages = formData.images.filter(img => img && img.trim() !== "");

    setIsSubmitting(true);

    try {
      if (mode === "edit-approved") {
        await updateApprovedMutation.mutateAsync({
          id: playground.id,
          title: formData.title,
          latitude: formData.latitude,
          longitude: formData.longitude,
          municipality: formData.municipality ?? undefined,
          publiclyAccessible: formData.publiclyAccessible,
          toddlerFriendly: formData.toddlerFriendly,
          isSchoolGround: formData.isSchoolGround,
          schoolType: formData.schoolType,
          hasSeating: formData.hasSeating,
          hasPicnicTable: formData.hasPicnicTable,
          hasFencing: formData.hasFencing,
          hasGarbageCan: formData.hasGarbageCan,
          hasBathroomNearby: formData.hasBathroomNearby,
          hasSoftPlayArea: formData.hasSoftPlayArea,
          equipmentIds: formData.equipmentIds,
          coverImage: formData.coverImage,
          images: validImages,
        });
      } else if (mode === "edit-pending") {
        await updatePendingMutation.mutateAsync({
          id: playground.id,
          title: formData.title,
          latitude: formData.latitude,
          longitude: formData.longitude,
          municipality: formData.municipality ?? undefined,
          publiclyAccessible: formData.publiclyAccessible,
          toddlerFriendly: formData.toddlerFriendly,
          isSchoolGround: formData.isSchoolGround,
          schoolType: formData.schoolType,
          hasSeating: formData.hasSeating,
          hasPicnicTable: formData.hasPicnicTable,
          hasFencing: formData.hasFencing,
          hasGarbageCan: formData.hasGarbageCan,
          hasBathroomNearby: formData.hasBathroomNearby,
          hasSoftPlayArea: formData.hasSoftPlayArea,
          equipmentIds: formData.equipmentIds,
          coverImage: formData.coverImage,
          images: validImages,
          submitAnonymously: formData.submitAnonymously,
        });
      }
    } catch {
      // Error toast and isSubmitting reset are handled by mutation callbacks
    }
  };

  const handleSave = form.handleSubmit(onValidSave, onInvalid);

  const onValidApprove = async (formData: PlaygroundFormData) => {
    const validImages = formData.images.filter(img => img && img.trim() !== "");
    let coverImage = formData.coverImage;

    if (!coverImage && validImages.length > 0) {
      coverImage = validImages[0] ?? null;
      form.setValue("coverImage", coverImage);
    }

    setIsSubmitting(true);
    try {
      await reviewMutation.mutateAsync({
        id: playground.id,
        action: "approve",
        ...formData,
        coverImage,
        images: validImages,
      });
    } catch {
      // Error toast and isSubmitting reset are handled by mutation callbacks
    }
  };

  const handleApprove = form.handleSubmit(onValidApprove, onInvalid);

  const handleReject = () => {
    setShowRejectionReason(true);
  };

  const handleConfirmReject = async () => {
    const formData = form.getValues();
    const rejectionReason = formData.rejectionReason;

    if (!rejectionReason || rejectionReason.trim() === "") {
      toast.error(t("admin.rejectionReasonRequired"));
      return;
    }

    setIsSubmitting(true);
    await reviewMutation.mutateAsync({
      id: playground.id,
      action: "reject",
      rejectionReason,
      ...formData,
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteMutation.mutateAsync({ id: playground.id });
  };

  const isLoading = isSubmitting || isDeleting || isUploading;

  const getDialogTitle = () => {
    switch (mode) {
      case "review":
        return t("admin.reviewPlaygroundSubmission");
      case "edit-pending":
        return t("mySubmissions.editSubmission");
      case "edit-approved":
        return t("admin.editPlayground");
    }
  };

  const getDialogDescription = () => {
    switch (mode) {
      case "review":
        return t("admin.reviewSubmissionDescription");
      case "edit-pending":
        return t("mySubmissions.editSubmissionDescription");
      case "edit-approved":
        return t("admin.editPlaygroundDescription");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDialogTitle()}
            <Badge variant="secondary">#{playground.id}</Badge>
          </DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-6">
            <PlaygroundFormFields
              form={form}
              disabled={isLoading}
              showCoverSelection={true}
              showMunicipality={true}
              showAnonymousSubmission={mode !== "edit-approved"}
              onCoordinateChange={handleCoordinateChange}
              coordinateMethod={coordinateMethod}
              onCoordinateMethodChange={setCoordinateMethod}
              onUploadingChange={setIsUploading}
            />

            {/* Submission Metadata - Review mode only */}
            {mode === "review" && playground.createdBy && (
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {t("admin.submissionInfo")}
                </h4>
                <div className="flex flex-col gap-2 text-sm">
                  {!playground.submitAnonymously && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{playground.createdBy.name || playground.createdBy.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(playground.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Reason - Review mode with rejection flow */}
            {mode === "review" && showRejectionReason && (
              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.rejectionReason")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t("admin.rejectionReasonPlaceholder")}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Form>

        <DialogFooter className="flex justify-between gap-2 sm:justify-between">
          {/* Delete button - edit-approved mode only */}
          {mode === "edit-approved" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("admin.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("admin.deletePlayground")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("admin.deletePlaygroundConfirmation")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {t("admin.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="flex gap-2 ml-auto">
            {/* Review mode actions */}
            {mode === "review" && !showRejectionReason && (
              <>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("admin.reject")}
                </Button>
                <Button onClick={handleApprove} disabled={isLoading}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {t("admin.approve")}
                </Button>
              </>
            )}

            {/* Review mode - confirmation after clicking reject */}
            {mode === "review" && showRejectionReason && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionReason(false)}
                  disabled={isLoading}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmReject}
                  disabled={isLoading}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  {t("admin.confirmReject")}
                </Button>
              </>
            )}

            {/* Edit modes - save button */}
            {(mode === "edit-pending" || mode === "edit-approved") && (
              <Button onClick={handleSave} disabled={isLoading}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t("common.save")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
