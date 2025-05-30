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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { type Playground } from "~/types";
import { useRouter } from "next/navigation";

interface PlaygroundDetailProps {
  playground: Playground;
}

export default function PlaygroundDetail({
  playground,
}: PlaygroundDetailProps) {
  const router = useRouter();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Use cover image or first image, fallback to placeholder
  // Filter out empty strings and null/undefined values
  const validCoverImage =
    playground.coverImage && playground.coverImage.trim() !== ""
      ? playground.coverImage
      : null;
  const validImages = (playground.images ?? []).filter(
    (img) => img && img.trim() !== "",
  );

  const displayImages = validCoverImage
    ? [validCoverImage, ...validImages]
    : validImages.length > 0
      ? validImages
      : ["/playground.jpg"];

  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${playground.latitude},${playground.longitude}`;
    window.open(googleMapsUrl, "_blank");
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto px-4 py-4">
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
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Image Gallery */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <Image
                    src={displayImages[selectedImageIndex] ?? "/playground.jpg"}
                    alt={`${playground.title} - Image ${selectedImageIndex + 1}`}
                    width={800}
                    height={400}
                    className="h-[400px] w-full rounded-t-lg object-cover"
                  />

                  {/* Image counter */}
                  {displayImages.length > 1 && (
                    <div className="absolute right-4 top-4 rounded-md bg-black/60 px-2 py-1 text-sm text-white">
                      {selectedImageIndex + 1} / {displayImages.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail strip */}
                {displayImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-4">
                    {displayImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                          selectedImageIndex === index
                            ? "border-primary"
                            : "border-transparent"
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${playground.title} thumbnail ${index + 1}`}
                          width={80}
                          height={60}
                          className="h-15 w-20 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
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
                  <Badge
                    variant={playground.toddlerFriendly ? "default" : "outline"}
                  >
                    {playground.toddlerFriendly
                      ? "Toddler Friendly"
                      : "Older Children"}
                  </Badge>
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

                <Button variant="outline" className="w-full" size="lg">
                  <MapPin className="mr-2 h-4 w-4" />
                  View on Map
                </Button>
              </CardContent>
            </Card>

            {/* Map Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Location Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex h-48 items-center justify-center rounded-md bg-muted">
                  {/* Placeholder for map - you can integrate Google Maps here */}
                  <div className="text-center text-muted-foreground">
                    <MapPin className="mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm">Interactive map coming soon</p>
                    <p className="text-xs">
                      {formatCoordinates(
                        playground.latitude,
                        playground.longitude,
                      )}
                    </p>
                  </div>
                </div>
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
    </div>
  );
}
