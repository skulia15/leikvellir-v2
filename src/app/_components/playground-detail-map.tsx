"use client";

import React, { useState } from "react";
import {
    APIProvider,
    Map,
    AdvancedMarker,
} from "@vis.gl/react-google-maps";
import { env } from "~/env";
import { type Playground } from "~/types";
import { Button } from "~/components/ui/button";
import { MapPin, Navigation, Maximize2 } from "lucide-react";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { getPlaygroundDistance, formatDistance } from "~/lib/geo-utils";

interface PlaygroundDetailMapProps {
    playground: Playground;
    className?: string;
}

export function PlaygroundDetailMap({ playground, className }: PlaygroundDetailMapProps) {
    const [mapZoom, setMapZoom] = useState(15);
    const { userLocation, requestLocation, permission } = useUserLocation();

    const playgroundPosition = {
        lat: playground.latitude,
        lng: playground.longitude,
    };

    const distance = getPlaygroundDistance(playground, userLocation);

    const handleGetDirections = () => {
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${playground.latitude},${playground.longitude}`;
        window.open(googleMapsUrl, "_blank");
    };

    const handleViewLargerMap = () => {
        const googleMapsUrl = `https://www.google.com/maps?q=${playground.latitude},${playground.longitude}&z=15`;
        window.open(googleMapsUrl, "_blank");
    };

    return (
        <div className={`relative ${className || ""}`}>
            <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
                <Map
                    defaultZoom={mapZoom}
                    defaultCenter={playgroundPosition}
                    mapId="playground-detail-map"
                    className="h-full w-full rounded-md"
                    onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
                    gestureHandling="cooperative"
                    mapTypeControl={false}
                    fullscreenControl={false}
                    streetViewControl={false}
                    zoomControl={true}
                    scaleControl={false}
                    cameraControl={false}
                >
                    {/* User location marker */}
                    {userLocation && (
                        <AdvancedMarker
                            position={userLocation}
                            title="Your Location"
                        >
                            <div className="h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                        </AdvancedMarker>
                    )}

                    {/* Playground marker */}
                    <AdvancedMarker
                        position={playgroundPosition}
                        title={playground.title}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg border-2 border-white">
                            <MapPin className="h-6 w-6" />
                        </div>
                    </AdvancedMarker>
                </Map>

                {/* Map controls overlay */}
                <div className="absolute top-2 right-2 z-10 space-y-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleViewLargerMap}
                        className="shadow-md"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Location info overlay */}
                <div className="absolute bottom-2 left-2 right-2 z-10">
                    <div className="rounded-md bg-background/95 backdrop-blur-sm border p-3 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{playground.title}</h4>
                                {/* <p className="text-xs text-muted-foreground">
                                    {playground.latitude.toFixed(6)}, {playground.longitude.toFixed(6)}
                                </p> */}
                                {distance && (
                                    <p className="text-xs text-green-600 font-medium">
                                        {formatDistance(distance)}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-1 ml-2">
                                {permission === "prompt" && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={requestLocation}
                                        className="text-xs h-7"
                                    >
                                        <Navigation className="h-3 w-3 mr-1" />
                                        Location
                                    </Button>
                                )}

                                <Button
                                    size="sm"
                                    onClick={handleGetDirections}
                                    className="text-xs h-7"
                                >
                                    <Navigation className="h-3 w-3 mr-1" />
                                    Directions
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </APIProvider>
        </div>
    );
} 