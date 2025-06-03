"use client";

import { CheckCircle2, Loader2, MapPin } from "lucide-react";
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
import { Checkbox } from "~/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { api } from "~/trpc/react";
import { CreatePlaygroundSchema, type CreatePlaygroundInput } from "~/types";
import { CoordinatePickerMap } from "./coordinate-picker-map";
import { toast } from "sonner";
import { EquipmentSelector } from "~/components/ui/equipment-selector";
import { useT } from "~/lib/i18n";
import { reverseGeocode } from "~/lib/geocoding";

export function CreatePlaygroundForm() {
  const utils = api.useUtils();
  const router = useRouter();
  const t = useT();
  const [coordinateMethod, setCoordinateMethod] = useState<"manual" | "map">(
    "map",
  );

  const form = useForm<CreatePlaygroundInput>({
    resolver: zodResolver(CreatePlaygroundSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      latitude: 64.071, // TODO: default to Hafnarfjörður
      longitude: -21.954,
      municipality: "",
      publiclyAccessible: true,
      toddlerFriendly: false,
      equipmentIds: [],
      images: [],
    },
  });

  const createPlayground = api.playground.create.useMutation({
    onSuccess: async (data) => {
      await utils.playground.invalidate();
      toast.success(`"${data?.title}" ${t('playground.playgroundSubmitted')}`);
      form.reset();
      // Redirect to homepage after successful creation
      router.push("/");
    },
    onError: (error) => {
      console.error("Failed to create playground:", error);
      console.error("Error details:", error.data);
      toast.error(`${t('forms.failedToCreate')}: ${error.message}`);
    },
  });

  const onSubmit = (data: CreatePlaygroundInput) => {
    console.log("Submitting form with data:", data);
    console.log("Images in form data:", data.images);

    // Check if form has any validation errors
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0) {
      console.log("Form has validation errors:", errors);
      toast.error(t('forms.fixFormErrors'));
      return;
    }

    // Filter out empty strings from images array and ensure it's properly formatted
    const validImages = (data.images || []).filter(img => img && img.trim() !== "");

    const submissionData = {
      ...data,
      images: validImages,
    };

    console.log("Processed submission data:", submissionData);
    console.log("Valid images for submission:", validImages);

    createPlayground.mutate(submissionData);
  };

  // Custom reset function that also clears images
  const handleReset = () => {
    form.reset();
    // The ImageUpload component will handle its own reset via the onReset prop
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

  // Auto-fill municipality when coordinates change (manual entry)
  const currentLatitude = form.watch("latitude");
  const currentLongitude = form.watch("longitude");

  useEffect(() => {
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
    <Card className="mx-auto w-full max-w-4xl mb-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
            {/* Title Field */}
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

            {/* Municipality Field */}
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('playground.municipality')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('playground.enterMunicipality')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('playground.municipalityDescription')}
                  </FormDescription>
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
                      <FormLabel>{t('forms.publiclyAccessible')}</FormLabel>
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
                      <FormLabel>{t('forms.toddlerFriendly')}</FormLabel>
                      <FormDescription>
                        {t('forms.toddlerFriendlyDescription')}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Equipment Selector */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('playground.equipment')}</h3>

              <FormField
                control={form.control}
                name="equipmentIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('playground.equipment')}</FormLabel>
                    <FormControl>
                      <EquipmentSelector
                        value={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('forms.selectEquipmentDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('forms.uploadImages')}</h3>

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
                        disabled={createPlayground.isPending}
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

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={createPlayground.isPending}
              >
                {t('playground.reset')}
              </Button>
              <Button
                type="submit"
                disabled={createPlayground.isPending}
                className="min-w-32"
                onClick={() => {
                  console.log("Submit button clicked!");
                  // This is to debug - the form's onSubmit should still handle the actual submission
                }}
              >
                {createPlayground.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('playground.creating')}
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
