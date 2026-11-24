"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Check,
  X,
  Edit3,
  ArrowRight,
  MapPin,
  Users,
  GraduationCap,
  Coffee,
  Shield,
  Camera,
  Package
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import { CoordinatePickerMap } from "~/app/_components/coordinate-picker-map";
import { useDateLocale, useLocale, useTranslation } from "~/lib/i18n";
import { api } from "~/trpc/react";
import { type Playground, type Equipment } from "~/types";
import { handleMixedNameFormat } from "~/lib/multilingual-utils";

// Type for the edit suggestion (based on the schema)
interface PlaygroundEditSuggestion {
  id: number;
  playgroundId: number;
  status: "pending" | "approved" | "rejected";
  title?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  municipality?: string | null;
  publiclyAccessible?: boolean | null;
  toddlerFriendly?: boolean | null;
  isSchoolGround?: boolean | null;
  schoolType?: "preschool" | "elementary" | null;
  hasSeating?: boolean | null;
  hasPicnicTable?: boolean | null;
  hasFencing?: boolean | null;
  hasGarbageCan?: boolean | null;
  hasBathroomNearby?: boolean | null;
  hasSoftPlayArea?: boolean | null;
  coverImage?: string | null;
  images?: string[] | null;
  equipmentIds?: number[] | null;
  submitAnonymously?: boolean | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: Date;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
}

interface EditSuggestionReviewDialogProps {
  editSuggestion: PlaygroundEditSuggestion;
  originalPlayground: Playground;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: () => void;
}

// Equipment review selector component
interface EquipmentReviewSelectorProps {
  originalEquipmentIds: number[];
  suggestedEquipmentIds: number[];
  finalEquipmentIds: number[];
  onFinalEquipmentChange: (equipmentIds: number[]) => void;
}


