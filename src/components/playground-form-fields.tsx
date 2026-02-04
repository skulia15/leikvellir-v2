"use client";

import {
  MapPin,
  Users,
  Coffee,
  Shield,
  Camera,
  UserX,
  GraduationCap,
} from "lucide-react";
import { type UseFormReturn } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
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
import { CoordinatePickerMap } from "~/app/_components/coordinate-picker-map";
import { EquipmentSelector } from "~/components/ui/equipment-selector";
import MunicipalitySelector from "~/components/municipality-selector";
import { useTranslation } from "~/lib/i18n";

// Generic form values type that works with all playground forms
export interface PlaygroundFormValues {
  title: string;
  latitude: number;
  longitude: number;
  municipality?: string | null;
  publiclyAccessible: boolean;
  toddlerFriendly: boolean;
  isSchoolGround: boolean;
  schoolType?: "preschool" | "elementary" | null;
  hasSeating: boolean;
  hasPicnicTable: boolean;
  hasFencing: boolean;
  hasGarbageCan: boolean;
  hasBathroomNearby: boolean;
  hasSoftPlayArea: boolean;
  equipmentIds: number[];
  images: string[];
  coverImage?: string | null;
  submitAnonymously?: boolean;
}

export interface PlaygroundFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  disabled?: boolean;
  showCoverSelection?: boolean;
  showMunicipality?: boolean;
  showAnonymousSubmission?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  onCoordinateChange?: (lat: number, lng: number) => void;
  locationHeaderAction?: React.ReactNode;
  coordinateMethod?: "manual" | "map";
  onCoordinateMethodChange?: (method: "manual" | "map") => void;
}

