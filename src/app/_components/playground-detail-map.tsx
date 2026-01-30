"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Maximize2, LocateFixed } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { env } from "~/env";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { useT } from "~/lib/i18n";
import { type Playground } from "~/types";

interface PlaygroundDetailMapProps {
    playground: Playground;
    className?: string;
}

export function PlaygroundDetailMap({ playground, className }: PlaygroundDetailMapProps) {
    const [MapModule, setMapModule] = useState<typeof import("react-map-gl/mapbox") | null>(null);
    const { userLocation } = useUserLocation();
    const mapRef = useRef<import("react-map-gl/mapbox").MapRef | null>(null);
    const t = useT();

    useEffect(() => {
        void import("react-map-gl/mapbox").then(setMapModule);
    }, []);

    const handleViewLargerMap = () => {
        const url = `https://www.google.com/maps?q=${playground.latitude},${playground.longitude}&z=15`;
        window.open(url, "_blank");
    };

    const handleResetPosition = () => {
        mapRef.current?.flyTo({
            center: [playground.longitude, playground.latitude],
            zoom: 15,
            duration: 800,
        });
    };

    if (!MapModule) {
        return (
            <div className={`relative ${className || ""}`}>
                <div className="h-full w-full bg-muted animate-pulse" />
            </div>
        );
    }

    const { default: Map, Marker } = MapModule;

    return (
        <div className={`relative ${className || ""}`}>
            <Map
                ref={mapRef}
                mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                initialViewState={{
                    longitude: playground.longitude,
                    latitude: playground.latitude,
                    zoom: 15,
                }}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/skulipardus/cmkzwe4f2005s01skane25k5g"
                dragRotate={false}
                touchPitch={false}
                attributionControl={true}
            >
                {userLocation && (
                    <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                        <div className="h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                    </Marker>
                )}
                <Marker longitude={playground.longitude} latitude={playground.latitude} anchor="center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg border-2 border-white">
                        <MapPin className="h-6 w-6" />
                    </div>
                </Marker>
            </Map>

            <div className="absolute top-2 right-2 z-10 space-y-2">
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleResetPosition}
                                className="shadow-md"
                                aria-label={t('map.resetPosition')}
                            >
                                <LocateFixed className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            {t('map.resetPosition')}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleViewLargerMap}
                                className="shadow-md"
                                aria-label={t('map.viewLargerMap')}
                            >
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            {t('map.viewLargerMap')}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
