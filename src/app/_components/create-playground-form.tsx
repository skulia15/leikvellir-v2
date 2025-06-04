"use client";

import {
  CheckCircle2,
  Loader2,
  MapPin,
  Users,
  Coffee,
  Shield,
  Camera,
  UserX,
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
import MunicipalitySelector from "~/components/municipality-selector";
import { useTranslation } from "~/lib/i18n";
import { reverseGeocode } from "~/lib/geocoding";
import { PlaygroundEquipmentIcon } from "~/components/icons";

export function CreatePlaygroundForm() {
  const utils = api.useUtils();
  const router = useRouter();
  const { t } = useTranslation();
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
      // Amenity defaults
      hasSeating: false,
      hasPicnicTable: false,
      hasFencing: false,
      hasGarbageCan: false,
      hasBathroomNearby: false,
      hasSoftPlayArea: false,
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
  const handleMapCoordinateChange = (lat: number, lng: number) => {
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);

    // Auto-fill municipality using reverse geocoding (async)
    void (async () => {
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
    })();
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
              // Always update municipality when coordinates change
              form.setValue("municipality", geocodeResult.municipality);
              console.log("Municipality auto-filled:", geocodeResult.municipality);
            }
          } catch (error) {
            console.error("Failed to reverse geocode coordinates:", error);
          }
        }
      })();
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
                  <FormLabel className="flex items-center gap-2">
                    {/* <Type className="h-4 w-4" /> */}
                    {t('playground.playgroundName')} *
                  </FormLabel>
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
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('playground.location')}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void getCurrentLocation();
                  }}
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
                  {/* <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
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
                  </div> */}
                </TabsContent>
              </Tabs>
            </div>

            {/* Municipality Field */}
            <FormField
              control={form.control}
              name="municipality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('playground.municipality')}</FormLabel>
                  <FormControl>
                    <MunicipalitySelector
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('playground.selectMunicipality')}
                      disabled={createPlayground.isPending}
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
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('forms.accessibilityAndFeatures')}
              </h3>

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

            {/* Amenities Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                {t('forms.amenities')}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hasSeating"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('forms.hasSeating')}</FormLabel>
                        <FormDescription>
                          {t('forms.hasSeatingDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasPicnicTable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('forms.hasPicnicTable')}</FormLabel>
                        <FormDescription>
                          {t('forms.hasPicnicTableDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasGarbageCan"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('forms.hasGarbageCan')}</FormLabel>
                        <FormDescription>
                          {t('forms.hasGarbageCanDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasBathroomNearby"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('forms.hasBathroomNearby')}</FormLabel>
                        <FormDescription>
                          {t('forms.hasBathroomNearbyDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Safety, Structure & Equipment Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('forms.safetyAndStructure')}
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hasFencing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('forms.hasFencing')}</FormLabel>
                        <FormDescription>
                          {t('forms.hasFencingDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasSoftPlayArea"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('forms.hasSoftPlayArea')}</FormLabel>
                        <FormDescription>
                          {t('forms.hasSoftPlayAreaDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Equipment Selector within the same section */}
              <div className="mt-8">
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <PlaygroundEquipmentIcon className="h-5 w-5" style={{ height: "1.4rem", width: "1.4rem" }} />
                    <h3 className="text-base font-medium">{t('playground.equipment')}</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="equipmentIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <EquipmentSelector
                            value={field.value || []}
                            onChange={field.onChange}
                            variant="inline"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t('forms.uploadImages')}
              </h3>

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
                          maxFiles: 8, // Max files per upload batch (unlimited total)
                          maxSize: 4 * 1024 * 1024, // 4MB
                        }}
                        disabled={createPlayground.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('forms.playgroundImagesDescriptionBatch')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Anonymous Submission */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="submitAnonymously"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        {t('forms.submitAnonymously')}
                      </FormLabel>
                      <FormDescription className="text-sm text-muted-foreground">
                        {t('forms.submitAnonymouslyDescription')}
                      </FormDescription>
                    </div>
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
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
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
