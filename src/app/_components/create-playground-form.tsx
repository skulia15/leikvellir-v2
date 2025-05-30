"use client";

import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

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

import { type z } from "zod";
import { api } from "~/trpc/react";
import { type CreatePlaygroundSchema } from "~/types";
import { CoordinatePickerMap } from "./coordinate-picker-map";

type CreatePlaygroundFormData = z.infer<typeof CreatePlaygroundSchema>;

export function CreatePlaygroundForm() {
  const utils = api.useUtils();
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [coordinateMethod, setCoordinateMethod] = useState<"manual" | "map">(
    "map",
  );

  const form = useForm<CreatePlaygroundFormData>({
    // resolver: zodResolver(CreatePlaygroundSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      latitude: 64.071, // TODO: default to Hafnarfjörður
      longitude: -21.954,
      publiclyAccessible: true,
      toddlerFriendly: false,
      images: [],
    },
  });

  const createPlayground = api.playground.create.useMutation({
    onSuccess: async (data) => {
      await utils.playground.invalidate();
      setSuccessMessage(`"${data?.title}" has been created successfully!`);
      form.reset();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      console.error("Failed to create playground:", error);
      alert(`Error: ${error.message}`);
      setSuccessMessage("");
    },
  });

  const onSubmit = (data: CreatePlaygroundFormData) => {
    console.log("Submitting form with data:", data);

    // Ensure images array contains only valid URLs
    // Filter out any invalid entries that might be causing validation errors
    const validImages = Array.isArray(data.images)
      ? data.images.filter((url) => {
          try {
            // Attempt to create a URL object to validate
            new URL(url);
            return true; // Valid URL
          } catch (e) {
            console.warn("Filtered invalid image URL:", url);
            return false; // Invalid URL
          }
        })
      : [];

    // Submit with validated images array
    createPlayground.mutate({
      ...data,
      images: validImages,
    });

    setSuccessMessage("");
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
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Add New Playground
        </CardTitle>
        <CardDescription>
          Help other parents discover great playgrounds by adding detailed
          information about this location.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Success Message */}
            {successMessage && (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700">
                  {successMessage}
                </span>
              </div>
            )}

            {/* Title Field */}
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
              <h3 className="text-lg font-medium">Images (Optional)</h3>

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
                        disabled={createPlayground.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload up to 8 images of the playground. First image will
                      be used as cover.
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
                onClick={() => form.reset()}
                disabled={createPlayground.isPending}
              >
                Reset
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
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create Playground
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
