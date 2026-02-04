"use client";

import {
  CheckCircle2,
  Loader2,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form } from "~/components/ui/form";

import { api } from "~/trpc/react";
import { CreatePlaygroundSchema, type CreatePlaygroundInput } from "~/types";
import { toast } from "sonner";
import { useTranslation } from "~/lib/i18n";
import { reverseGeocode } from "~/lib/geocoding";
import { useAdmin } from "~/lib/admin-context";
import { PlaygroundFormFields } from "~/components/playground-form-fields";

export function CreatePlaygroundForm() {
  const utils = api.useUtils();
  const router = useRouter();
  const { t } = useTranslation();
  const { canAccessAdmin, isAdminMode } = useAdmin();
  const [coordinateMethod, setCoordinateMethod] = useState<"manual" | "map">(
    "map",
  );
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CreatePlaygroundInput>({
    resolver: zodResolver(CreatePlaygroundSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      latitude: 64.071,
      longitude: -21.954,
      municipality: "",
      publiclyAccessible: true,
      toddlerFriendly: false,
      hasSeating: false,
      hasPicnicTable: false,
      hasFencing: false,
      hasGarbageCan: false,
      hasBathroomNearby: false,
      hasSoftPlayArea: false,
      isSchoolGround: false,
      schoolType: null,
      submitAnonymously: false,
      equipmentIds: [],
      images: [],
    },
  });

  const createPlayground = api.playground.create.useMutation({
    onSuccess: async (data) => {
      await utils.playground.invalidate();
      toast.success(`"${data?.title}" ${t('playground.playgroundSubmitted')}`);
      form.reset();
      router.push("/");
    },
    onError: (error) => {
      console.error("Failed to create playground:", error);
      toast.error(`${t('forms.failedToCreate')}: ${error.message}`);
    },
  });

  const onSubmit = (data: CreatePlaygroundInput) => {
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      toast.error(t('forms.fixFormErrors'));
      return;
    }

    const validImages = (data.images || []).filter(img => img && img.trim() !== "");
    createPlayground.mutate({ ...data, images: validImages });
  };

  const handleReset = () => {
    form.reset();
  };

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

  // Auto-fill municipality when coordinates change (manual entry)
  const currentLatitude = form.watch("latitude");
  const currentLongitude = form.watch("longitude");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void (async () => {
        if (currentLatitude && currentLongitude) {
          try {
            const geocodeResult = await reverseGeocode(currentLatitude, currentLongitude);
            if (geocodeResult.municipality) {
              form.setValue("municipality", geocodeResult.municipality);
            }
          } catch (error) {
            console.error("Failed to reverse geocode coordinates:", error);
          }
        }
      })();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentLatitude, currentLongitude, form]);

  return (
    <Card className="mx-auto w-full max-w-4xl mb-24">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="h-5 w-5" />
          {t('playground.addNewPlayground')}
        </CardTitle>
        <CardDescription>
          {t('playground.helpParentsDiscover')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PlaygroundFormFields
              form={form}
              disabled={createPlayground.isPending}
              showCoverSelection={false}
              showMunicipality={canAccessAdmin && isAdminMode}
              showAnonymousSubmission={true}
              onUploadingChange={setIsUploading}
              onCoordinateChange={handleCoordinateChange}
              coordinateMethod={coordinateMethod}
              onCoordinateMethodChange={setCoordinateMethod}
              locationHeaderAction={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void getCurrentLocation()}
                  className="text-sm"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {t('forms.useCurrentLocation')}
                </Button>
              }
            />

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={createPlayground.isPending || isUploading}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t('playground.reset')}
              </Button>
              <Button
                type="submit"
                disabled={createPlayground.isPending || isUploading}
                className="min-w-32"
              >
                {createPlayground.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('playground.creating')}
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('forms.uploadingImages')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('playground.submitPlayground')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
