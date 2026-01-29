"use client";

import { useEffect, useState } from "react";
import { MapPin, Maximize2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { useUserLocation } from "~/lib/hooks/use-user-location";
import { type Playground } from "~/types";

interface PlaygroundDetailMapProps {
    playground: Playground;
    className?: string;
}

export function PlaygroundDetailMap({ playground, className }: PlaygroundDetailMapProps) {
    if (env.NEXT_PUBLIC_MAP_PROVIDER === "mapbox") {
        return <MapboxDetailMap playground={playground} className={className} />;
    }
    return <GoogleDetailMap playground={playground} className={className} />;
}

// ─── Mapbox implementation ───────────────────────────────────────────────────

function MapboxDetailMap({ playground, className }: PlaygroundDetailMapProps) {
    const [MapModule, setMapModule] = useState<typeof import("react-map-gl/mapbox") | null>(null);
    const { userLocation } = useUserLocation();

    useEffect(() => {
        void import("react-map-gl/mapbox").then(setMapModule);
    }, []);

    const handleViewLargerMap = () => {
        const url = `https://www.google.com/maps?q=${playground.latitude},${playground.longitude}&z=15`;
        window.open(url, "_blank");
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
                <Button size="sm" variant="secondary" onClick={handleViewLargerMap} className="shadow-md">
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// ─── Google Maps implementation ──────────────────────────────────────────────

function GoogleDetailMap({ playground, className }: PlaygroundDetailMapProps) {
    const [GoogleModule, setGoogleModule] = useState<typeof import("@vis.gl/react-google-maps") | null>(null);
    const { userLocation } = useUserLocation();

    useEffect(() => {
        void import("@vis.gl/react-google-maps").then(setGoogleModule);
    }, []);

    const handleViewLargerMap = () => {
        const url = `https://www.google.com/maps?q=${playground.latitude},${playground.longitude}&z=15`;
        window.open(url, "_blank");
    };

    if (!GoogleModule) {
        return (
            <div className={`relative ${className || ""}`}>
                <div className="h-full w-full bg-muted animate-pulse" />
            </div>
        );
    }

    const { APIProvider, Map, AdvancedMarker } = GoogleModule;

    return (
        <div className={`relative ${className || ""}`}>
            <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                <Map
                    defaultZoom={15}
                    defaultCenter={{ lat: playground.latitude, lng: playground.longitude }}
                    mapId="playground-detail-map"
                    className="h-full w-full rounded-md"
                    mapTypeControl={false}
                    fullscreenControl={false}
                    streetViewControl={false}
                    zoomControl={true}
                    clickableIcons={false}
                    scaleControl={false}
                    cameraControl={false}
                >
                    {userLocation && (
                        <AdvancedMarker position={userLocation} title="Your Location">
                            <div className="h-3 w-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                        </AdvancedMarker>
                    )}
                    <AdvancedMarker
                        position={{ lat: playground.latitude, lng: playground.longitude }}
                        title={playground.title}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg border-2 border-white">
                            <MapPin className="h-6 w-6" />
                        </div>
                    </AdvancedMarker>
                </Map>

                <div className="absolute top-2 right-2 z-10 space-y-2">
                    <Button size="sm" variant="secondary" onClick={handleViewLargerMap} className="shadow-md">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            </APIProvider>
        </div>
    );
}