export function PlaygroundFormFields({
  form,
  disabled = false,
  showCoverSelection = false,
  showMunicipality = true,
  showAnonymousSubmission = true,
  onUploadingChange,
  onCoordinateChange,
  locationHeaderAction,
  coordinateMethod = "map",
  onCoordinateMethodChange,
}: PlaygroundFormFieldsProps) {
  const { t } = useTranslation();

  const currentLatitude = form.watch("latitude");
  const currentLongitude = form.watch("longitude");
  const isSchoolGround = form.watch("isSchoolGround");
  const coverImage = form.watch("coverImage");

  const handleMapCoordinateChange = (lat: number, lng: number) => {
    form.setValue("latitude", lat);
    form.setValue("longitude", lng);
    onCoordinateChange?.(lat, lng);
  };

  const handleCoverImageChange = (img: string | null) => {
    form.setValue("coverImage", img);
  };

  return (
    <div className="space-y-6">
      {/* Title Field */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {t("playground.playgroundName")} *
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t("playground.enterPlaygroundName")}
                disabled={disabled}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Images Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {t("forms.uploadImages")}
        </h3>

        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ImageUpload
                  value={field.value || []}
                  onChange={field.onChange}
                  config={{
                    maxFiles: 8,
                    maxSize: 4 * 1024 * 1024,
                  }}
                  disabled={disabled}
                  onUploadingChange={onUploadingChange}
                  showCoverSelection={showCoverSelection}
                  coverImage={coverImage}
                  onCoverImageChange={handleCoverImageChange}
                />
              </FormControl>
              <FormDescription>
                {t("forms.playgroundImagesDescriptionBatch")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Location Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("playground.location")}
          </h3>
          {locationHeaderAction}
        </div>

        <Tabs
          value={coordinateMethod}
          onValueChange={(value) =>
            onCoordinateMethodChange?.(value as "manual" | "map")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">{t("forms.pickOnMap")}</TabsTrigger>
            <TabsTrigger value="manual">{t("forms.manualEntry")}</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("playground.latitude")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="64.1466"
                        disabled={disabled}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t("forms.range")}: -90 to 90
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("playground.longitude")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-21.9426"
                        disabled={disabled}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t("forms.range")}: -180 to 180
                    </FormDescription>
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
                expandable={true}
                showSearch={true}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Municipality Field */}
      {showMunicipality && (
        <FormField
          control={form.control}
          name="municipality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("playground.municipality")}</FormLabel>
              <FormControl>
                <MunicipalitySelector
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder={t("playground.selectMunicipality")}
                  disabled={disabled}
                />
              </FormControl>
              <FormDescription>
                {t("playground.municipalityDescription")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* School Ground Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {t("forms.schoolGroundSettings")}
        </h3>

        <FormField
          control={form.control}
          name="isSchoolGround"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <label className="flex items-start space-x-3 cursor-pointer">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t("forms.isSchoolGround")}
                  </FormLabel>
                  <FormDescription>
                    {t("forms.isSchoolGroundDescription")}
                  </FormDescription>
                </div>
              </label>
            </FormItem>
          )}
        />

        {/* School Type - only show if isSchoolGround is true */}
        {isSchoolGround && (
          <FormField
            control={form.control}
            name="schoolType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{t("forms.schoolType")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value ?? undefined}
                    className="flex flex-col space-y-2"
                    disabled={disabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="preschool" id="preschool" />
                      <FormLabel
                        htmlFor="preschool"
                        className="font-normal cursor-pointer"
                      >
                        {t("forms.preschoolType")}
                      </FormLabel>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="elementary" id="elementary" />
                      <FormLabel
                        htmlFor="elementary"
                        className="font-normal cursor-pointer"
                      >
                        {t("forms.elementaryType")}
                      </FormLabel>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  {t("forms.schoolTypeDescription")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Accessibility Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("forms.accessibilityAndFeatures")}
        </h3>

        <FormField
          control={form.control}
          name="publiclyAccessible"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <label className="flex items-start space-x-3 cursor-pointer">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t("forms.publiclyAccessible")}
                  </FormLabel>
                  <FormDescription>
                    {t("forms.publiclyAccessibleDescription")}
                  </FormDescription>
                </div>
              </label>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toddlerFriendly"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <label className="flex items-start space-x-3 cursor-pointer">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t("forms.toddlerFriendly")}
                  </FormLabel>
                  <FormDescription>
                    {t("forms.toddlerFriendlyDescription")}
                  </FormDescription>
                </div>
              </label>
            </FormItem>
          )}
        />
      </div>

      {/* Amenities Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          {t("forms.amenities")}
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="hasSeating"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      {t("forms.hasSeating")}
                    </FormLabel>
                    <FormDescription>
                      {t("forms.hasSeatingDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasPicnicTable"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      {t("forms.hasPicnicTable")}
                    </FormLabel>
                    <FormDescription>
                      {t("forms.hasPicnicTableDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasGarbageCan"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      {t("forms.hasGarbageCan")}
                    </FormLabel>
                    <FormDescription>
                      {t("forms.hasGarbageCanDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasBathroomNearby"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      {t("forms.hasBathroomNearby")}
                    </FormLabel>
                    <FormDescription>
                      {t("forms.hasBathroomNearbyDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Safety, Structure & Equipment Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("forms.safetyAndStructure")}
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="hasFencing"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      {t("forms.hasFencing")}
                    </FormLabel>
                    <FormDescription>
                      {t("forms.hasFencingDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasSoftPlayArea"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      {t("forms.hasSoftPlayArea")}
                    </FormLabel>
                    <FormDescription>
                      {t("forms.hasSoftPlayAreaDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />
        </div>

        {/* Equipment Selector */}
        <div className="mt-8">
          <FormField
            control={form.control}
            name="equipmentIds"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <EquipmentSelector
                    value={field.value || []}
                    onChange={field.onChange}
                    variant="card"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Anonymous Submission */}
      {showAnonymousSubmission && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="submitAnonymously"
            render={({ field }) => (
              <FormItem className="space-y-0 rounded-md border p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                      <UserX className="h-4 w-4" />
                      {t("forms.submitAnonymously")}
                    </FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      {t("forms.submitAnonymouslyDescription")}
                    </FormDescription>
                  </div>
                </label>
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
