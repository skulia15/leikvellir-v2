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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { type Playground } from "~/types";
import { useRouter } from "next/navigation";
import { PlaygroundDetailMap } from "./playground-detail-map";
import { useAdmin } from "~/lib/admin-context";
import EditPlaygroundDialog from "~/app/admin/_components/edit-playground-dialog";
import { useSwipe } from "~/lib/hooks/use-swipe";

interface PlaygroundDetailProps {
  playground: Playground;
}

export default function PlaygroundDetail({
  playground,
}: PlaygroundDetailProps) {
  const router = useRouter();
  const { isAdminMode } = useAdmin();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get all images including cover image
  const displayImages = [
    ...(playground.coverImage ? [playground.coverImage] : []),
    ...(playground.images ?? [])
  ].filter((img, index, arr) => arr.indexOf(img) === index); // Remove duplicates

  const hasMultipleImages = displayImages.length > 1;

  const changeImage = (newIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedImageIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const nextImage = () => {
    if (isTransitioning) return;
    const newIndex = (selectedImageIndex + 1) % displayImages.length;
    changeImage(newIndex);
  };

  const previousImage = () => {
    if (isTransitioning) return;
    const newIndex = (selectedImageIndex - 1 + displayImages.length) % displayImages.length;
    changeImage(newIndex);
  };

  // Add swipe functionality
  const swipeHandlers = useSwipe({
    onSwipeLeft: nextImage,
    onSwipeRight: previousImage,
  });

  // Destructure to separate event handlers from data properties
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    dragOffset,
    isDragging,
    style
  } = swipeHandlers;

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
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <div
                    className="relative h-[400px] w-full overflow-hidden rounded-t-lg touch-pan-y select-none"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                    style={style}
                  >
                    {/* Image container with sliding animation */}
                    <div
                      className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-in-out'}`}
                      style={{
                        transform: `translateX(calc(-${selectedImageIndex * (100 / displayImages.length)}% + ${dragOffset}px))`,
                        width: `${displayImages.length * 100}%`
                      }}
                    >
                      {displayImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative h-full flex-shrink-0 bg-gray-50"
                          style={{ width: `${100 / displayImages.length}%` }}
                        >
                          <Image
                            src={image ?? "/playground.jpg"}
                            alt={`${playground.title} - Image ${index + 1}`}
                            fill
                            className="object-contain p-2"
                            priority={index === 0}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Navigation arrows */}
                    {hasMultipleImages && (
                      <>
                        <button
                          onClick={previousImage}
                          disabled={isTransitioning}
                          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          disabled={isTransitioning}
                          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Image counter */}
                    {hasMultipleImages && (
                      <div className="absolute right-4 top-4 rounded-md bg-black/60 px-3 py-1 text-sm text-white">
                        {selectedImageIndex + 1} / {displayImages.length}
                      </div>
                    )}
                  </div>

                  {/* Dot indicators */}
                  {hasMultipleImages && (
                    <div className="flex justify-center gap-2 py-4 bg-background">
                      {displayImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => changeImage(index)}
                          disabled={isTransitioning}
                          className={`h-3 w-3 rounded-full transition-colors disabled:opacity-50 ${index === selectedImageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
