"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Users,
  Baby,
  Shield,
  Navigation,
  Edit,
  Route,
  Armchair,
  Utensils,
  Trash2,
  Bath,
  Fence,
  Heart,
  Coffee,
  Eye,
  GraduationCap,
  RotateCcw,
  Sparkles,
  Star,
  Puzzle
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { type Playground, type EquipmentCategory, type Equipment } from "~/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlaygroundDetailMap } from "./playground-detail-map";
import { useAdmin } from "~/lib/admin-context";
import EditPlaygroundDialog from "~/app/admin/_components/edit-playground-dialog";
import SuggestEditDialog from "./suggest-edit-dialog";
import ImageCarousel from "./image-carousel";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, formatDistance } from "~/lib/geo-utils";
import { getAccessibilityStatus, formatSchoolType } from "~/lib/school-hours";
import { PlaygroundEquipmentIcon } from "~/components/icons";
import { useT } from "~/lib/i18n";

interface PlaygroundDetailProps {
  playground: Playground;
}

export default function PlaygroundDetail({
  playground,
}: PlaygroundDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdminMode, canAccessAdmin } = useAdmin();
  const { userLocation } = useUserLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSuggestEditDialogOpen, setIsSuggestEditDialogOpen] = useState(false);
  const t = useT();

  // Calculate distance from user location
  const distance = getPlaygroundDistance(playground, userLocation);

  // Get school ground accessibility status
  const accessibilityInfo = getAccessibilityStatus(
    playground.isSchoolGround,
    playground.schoolType
  );

  // Get all images including cover image
  const displayImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? [])
  ].filter((img, index, arr) => arr.indexOf(img) === index); // Remove duplicates


  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${playground.latitude},${playground.longitude}`;
    window.open(googleMapsUrl, "_blank");
  };

  const handleViewOnMap = () => {
    router.push(`/?lat=${playground.latitude}&lng=${playground.longitude}&playground=${playground.id}`);
  };

  // Helper function to get category icon
  const getCategoryIcon = (category: EquipmentCategory) => {
    switch (category) {
      case 'core_equipment':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'climbing_and_movement':
        return <ArrowLeft className="h-5 w-5 text-green-600 rotate-45" />; // Represents climbing/movement
      case 'imaginative_and_themed':
        return <Sparkles className="h-5 w-5 text-fuchsia-400" />; // Represents creativity and imagination
      case 'spinning_and_motion':
        return <RotateCcw className="h-5 w-5 text-blue-500" />; // Represents spinning/rotation
      case 'fitness_and_obstacle':
        return <Route className="h-5 w-5 text-orange-500" />; // Represents paths/obstacles
      case 'toddler_friendly':
        return <Baby className="h-5 w-5 text-pink-500" />; // Perfect for toddler equipment
      case 'additional_common_equipment':
        return <Puzzle className="h-5 w-5 text-cyan-400" />; // Represents additional amenities
      default:
        return <PlaygroundEquipmentIcon className="h-5 w-5 text-primary" />;
    }
  };
  const getEquipmentByCategory = (): Record<EquipmentCategory, Equipment[]> => {
    if (!playground.playgroundEquipment) return {} as Record<EquipmentCategory, Equipment[]>;

    return playground.playgroundEquipment.reduce((acc, { equipment }) => {
      if (!acc[equipment.category]) {
        acc[equipment.category] = [];
      }
      acc[equipment.category].push(equipment);
      return acc;
    }, {} as Record<EquipmentCategory, Equipment[]>);
  };

  const equipmentByCategory = getEquipmentByCategory();
  const hasEquipment = playground.playgroundEquipment && playground.playgroundEquipment.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button and admin actions */}
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 ">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 "
            >
              <ArrowLeft className="h-4 w-4" />
              {t('playground.back')}
            </Button>
          </div>

          {/* Admin Edit Button */}
          {isAdminMode && (
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {t('playground.editPlayground')}
            </Button>
          )}

          {/* User Suggest Edit Button - Desktop only */}
          {session && !isAdminMode && playground.status === "approved" && (
            <Button
              onClick={() => setIsSuggestEditDialogOpen(true)}
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {t('playground.suggestEdit')}
            </Button>
          )}
        </div>

        {/* Title on separate line */}
        <h1 className="pt-6 text-2xl font-bold">{playground.title}</h1>
      </div>

      <div className="container mx-auto px-4 py-2">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Image Carousel */}
            <ImageCarousel
              images={displayImages}
              alt={playground.title}
            />

            {/* Playground Information - Combined Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('playground.playgroundInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Badges */}
                {/* <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      playground.publiclyAccessible ? "default" : "secondary"
                    }
                  >
                    {playground.publiclyAccessible
                      ? t('playground.publiclyAccessible')
                      : t('playground.restrictedAccess')}
                  </Badge>
                  {playground.toddlerFriendly && (
                    <Badge
                      variant={playground.toddlerFriendly ? "default" : "outline"}
                    >
                      {t('playground.toddlerFriendly')}
                    </Badge>
                  )}
                </div> */}

                {/* Basic Info Grid */}
                {distance && (
                  <div className="flex items-start gap-3">
                    <Route className="mt-0.5 h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">{t('playground.distanceFromYou')}</p>
                      <p className="text-sm font-medium text-green-600">
                        {formatDistance(distance)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Features & Accessibility Subsection */}
                <Separator className="my-6" />
                <div>
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    {t('playground.featuresAndAccessibility')}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{t('playground.publicAccess')}</p>
                        <p className="text-sm text-muted-foreground">
                          {playground.publiclyAccessible
                            ? t('playground.openToPublic')
                            : t('playground.restrictedAccessDescription')}
                        </p>
                      </div>
                    </div>

                    {/* School Ground Information */}
                    {playground.isSchoolGround && (
                      <div className="flex items-center gap-3">
                        <GraduationCap className={`h-5 w-5 ${accessibilityInfo.isAccessible ? 'text-amber-500' : 'text-red-500'
                          }`} />
                        <div>
                          <p className="font-medium">{t('playground.schoolGround')}</p>
                          <p className="text-sm text-muted-foreground">
                            {playground.schoolType && (
                              <span>{t(formatSchoolType(playground.schoolType))} • </span>
                            )}
                            {accessibilityInfo.isAccessible ? (
                              <span className="text-amber-600 font-medium">
                                {t('playground.accessibleAfterSchoolHours')}
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">
                                {t('playground.currentlyInSchoolHours')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Baby className="h-5 w-5 text-pink-500" />
                      <div>
                        <p className="font-medium">{t('playground.ageSuitability')}</p>
                        <p className="text-sm text-muted-foreground">
                          {playground.toddlerFriendly
                            ? t('playground.suitableForToddlers')
                            : t('playground.moreForOlderChildren')}
                        </p>
                      </div>
                    </div>


                  </div>
                </div>

                {/* Amenities Subsection */}
                {(playground.hasSeating || playground.hasPicnicTable || playground.hasGarbageCan || playground.hasBathroomNearby || playground.hasFencing || playground.hasSoftPlayArea) && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                        <Coffee className="h-5 w-5" />
                        {t('forms.amenities')}
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {playground.hasSeating && (
                          <div className="flex items-center gap-3">
                            <Armchair className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">{t('forms.hasSeating')}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('forms.hasSeatingDescription')}
                              </p>
                            </div>
                          </div>
                        )}

                        {playground.hasPicnicTable && (
                          <div className="flex items-center gap-3">
                            <Utensils className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">{t('forms.hasPicnicTable')}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('forms.hasPicnicTableDescription')}
                              </p>
                            </div>
                          </div>
                        )}

                        {playground.hasGarbageCan && (
                          <div className="flex items-center gap-3">
                            <Trash2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">{t('forms.hasGarbageCan')}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('forms.hasGarbageCanDescription')}
                              </p>
                            </div>
                          </div>
                        )}

                        {playground.hasBathroomNearby && (
                          <div className="flex items-center gap-3">
                            <Bath className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">{t('forms.hasBathroomNearby')}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('forms.hasBathroomNearbyDescription')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Safety & Structure Subsection */}
                    {(playground.hasFencing || playground.hasSoftPlayArea) && (
                      <>
                        <Separator className="my-6" />
                        <div>
                          <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {t('forms.safetyAndStructure')}
                          </h3>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {playground.hasFencing && (
                              <div className="flex items-center gap-3">
                                <Fence className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{t('forms.hasFencing')}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {t('forms.hasFencingDescription')}
                                  </p>
                                </div>
                              </div>
                            )}

                            {playground.hasSoftPlayArea && (
                              <div className="flex items-center gap-3">
                                <Heart className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">{t('forms.hasSoftPlayArea')}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {t('forms.hasSoftPlayAreaDescription')}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Equipment */}
            {hasEquipment ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlaygroundEquipmentIcon className="h-5 w-5" />
                    {t('playground.playgroundEquipment')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {(Object.keys(equipmentByCategory) as EquipmentCategory[]).map((category) => {
                      const equipment = equipmentByCategory[category];
                      return (
                        <div key={category} className="space-y-4">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(category)}
                            <h4 className="font-semibold text-lg text-foreground">
                              {t(`equipment.categories.${category}`)}
                            </h4>
                          </div>
                          <div className="space-y-3 ml-8">
                            {equipment.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 py-1.5"
                              >
                                {item.image && (
                                  <Image
                                    src={item.image}
                                    alt={t(item.name)}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">
                                    {t(item.name)}
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {t(item.description)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlaygroundEquipmentIcon className="h-5 w-5" />
                    {t('playground.playgroundEquipment')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    <PlaygroundEquipmentIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('playground.noEquipmentInfo')}</p>
                    <p className="text-sm mt-1">{t('playground.equipmentMayBeAdded')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Interactive Map */}
            <Card>
              <CardHeader>
                <CardTitle>{t('playground.location')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PlaygroundDetailMap
                  playground={playground}
                  className="h-64 w-full"
                />
                <div className="p-4 flex gap-2">
                  <Button
                    onClick={handleGetDirections}
                    className="flex-1"
                    size="sm"
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    {t('playground.getDirections')}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={handleViewOnMap}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {t('playground.viewOnMap')}
                  </Button>
                </div>
              </CardContent>
            </Card>



            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('playground.additionalInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {/* <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('playground.location')}:
                    </span>
                    <span className="font-medium">
                      {formatCoordinates(
                        playground.latitude,
                        playground.longitude,
                      )}
                    </span>
                  </div> */}

                  {playground.municipality && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t('playground.municipality')}:
                      </span>
                      <span className="font-medium text-primary">
                        {playground.municipality}
                      </span>
                    </div>
                  )}

                  {!playground.submitAnonymously && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t('playground.submittedBy')}:
                      </span>
                      <span className="font-medium">
                        {playground.createdBy?.name || t('playground.unknown')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('playground.added')}:
                    </span>
                    <span className="font-medium">
                      {playground.createdAt
                        ? new Date(playground.createdAt).toLocaleDateString()
                        : t('playground.unknown')}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('playground.lastUpdated')}:</span>
                    <span className="font-medium">
                      {playground.updatedAt
                        ? new Date(playground.updatedAt).toLocaleDateString()
                        : t('playground.unknown')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Suggest Edit Button - At bottom of content */}
        {session && !isAdminMode && playground.status === "approved" && (
          <div className="md:hidden mt-8 mb-4 px-4">
            <Button
              onClick={() => setIsSuggestEditDialogOpen(true)}
              variant="default"
              className="w-full"
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('playground.suggestEdit')}
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {isAdminMode && isEditDialogOpen && (
        <EditPlaygroundDialog
          playground={playground}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Suggest Edit Dialog */}
      {session && !isAdminMode && isSuggestEditDialogOpen && (
        <SuggestEditDialog
          playground={playground}
          open={isSuggestEditDialogOpen}
          onOpenChange={setIsSuggestEditDialogOpen}
        />
      )}
    </div>
  );
}
