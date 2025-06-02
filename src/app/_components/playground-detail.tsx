"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Baby,
  Shield,
  Navigation,
  Edit,
  Route,
  Package,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { type Playground, type EquipmentCategory, type Equipment } from "~/types";
import { useRouter } from "next/navigation";
import { PlaygroundDetailMap } from "./playground-detail-map";
import { useAdmin } from "~/lib/admin-context";
import EditPlaygroundDialog from "~/app/admin/_components/edit-playground-dialog";
import ImageCarousel from "./image-carousel";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, formatDistance } from "~/lib/geo-utils";
import { PlaygroundEquipmentIcon } from "~/components/icons";

interface PlaygroundDetailProps {
  playground: Playground;
}

export default function PlaygroundDetail({
  playground,
}: PlaygroundDetailProps) {
  const router = useRouter();
  const { isAdminMode } = useAdmin();
  const { userLocation } = useUserLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Calculate distance from user location
  const distance = getPlaygroundDistance(playground, userLocation);

  // Get all images including cover image
  const displayImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? [])
  ].filter((img, index, arr) => arr.indexOf(img) === index); // Remove duplicates

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${playground.latitude},${playground.longitude}`;
    window.open(googleMapsUrl, "_blank");
  };

  const handleViewOnMap = () => {
    router.push(`/?lat=${playground.latitude}&lng=${playground.longitude}&playground=${playground.id}`);
  };

  // Helper function to group equipment by category
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

  const categoryLabels: Record<EquipmentCategory, string> = {
    core_equipment: "Core Equipment",
    climbing_and_movement: "Climbing & Movement",
    imaginative_and_themed: "Imaginative & Themed",
    spinning_and_motion: "Spinning & Motion",
    fitness_and_obstacle: "Fitness & Obstacle",
    toddler_friendly: "Toddler Friendly",
    additional_common_equipment: "Additional Equipment",
  };

  const equipmentByCategory = getEquipmentByCategory();
  const hasEquipment = playground.playgroundEquipment && playground.playgroundEquipment.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button and admin actions */}
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="truncate text-2xl font-bold">{playground.title}</h1>
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
                Edit Playground
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Image Carousel */}
            <ImageCarousel
              images={displayImages}
              alt={playground.title}
            />

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Playground Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      playground.publiclyAccessible ? "default" : "secondary"
                    }
                  >
                    {playground.publiclyAccessible
                      ? "Publicly Accessible"
                      : "Restricted Access"}
                  </Badge>
                  {playground.toddlerFriendly && (
                    <Badge
                      variant={playground.toddlerFriendly ? "default" : "outline"}
                    >
                      Toddler Friendly
                    </Badge>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCoordinates(
                          playground.latitude,
                          playground.longitude,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Added</p>
                      <p className="text-sm text-muted-foreground">
                        {playground.createdAt
                          ? new Date(playground.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>

                  {distance && (
                    <div className="flex items-start gap-3">
                      <Route className="mt-0.5 h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Distance from You</p>
                        <p className="text-sm font-medium text-green-600">
                          {formatDistance(distance)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Features & Amenities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Features & Accessibility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Public Access</p>
                      <p className="text-sm text-muted-foreground">
                        {playground.publiclyAccessible
                          ? "Open to the public"
                          : "Restricted access (may be part of school grounds)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Baby className="h-5 w-5 text-pink-500" />
                    <div>
                      <p className="font-medium">Age Suitability</p>
                      <p className="text-sm text-muted-foreground">
                        {playground.toddlerFriendly
                          ? "Suitable for toddlers and young children"
                          : "More suitable for older children"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment */}
            {hasEquipment ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlaygroundEquipmentIcon className="h-5 w-5" />
                    Playground Equipment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(Object.keys(equipmentByCategory) as EquipmentCategory[]).map((category) => {
                    const equipment = equipmentByCategory[category];
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-primary">
                            {categoryLabels[category]}
                          </h4>

                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {equipment.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              {item.image && (
                                <Image
                                  src={item.image}
                                  alt={item.nameEnglish}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">
                                  {item.nameEnglish}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.nameIcelandic}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlaygroundEquipmentIcon className="h-5 w-5" />
                    Playground Equipment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    <PlaygroundEquipmentIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No equipment information available for this playground.</p>
                    <p className="text-sm mt-1">Equipment details may be added later.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleGetDirections}
                  className="w-full"
                  size="lg"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Get Directions
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleViewOnMap}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  View on Map
                </Button>
              </CardContent>
            </Card>

            {/* Interactive Map */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PlaygroundDetailMap
                  playground={playground}
                  className="h-64 w-full"
                />
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Playground ID:
                    </span>
                    <span className="font-medium">#{playground.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">
                      {playground.updatedAt
                        ? new Date(playground.updatedAt).toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {isAdminMode && (
        <EditPlaygroundDialog
          playground={playground}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  );
}