function EquipmentReviewSelector({
  originalEquipmentIds,
  suggestedEquipmentIds,
  finalEquipmentIds,
  onFinalEquipmentChange,
}: EquipmentReviewSelectorProps) {
  const { t } = useTranslation();
  const currentLanguage = useLocale().locale;

  const { data: allEquipment } = api.equipment.getAll.useQuery();

  if (!allEquipment) {
    return (
      <div className="p-3 bg-gray-50 rounded border">
        <p className="text-sm text-gray-600">{t('equipment.loadingEquipment')}</p>
      </div>
    );
  }

  // Create equipment maps for easy lookup
  const equipmentMap = allEquipment.reduce((acc, eq) => {
    acc[eq.id] = eq;
    return acc;
  }, {} as Record<number, Equipment>);

  // Categorize equipment changes
  const currentEquipment = originalEquipmentIds.map(id => equipmentMap[id]).filter((eq): eq is Equipment => Boolean(eq));
  const suggestedEquipment = suggestedEquipmentIds.map(id => equipmentMap[id]).filter((eq): eq is Equipment => Boolean(eq));
  const finalEquipment = finalEquipmentIds.map(id => equipmentMap[id]).filter((eq): eq is Equipment => Boolean(eq));

  const addedEquipment = suggestedEquipment.filter(eq => !originalEquipmentIds.includes(eq.id));
  const removedEquipment = currentEquipment.filter(eq => !suggestedEquipmentIds.includes(eq.id));

  const toggleEquipment = (equipmentId: number) => {
    const newIds = finalEquipmentIds.includes(equipmentId)
      ? finalEquipmentIds.filter(id => id !== equipmentId)
      : [...finalEquipmentIds, equipmentId];
    onFinalEquipmentChange(newIds);
  };


  return (
    <div className="space-y-4 p-4 border rounded-lg bg-green-50">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {/* Current Equipment */}
        <div>
          <h4 className="font-medium text-red-700 mb-2">{t('admin.currentEquipment')} ({currentEquipment.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {currentEquipment.map((equipment) => (
              <div key={equipment.id} className="flex items-center gap-2 text-sm bg-red-50 p-2 rounded">
                <span className="flex-1">{handleMixedNameFormat(equipment.name, currentLanguage)}</span>
                {removedEquipment.some(eq => eq.id === equipment.id) && (
                  <Badge variant="destructive" className="text-xs">Removing</Badge>
                )}
              </div>
            ))}
            {currentEquipment.length === 0 && (
              <p className="text-sm text-gray-500 italic">{t('admin.noEquipment')}</p>
            )}
          </div>
        </div>

        {/* Suggested Changes */}
        <div>
          <h4 className="font-medium text-yellow-700 mb-2">{t('admin.suggestedChanges')}</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {addedEquipment.map((equipment) => (
              <div key={equipment.id} className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                <span className="flex-1">{handleMixedNameFormat(equipment.name, currentLanguage)}</span>
                <Badge variant="secondary" className="text-xs bg-green-100">Adding</Badge>
              </div>
            ))}
            {removedEquipment.map((equipment) => (
              <div key={equipment.id} className="flex items-center gap-2 text-sm bg-red-50 p-2 rounded">
                <span className="flex-1">{handleMixedNameFormat(equipment.name, currentLanguage)}</span>
                <Badge variant="destructive" className="text-xs">Removing</Badge>
              </div>
            ))}
            {addedEquipment.length === 0 && removedEquipment.length === 0 && (
              <p className="text-sm text-gray-500 italic">{t('admin.noChanges')}</p>
            )}
          </div>
        </div>

        {/* Final Equipment List */}
        <div>
          <h4 className="font-medium text-blue-700 mb-2">{t('admin.finalEquipmentList')} ({finalEquipment.length})</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {finalEquipment.map((equipment) => (
              <div key={equipment.id} className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                <Checkbox
                  checked={true}
                  onCheckedChange={() => toggleEquipment(equipment.id)}
                />
                <span className="flex-1">{handleMixedNameFormat(equipment.name, currentLanguage)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Equipment Section */}
      {/* <div className="border-t pt-4">
        <h5 className="font-medium mb-2">{t('admin.addMoreEquipment')}</h5>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          {allEquipment
            .filter(eq => !finalEquipmentIds.includes(eq.id))
            .map((equipment) => (
              <div key={equipment.id} className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => toggleEquipment(equipment.id)}
                />
                <span className="flex-1 text-xs">{t(equipment.name)}</span>
              </div>
            ))}
        </div>
      </div> */}
    </div>
  );
}

// Individual field change component with editable final value
interface EditableFieldChangeProps {
  label: string;
  originalValue: string | number | boolean | string[] | number[] | null | undefined;
  suggestedValue: string | number | boolean | string[] | number[] | null | undefined;
  finalValue: string | number | boolean | string[] | number[] | null | undefined;
  onFinalValueChange: (value: string | number | boolean | string[] | number[] | null | undefined) => void;
  type?: "text" | "boolean" | "coordinate" | "school_type" | "number" | "equipment" | "image" | "image_array";
  onImageClick?: (imageUrl: string) => void;
}

function EditableFieldChange({
  label,
  originalValue,
  suggestedValue,
  finalValue,
  onFinalValueChange,
  type = "text",
  onImageClick
}: EditableFieldChangeProps) {
  const { t } = useTranslation();

  const formatDisplayValue = (value: string | number | boolean | string[] | number[] | null | undefined, valueType: string) => {
    if (value === null || value === undefined) return t('common.notSet');

    switch (valueType) {
      case "boolean":
        return value ? t('common.yes') : t('common.no');
      case "coordinate":
      case "number":
        return typeof value === 'number' ? value.toString() : value;
      case "school_type":
        if (!value) return t('common.notSet');
        return value === 'preschool' ? t('forms.preschoolType') : t('forms.elementaryType');
      case "equipment":
        if (!Array.isArray(value) || value.length === 0) return t('common.notSet');
        return `${value.length} ${value.length === 1 ? t('equipment.itemSingular') : t('common.items')}`;
      case "image":
        return value ? (
          <Image
            src={value as string}
            alt="Cover image"
            width={64}
            height={64}
            className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
            loading="lazy"
            onClick={() => onImageClick?.(value as string)}
          />
        ) : t('common.notSet');
      case "image_array":
        if (!Array.isArray(value) || value.length === 0) return t('common.notSet');
        return (
          <div className="flex flex-wrap gap-2">
            {(value as string[]).map((imageUrl: string, index: number) => (
              <Image
                key={index}
                src={imageUrl}
                alt={`Additional image ${index + 1}`}
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                loading="lazy"
                onClick={() => onImageClick?.(imageUrl)}
              />
            ))}
          </div>
        );
      default:
        return value?.toString() ?? t('common.notSet');
    }
  };

  const renderFinalValueEditor = () => {
    switch (type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(finalValue ?? false)}
              onCheckedChange={onFinalValueChange}
            />
            <span className="text-sm">
              {finalValue ? t('common.yes') : t('common.no')}
            </span>
          </div>
        );

      case "school_type":
        return (
          <Select value={String(finalValue || "not_set")} onValueChange={(value) => onFinalValueChange(value === "not_set" ? null : value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('forms.selectSchoolType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_set">{t('common.notSet')}</SelectItem>
              <SelectItem value="preschool">{t('forms.preschoolType')}</SelectItem>
              <SelectItem value="elementary">{t('forms.elementaryType')}</SelectItem>
            </SelectContent>
          </Select>
        );

      case "coordinate":
      case "number":
        return (
          <Input
            type="number"
            step={type === "coordinate" ? "0.000001" : "1"}
            value={finalValue?.toString() ?? ""}
            onChange={(e) => onFinalValueChange(e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full"
          />
        );

      case "equipment":
        return (
          <EquipmentReviewSelector
            originalEquipmentIds={Array.isArray(originalValue) ? originalValue as number[] : []}
            suggestedEquipmentIds={Array.isArray(suggestedValue) ? suggestedValue as number[] : []}
            finalEquipmentIds={Array.isArray(finalValue) ? finalValue as number[] : (Array.isArray(suggestedValue) ? suggestedValue as number[] : [])}
            onFinalEquipmentChange={onFinalValueChange as (equipmentIds: number[]) => void}
          />
        );
      case "image":
      case "image_array":
        return (
          <div className="p-3 bg-gray-50 rounded border">
            <p className="text-sm text-gray-600">
              {t('admin.imageChangesNote')}
            </p>
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={finalValue?.toString() ?? ""}
            onChange={(e) => onFinalValueChange(e.target.value || null)}
            className="w-full"
          />
        );
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-blue-50 border-blue-200">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>

      {/* Previous vs Suggested Values */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{t('admin.previous')}:</span>
          <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
            {formatDisplayValue(originalValue, type)}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <div className="flex items-center gap-2">
          <span className="text-gray-600">{t('admin.suggested')}:</span>
          <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">
            {formatDisplayValue(suggestedValue, type)}
          </span>
        </div>
      </div>

      {/* Editable Final Value */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-blue-700">{t('admin.finalValueWillBeSaved')}:</Label>
        {renderFinalValueEditor()}
      </div>
    </div>
  );
}

export default function EditSuggestionReviewDialog({
  editSuggestion,
  originalPlayground,
  open,
  onOpenChange,
  onReview,
}: EditSuggestionReviewDialogProps) {
  // Calculate image changes (only when editSuggestion.images is explicitly provided)
  const originalImages = originalPlayground.images ?? [];
  const suggestedImages = editSuggestion.images;
  const hasSuggestedImages = Array.isArray(suggestedImages);
  const newImages = hasSuggestedImages
    ? suggestedImages.filter((img) => !originalImages.includes(img))
    : [];
  const removedImages = hasSuggestedImages
    ? originalImages.filter((img) => !suggestedImages.includes(img))
    : [];
  const keptOriginalImages = hasSuggestedImages
    ? originalImages.filter((img) => suggestedImages.includes(img))
    : originalImages;

  const isCoverImageRemoved =
    editSuggestion.coverImage === "" && Boolean(originalPlayground.coverImage);
  const isCoverImageChanged =
    isCoverImageRemoved ||
    (editSuggestion.coverImage !== null &&
      editSuggestion.coverImage !== undefined &&
      editSuggestion.coverImage !== "" &&
      editSuggestion.coverImage !== originalPlayground.coverImage);

  const hasImageChanges = newImages.length > 0 || removedImages.length > 0;
  const imageChangeCount = newImages.length + removedImages.length;
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [showRejectionReason, setShowRejectionReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // State for managing the full approved image list (kept original images + approved new images)
  const [approvedImages, setApprovedImages] = useState<string[]>([
    ...keptOriginalImages,
    ...newImages,
  ]);

  // State for final values that will be applied (initialized with suggested values)
  const [finalValues, setFinalValues] = useState({
    title: editSuggestion.title,
    latitude: editSuggestion.latitude,
    longitude: editSuggestion.longitude,
    municipality: editSuggestion.municipality,
    publiclyAccessible: editSuggestion.publiclyAccessible,
    toddlerFriendly: editSuggestion.toddlerFriendly,
    isSchoolGround: editSuggestion.isSchoolGround,
    schoolType: editSuggestion.schoolType,
    hasSeating: editSuggestion.hasSeating,
    hasPicnicTable: editSuggestion.hasPicnicTable,
    hasFencing: editSuggestion.hasFencing,
    hasGarbageCan: editSuggestion.hasGarbageCan,
    hasBathroomNearby: editSuggestion.hasBathroomNearby,
    hasSoftPlayArea: editSuggestion.hasSoftPlayArea,
    coverImage: editSuggestion.coverImage,
    images: editSuggestion.images,
    equipmentIds: editSuggestion.equipmentIds,
  });

  // Reset all dialog state when switching between edit suggestions
  useEffect(() => {
    const nextOrigImages = originalPlayground.images ?? [];
    const nextSuggestedImages = editSuggestion.images;
    const nextHasSuggested = Array.isArray(nextSuggestedImages);
    const nextKeptOrig = nextHasSuggested
      ? nextOrigImages.filter((img) => nextSuggestedImages.includes(img))
      : nextOrigImages;
    const nextNewImages = nextHasSuggested
      ? nextSuggestedImages.filter((img) => !nextOrigImages.includes(img))
      : [];

    setSelectedImage(null);
    setShowRejectionReason(false);
    setRejectionReason("");
    setApprovedImages([...nextKeptOrig, ...nextNewImages]);
    setFinalValues({
      title: editSuggestion.title,
      latitude: editSuggestion.latitude,
      longitude: editSuggestion.longitude,
      municipality: editSuggestion.municipality,
      publiclyAccessible: editSuggestion.publiclyAccessible,
      toddlerFriendly: editSuggestion.toddlerFriendly,
      isSchoolGround: editSuggestion.isSchoolGround,
      schoolType: editSuggestion.schoolType,
      hasSeating: editSuggestion.hasSeating,
      hasPicnicTable: editSuggestion.hasPicnicTable,
      hasFencing: editSuggestion.hasFencing,
      hasGarbageCan: editSuggestion.hasGarbageCan,
      hasBathroomNearby: editSuggestion.hasBathroomNearby,
      hasSoftPlayArea: editSuggestion.hasSoftPlayArea,
      coverImage: editSuggestion.coverImage,
      images: editSuggestion.images,
      equipmentIds: editSuggestion.equipmentIds,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSuggestion.id]);

  const updateFinalValue = (field: string, value: string | number | boolean | string[] | number[] | null | undefined) => {
    setFinalValues(prev => ({ ...prev, [field]: value }));
  };

  const reviewMutation = api.playground.reviewEditSuggestion.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "approve"
          ? t('success.editSuggestionApproved')
          : t('success.editSuggestionRejected'),
      );
      onReview();
      onOpenChange(false);
      setShowRejectionReason(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(error.message || t('errors.reviewFailed'));
    },
  });

  const handleApprove = () => {
    const cleanedFinalValues: {
      title?: string;
      latitude?: number;
      longitude?: number;
      municipality?: string | null;
      publiclyAccessible?: boolean;
      toddlerFriendly?: boolean;
      isSchoolGround?: boolean;
      schoolType?: "preschool" | "elementary" | null;
      hasSeating?: boolean;
      hasPicnicTable?: boolean;
      hasFencing?: boolean;
      hasGarbageCan?: boolean;
      hasBathroomNearby?: boolean;
      hasSoftPlayArea?: boolean;
      coverImage?: string | null;
      images?: string[];
      equipmentIds?: number[];
    } = {};

    if (finalValues.title !== null && finalValues.title !== undefined) {
      cleanedFinalValues.title = finalValues.title;
    }
    if (finalValues.latitude !== null && finalValues.latitude !== undefined) {
      cleanedFinalValues.latitude = finalValues.latitude;
    }
    if (finalValues.longitude !== null && finalValues.longitude !== undefined) {
      cleanedFinalValues.longitude = finalValues.longitude;
    }
    if (
      finalValues.municipality !== undefined &&
      (finalValues.municipality !== null || editSuggestion.municipality !== null)
    ) {
      cleanedFinalValues.municipality = finalValues.municipality;
    }
    if (finalValues.publiclyAccessible !== null && finalValues.publiclyAccessible !== undefined) {
      cleanedFinalValues.publiclyAccessible = finalValues.publiclyAccessible;
    }
    if (finalValues.toddlerFriendly !== null && finalValues.toddlerFriendly !== undefined) {
      cleanedFinalValues.toddlerFriendly = finalValues.toddlerFriendly;
    }
    if (finalValues.isSchoolGround !== null && finalValues.isSchoolGround !== undefined) {
      cleanedFinalValues.isSchoolGround = finalValues.isSchoolGround;
    }
    if (
      finalValues.schoolType !== undefined &&
      (finalValues.schoolType !== null || editSuggestion.schoolType !== null)
    ) {
      cleanedFinalValues.schoolType = finalValues.schoolType;
    }
    if (finalValues.hasSeating !== null && finalValues.hasSeating !== undefined) {
      cleanedFinalValues.hasSeating = finalValues.hasSeating;
    }
    if (finalValues.hasPicnicTable !== null && finalValues.hasPicnicTable !== undefined) {
      cleanedFinalValues.hasPicnicTable = finalValues.hasPicnicTable;
    }
    if (finalValues.hasFencing !== null && finalValues.hasFencing !== undefined) {
      cleanedFinalValues.hasFencing = finalValues.hasFencing;
    }
    if (finalValues.hasGarbageCan !== null && finalValues.hasGarbageCan !== undefined) {
      cleanedFinalValues.hasGarbageCan = finalValues.hasGarbageCan;
    }
    if (finalValues.hasBathroomNearby !== null && finalValues.hasBathroomNearby !== undefined) {
      cleanedFinalValues.hasBathroomNearby = finalValues.hasBathroomNearby;
    }
    if (finalValues.hasSoftPlayArea !== null && finalValues.hasSoftPlayArea !== undefined) {
      cleanedFinalValues.hasSoftPlayArea = finalValues.hasSoftPlayArea;
    }
    if (isCoverImageRemoved || finalValues.coverImage === "") {
      cleanedFinalValues.coverImage = null;
    } else if (finalValues.coverImage !== null && finalValues.coverImage !== undefined) {
      cleanedFinalValues.coverImage = finalValues.coverImage;
    }
    if (hasImageChanges) {
      cleanedFinalValues.images = approvedImages;
    }
    if (finalValues.equipmentIds !== null && finalValues.equipmentIds !== undefined) {
      cleanedFinalValues.equipmentIds = finalValues.equipmentIds;
    }

    reviewMutation.mutate({
      id: editSuggestion.id,
      action: "approve",
      finalValues: cleanedFinalValues,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error(t('errors.rejectionReasonRequired'));
      return;
    }

    reviewMutation.mutate({
      id: editSuggestion.id,
      action: "reject",
      rejectionReason: rejectionReason.trim(),
    });
  };

  // Check which changes exist (only show sections with actual changes)
  const changes = [
    // Basic Information
    editSuggestion.title !== null && editSuggestion.title !== undefined && editSuggestion.title !== originalPlayground.title && {
      section: 'basic',
      field: 'title',
      label: t('playground.playgroundName'),
      original: originalPlayground.title,
      suggested: editSuggestion.title,
      type: 'text'
    },

    editSuggestion.latitude !== null && editSuggestion.latitude !== undefined && editSuggestion.latitude !== originalPlayground.latitude && {
      section: 'basic',
      field: 'latitude',
      label: t('playground.latitude'),
      original: originalPlayground.latitude,
      suggested: editSuggestion.latitude,
      type: 'coordinate'
    },

    editSuggestion.longitude !== null && editSuggestion.longitude !== undefined && editSuggestion.longitude !== originalPlayground.longitude && {
      section: 'basic',
      field: 'longitude',
      label: t('playground.longitude'),
      original: originalPlayground.longitude,
      suggested: editSuggestion.longitude,
      type: 'coordinate'
    },

    editSuggestion.municipality !== null && editSuggestion.municipality !== undefined && editSuggestion.municipality !== originalPlayground.municipality && {
      section: 'basic',
      field: 'municipality',
      label: t('playground.municipality'),
      original: originalPlayground.municipality,
      suggested: editSuggestion.municipality,
      type: 'text'
    },

    isCoverImageChanged && {
      section: 'basic',
      field: 'coverImage',
      label: t('forms.coverImage'),
      original: originalPlayground.coverImage,
      suggested: isCoverImageRemoved ? null : editSuggestion.coverImage,
      type: 'image'
    },

    // Accessibility
    editSuggestion.publiclyAccessible !== null && editSuggestion.publiclyAccessible !== undefined && editSuggestion.publiclyAccessible !== originalPlayground.publiclyAccessible && {
      section: 'accessibility',
      field: 'publiclyAccessible',
      label: t('playground.publiclyAccessible'),
      original: originalPlayground.publiclyAccessible,
      suggested: editSuggestion.publiclyAccessible,
      type: 'boolean'
    },
    editSuggestion.toddlerFriendly !== null && editSuggestion.toddlerFriendly !== undefined && editSuggestion.toddlerFriendly !== originalPlayground.toddlerFriendly && {
      section: 'accessibility',
      field: 'toddlerFriendly',
      label: t('playground.toddlerFriendly'),
      original: originalPlayground.toddlerFriendly,
      suggested: editSuggestion.toddlerFriendly,
      type: 'boolean'
    },

    // School Ground
    editSuggestion.isSchoolGround !== null && editSuggestion.isSchoolGround !== undefined && editSuggestion.isSchoolGround !== originalPlayground.isSchoolGround && {
      section: 'school',
      field: 'isSchoolGround',
      label: t('forms.isSchoolGround'),
      original: originalPlayground.isSchoolGround,
      suggested: editSuggestion.isSchoolGround,
      type: 'boolean'
    },
    editSuggestion.schoolType !== null && editSuggestion.schoolType !== undefined && editSuggestion.schoolType !== originalPlayground.schoolType && {
      section: 'school',
      field: 'schoolType',
      label: t('forms.schoolType'),
      original: originalPlayground.schoolType,
      suggested: editSuggestion.schoolType,
      type: 'school_type'
    },

    // Amenities
    editSuggestion.hasSeating !== null && editSuggestion.hasSeating !== undefined && editSuggestion.hasSeating !== originalPlayground.hasSeating && {
      section: 'amenities',
      field: 'hasSeating',
      label: t('forms.hasSeating'),
      original: originalPlayground.hasSeating,
      suggested: editSuggestion.hasSeating,
      type: 'boolean'
    },
    editSuggestion.hasPicnicTable !== null && editSuggestion.hasPicnicTable !== undefined && editSuggestion.hasPicnicTable !== originalPlayground.hasPicnicTable && {
      section: 'amenities',
      field: 'hasPicnicTable',
      label: t('forms.hasPicnicTable'),
      original: originalPlayground.hasPicnicTable,
      suggested: editSuggestion.hasPicnicTable,
      type: 'boolean'
    },
    editSuggestion.hasGarbageCan !== null && editSuggestion.hasGarbageCan !== undefined && editSuggestion.hasGarbageCan !== originalPlayground.hasGarbageCan && {
      section: 'amenities',
      field: 'hasGarbageCan',
      label: t('forms.hasGarbageCan'),
      original: originalPlayground.hasGarbageCan,
      suggested: editSuggestion.hasGarbageCan,
      type: 'boolean'
    },
    editSuggestion.hasBathroomNearby !== null && editSuggestion.hasBathroomNearby !== undefined && editSuggestion.hasBathroomNearby !== originalPlayground.hasBathroomNearby && {
      section: 'amenities',
      field: 'hasBathroomNearby',
      label: t('forms.hasBathroomNearby'),
      original: originalPlayground.hasBathroomNearby,
      suggested: editSuggestion.hasBathroomNearby,
      type: 'boolean'
    },

    // Safety
    editSuggestion.hasFencing !== null && editSuggestion.hasFencing !== undefined && editSuggestion.hasFencing !== originalPlayground.hasFencing && {
      section: 'safety',
      field: 'hasFencing',
      label: t('forms.hasFencing'),
      original: originalPlayground.hasFencing,
      suggested: editSuggestion.hasFencing,
      type: 'boolean'
    },
    editSuggestion.hasSoftPlayArea !== null && editSuggestion.hasSoftPlayArea !== undefined && editSuggestion.hasSoftPlayArea !== originalPlayground.hasSoftPlayArea && {
      section: 'safety',
      field: 'hasSoftPlayArea',
      label: t('forms.hasSoftPlayArea'),
      original: originalPlayground.hasSoftPlayArea,
      suggested: editSuggestion.hasSoftPlayArea,
      type: 'boolean'
    },

    // Equipment
    editSuggestion.equipmentIds !== null && editSuggestion.equipmentIds !== undefined && JSON.stringify([...editSuggestion.equipmentIds].sort()) !== JSON.stringify([...(originalPlayground.playgroundEquipment?.map(pe => pe.equipmentId) ?? [])].sort()) && {
      section: 'equipment',
      field: 'equipmentIds',
      label: t('forms.equipment'),
      original: originalPlayground.playgroundEquipment?.map(pe => pe.equipmentId) ?? [],
      suggested: editSuggestion.equipmentIds,
      type: 'equipment'
    },


  ].filter(Boolean) as Array<{
    section: string;
    field: string;
    label: string;
    original: string | number | boolean | string[] | number[] | null | undefined;
    suggested: string | number | boolean | string[] | number[] | null | undefined;
    type: string;
  }>;

  // Group changes by section
  const changesBySection = changes.reduce((acc, change) => {
    if (!acc[change.section]) acc[change.section] = [];
    acc[change.section]!.push(change);
    return acc;
  }, {} as Record<string, typeof changes>);

  const sectionConfig = {
    basic: { title: t('admin.basicInformationChanges'), icon: MapPin },
    accessibility: { title: t('admin.accessibilityChanges'), icon: Users },
    school: { title: t('admin.schoolGroundChanges'), icon: GraduationCap },
    amenities: { title: t('admin.amenityChanges'), icon: Coffee },
    safety: { title: t('admin.safetyStructureChanges'), icon: Shield },
    equipment: { title: t('admin.equipmentChanges'), icon: Package },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {t('admin.reviewEditSuggestion')}
            <Badge variant="secondary">#{editSuggestion.id}</Badge>
          </DialogTitle>
          <DialogDescription>
            Review and edit the proposed changes to <strong>{originalPlayground.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Info */}
          <div className="bg-gray-50 rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">{t('admin.submissionDetails')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">{t('admin.submittedBy')}:</span>
                <span className="font-medium">
                  {(editSuggestion.createdBy.name || `${t('admin.user')} #${editSuggestion.createdBy.id}`)}
                </span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">{t('admin.submittedOn')}:</span>
                <span className="font-medium">
                  {new Date(editSuggestion.createdAt).toLocaleDateString(dateLocale)}
                </span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">{t('admin.originalPlayground')}:</span>
                <span className="font-medium">#{originalPlayground.id} - {originalPlayground.title}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">{t('admin.fieldsModified')}:</span>
                <span className="font-medium">
                  {(() => {
                    // Calculate image changes count if we're inside the image review section
                    // Otherwise default to 0
                    const imgCount = typeof imageChangeCount !== 'undefined' ? imageChangeCount : 0;
                    const totalChanges = changes.length + imgCount;
                    return `${totalChanges} ${totalChanges === 1 ? t('admin.field') : t('admin.fields')}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Render only sections with changes */}
          {Object.entries(changesBySection).map(([section, sectionChanges]) => {
            const config = sectionConfig[section as keyof typeof sectionConfig];
            if (!config) return null;

            const IconComponent = config.icon;

            return (
              <Card key={section}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {config.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sectionChanges.map((change) => (
                    <EditableFieldChange
                      key={change.field}
                      label={change.label}
                      originalValue={change.original}
                      suggestedValue={change.suggested}
                      finalValue={finalValues[change.field as keyof typeof finalValues]}
                      onFinalValueChange={(value) => updateFinalValue(change.field, value)}
                      type={change.type as "text" | "boolean" | "coordinate" | "school_type" | "number" | "equipment" | "image" | "image_array"}
                      onImageClick={setSelectedImage}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Interactive Image Review - Show new, removed and existing images */}
          {(() => {

            return hasImageChanges && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    {t('admin.reviewImages')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.reviewImagesDescription')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* New Images Section */}
                  {newImages.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-md font-medium text-green-700 border-b pb-1">{t('admin.addedImages')}</h3>
                      <div>
                        <h4 className="font-medium mb-2">
                          {t('forms.additionalImages')}
                          <Badge variant="outline" className="ml-2">
                            {newImages.filter((img) => approvedImages.includes(img)).length}/{newImages.length} {t('admin.approved')}
                          </Badge>
                        </h4>
                        <div className="flex flex-wrap gap-4">
                          {newImages.map((imageUrl: string, index: number) => {
                            const isApproved = approvedImages.includes(imageUrl);
                            return (
                              <div key={index} className="relative w-24 h-24">
                                <Image
                                  src={imageUrl}
                                  alt={`New additional image ${index + 1}`}
                                  className={`w-full h-full object-cover rounded border shadow-sm transition-opacity cursor-pointer hover:opacity-75 ${isApproved ? 'opacity-100' : 'opacity-50'
                                    }`}
                                  loading="lazy"
                                  onClick={() => setSelectedImage(imageUrl)}
                                  width={64}
                                  height={64}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent image click when clicking button
                                    if (isApproved) {
                                      setApprovedImages(prev => prev.filter(img => img !== imageUrl));
                                    } else {
                                      setApprovedImages(prev => [...prev, imageUrl]);
                                    }
                                  }}
                                  className={`absolute top-1 right-1 w-5 h-5 rounded-full border border-white shadow-sm flex items-center justify-center text-xs font-bold transition-colors ${isApproved
                                    ? 'bg-green-500 text-white'
                                    : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                >
                                  {isApproved ? '✓' : '✕'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('admin.clickToToggleImageApproval')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Removed Images Section */}
                  {removedImages.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-md font-medium text-red-700 border-b pb-1">{t('admin.removedImages')}</h3>
                      <div>
                        <h4 className="font-medium mb-2">
                          {t('forms.additionalImages')}
                          <Badge variant="destructive" className="ml-2">
                            {removedImages.length} {t('admin.markedForRemoval')}
                          </Badge>
                        </h4>
                        <div className="flex flex-wrap gap-4">
                          {removedImages.map((imageUrl: string, index: number) => (
                            <div key={index} className="relative w-24 h-24">
                              <Image
                                src={imageUrl}
                                alt={`Removed image ${index + 1}`}
                                className="w-full h-full object-cover rounded border border-red-300 shadow-sm opacity-60 cursor-pointer hover:opacity-80"
                                loading="lazy"
                                onClick={() => setSelectedImage(imageUrl)}
                                width={64}
                                height={64}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <X className="h-6 w-6 text-red-500 bg-white rounded-full p-1" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Location Map Preview */}
          {(editSuggestion.latitude !== null && editSuggestion.latitude !== undefined && editSuggestion.latitude !== originalPlayground.latitude) ||
            (editSuggestion.longitude !== null && editSuggestion.longitude !== undefined && editSuggestion.longitude !== originalPlayground.longitude) ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('admin.locationChange')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Original Location Map */}
                <div>
                  <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    {t('admin.originalLocation')}
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <CoordinatePickerMap
                      latitude={originalPlayground.latitude}
                      longitude={originalPlayground.longitude}
                      onCoordinateChange={() => { /* Read-only map */ }}
                      className="h-64 w-full"
                    />
                  </div>
                </div>

                {/* Proposed Location Map */}
                <div>
                  <h4 className="font-medium text-green-700 flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    {t('admin.proposedLocation')}
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <CoordinatePickerMap
                      latitude={finalValues.latitude ?? editSuggestion.latitude ?? originalPlayground.latitude}
                      longitude={finalValues.longitude ?? editSuggestion.longitude ?? originalPlayground.longitude}
                      onCoordinateChange={() => { /* Read-only map */ }}
                      className="h-64 w-full"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    {t('admin.locationChangeNote')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* No Changes Warning */}
          {changes.length === 0 && !hasImageChanges && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <p className="text-amber-800 text-center">
                  {t('admin.noChangesDetected')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Only Image Changes Message */}
          {changes.length === 0 && hasImageChanges && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <p className="text-blue-800 text-center">
                  {t('admin.onlyImageChangesDetected')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason Input */}
          {showRejectionReason && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-800">{t('admin.rejectionReason')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={t('admin.rejectionReasonPlaceholder')}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-white"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setShowRejectionReason(false);
              setRejectionReason("");
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
                    setRejectionReason("");
                  }}
                >
                  {t('common.back')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('admin.rejectSuggestion')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowRejectionReason(true)}
                  disabled={reviewMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('admin.reject')}
                </Button>
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {changes.length === 0 && hasImageChanges
                    ? t('admin.approveImageChanges')
                    : t('admin.approveChanges')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Image Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-2">
            <div className="relative">
              <Image
                src={selectedImage}
                alt="Full size image"
                width={1200}
                height={800}
                className="w-full h-auto max-h-[80vh] object-contain rounded"
                loading="lazy"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
