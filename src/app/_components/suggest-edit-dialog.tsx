"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import {
  Edit,
  GraduationCap,
  Users,
  Coffee,
  Shield,
  Camera,
  MapPin
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
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
import { Checkbox } from "~/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import ImageUpload from "~/components/ui/image-upload";
import { useTranslation } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { type Playground, CreateEditSuggestionSchema, type CreateEditSuggestionInput } from "~/types";
import { EquipmentSelector } from "~/components/ui/equipment-selector";
import MunicipalitySelector from "~/components/municipality-selector";
import { PlaygroundEquipmentIcon } from "~/components/icons";
import { useAdmin } from "~/lib/admin-context";
import { CoordinatePickerMap } from "./coordinate-picker-map";

interface SuggestEditDialogProps {
  playground: Playground;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuggestEditDialog({
  playground,
  open,
  onOpenChange,
}: SuggestEditDialogProps) {
  const { t } = useTranslation();
  const { canAccessAdmin, isAdminMode } = useAdmin();
  const [coordinateMethod, setCoordinateMethod] = useState<"manual" | "map">("map");
  const [isUploading, setIsUploading] = useState(false);

  // Track which images are marked for removal
  const [imagesMarkedForRemoval, setImagesMarkedForRemoval] = useState<string[]>([]);

  const form = useForm<CreateEditSuggestionInput>({
    resolver: zodResolver(CreateEditSuggestionSchema),
    defaultValues: {
      playgroundId: playground.id,
      // Pre-populate with current values - user can edit what they want to change
      title: playground.title,
      latitude: playground.latitude,
      longitude: playground.longitude,
      municipality: playground.municipality,
      publiclyAccessible: playground.publiclyAccessible,
      toddlerFriendly: playground.toddlerFriendly,
      isSchoolGround: playground.isSchoolGround,
      schoolType: playground.schoolType,
      hasSeating: playground.hasSeating,
      hasPicnicTable: playground.hasPicnicTable,
      hasFencing: playground.hasFencing,
      hasGarbageCan: playground.hasGarbageCan,
      hasBathroomNearby: playground.hasBathroomNearby,
      hasSoftPlayArea: playground.hasSoftPlayArea,
      equipmentIds: playground.playgroundEquipment?.map(pe => pe.equipment.id) ?? [],
      images: playground.images || [],
      submitAnonymously: false,
      // Fields to track images marked for removal (only additional images)
      removeImages: playground.images ? playground.images.map(() => false) : [],
    },
  });

  const createEditSuggestionMutation = api.playground.createEditSuggestion.useMutation({
    onSuccess: () => {
      toast.success(t('success.editSuggestionSubmitted'));
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit edit suggestion");
    },
  });

  const onSubmit = (data: CreateEditSuggestionInput) => {
    // Process image removal requests 
    const submissionData = { ...data };

    // Handle additional images marked for removal
    if (imagesMarkedForRemoval.length > 0 && playground.images) {
      submissionData.removeImages = playground.images.map(imageUrl =>
        imagesMarkedForRemoval.includes(imageUrl)
      );
    } else {
      // Ensure we have an empty array if nothing is marked
      submissionData.removeImages = [];
    }

    createEditSuggestionMutation.mutate(submissionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {t('playground.suggestEdit')}
          </DialogTitle>
          <DialogDescription>
            {t('playground.suggestEditDescription')}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('playground.playgroundInformation')}
              </h3>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('playground.playgroundName')} *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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


                <TabsContent value="map" className="space-y-4">
                  <div className="rounded-lg border">
                    <CoordinatePickerMap
                      latitude={form.watch('latitude') ?? 0}
                      longitude={form.watch('longitude') ?? 0}
                      onCoordinateChange={(lat, lng) => {
                        form.setValue('latitude', lat);
                        form.setValue('longitude', lng);
                      }}
                      className="h-80 w-full"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="manual" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>{t('forms.range')}: -180 to 180</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

              </Tabs>
            </div>

            {/* Municipality Field - Only visible to admin users in admin mode */}
            {canAccessAdmin && isAdminMode && (
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
                        placeholder={t('playground.selectMunicipality')}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('playground.municipalityDescription')}
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
                {t('forms.schoolGroundSettings')}
              </h3>

              <FormField
                control={form.control}
                name="isSchoolGround"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('forms.isSchoolGround')}</FormLabel>
                      <FormDescription>
                        {t('forms.isSchoolGroundDescription')}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* School Type - only show if isSchoolGround is true */}
              {form.watch('isSchoolGround') && (
                <FormField
                  control={form.control}
                  name="schoolType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('forms.schoolType')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value ?? undefined}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="preschool" id="preschool-suggest" />
                            <FormLabel htmlFor="preschool-suggest" className="font-normal cursor-pointer">
                              {t('forms.preschoolType')}
                            </FormLabel>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="elementary" id="elementary-suggest" />
                            <FormLabel htmlFor="elementary-suggest" className="font-normal cursor-pointer">
                              {t('forms.elementaryType')}
                            </FormLabel>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        {t('forms.schoolTypeDescription')}
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
                {t('forms.accessibilityAndFeatures')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormDescription className="text-xs">
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
                        <FormDescription className="text-xs">
                          {t('forms.toddlerFriendlyDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Amenities Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                {t('forms.amenities')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormDescription className="text-xs">
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
                        <FormDescription className="text-xs">
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
                        <FormDescription className="text-xs">
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
                        <FormDescription className="text-xs">
                          {t('forms.hasBathroomNearbyDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Safety & Structure Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('forms.safetyAndStructure')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormDescription className="text-xs">
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
                        <FormDescription className="text-xs">
                          {t('forms.hasSoftPlayAreaDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Equipment Selector */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <PlaygroundEquipmentIcon className="h-5 w-5" />
                  <h4 className="text-base font-medium">{t('playground.equipment')}</h4>
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

            {/* Images Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t('forms.uploadImages')}
              </h3>



              {/* Upload New Images */}
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
                        _allowRemoval={true}
                        markedForRemoval={imagesMarkedForRemoval}
                        onMarkForRemoval={(url, marked) => {
                          setImagesMarkedForRemoval(prev =>
                            marked
                              ? [...prev, url]
                              : prev.filter(item => item !== url)
                          );
                        }}
                        onUploadingChange={setIsUploading}
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



            {/* Note about changes */}
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>{t('common.note')}:</strong> {t('playground.editFieldsToSuggestChanges')}. {t('playground.onlyModifiedFieldsIncluded')}. {t('playground.adminWillReviewChanges')}.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
              >
                {t('common.cancel')}
              </Button>

              <Button
                type="submit"
                disabled={createEditSuggestionMutation.isPending || isUploading}
              >
                {createEditSuggestionMutation.isPending ? (
                  "Submitting..."
                ) : isUploading ? (
                  t('forms.uploadingImages')
                ) : (
                  t('playground.submitEditSuggestion')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
