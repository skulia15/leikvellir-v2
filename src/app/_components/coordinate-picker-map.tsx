"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { env } from "~/env";
import { useT } from "~/lib/i18n";
import type { MapRef } from "react-map-gl/mapbox";

interface CoordinatePickerMapProps {
  latitude: number;
  longitude: number;
  onCoordinateChange: (lat: number, lng: number) => void;
  className?: string;
}

const defaultCenter = {
  lat: 64.071, // Reykjavik, Iceland
  lng: -21.954,
};

export function CoordinatePickerMap({
  latitude,
  longitude,
  onCoordinateChange,
  className = "",
}: CoordinatePickerMapProps) {
  // Lazy import to avoid loading mapbox-gl at SSR time
  const [MapModule, setMapModule] = useState<typeof import("react-map-gl/mapbox") | null>(null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    void import("react-map-gl/mapbox").then(setMapModule);
  }, []);

  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  const t = useT();

  // Update marker position AND fly map to new location when props change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
      // Fly the map to the new location
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [latitude, longitude]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      const { lng, lat } = event.lngLat;
      setMarkerPosition({ lat, lng });
      onCoordinateChange(lat, lng);
    },
    [onCoordinateChange],
  );

  if (!MapModule) {
    return (
      <div className={`relative ${className}`}>
        <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading map...</div>
        </div>
      </div>
    );
  }

  const { default: Map, Marker } = MapModule;

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: markerPosition.lng,
          latitude: markerPosition.lat,
          zoom: 14,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/skulipardus/cmkzwe4f2005s01skane25k5g"
        onClick={handleMapClick}
        dragRotate={false}
        touchPitch={false}
        cursor="default"
        attributionControl={true}
      >
        <Marker
          longitude={markerPosition.lng}
          latitude={markerPosition.lat}
          anchor="bottom"
        />
      </Map>

      <div className="absolute left-2 top-2 rounded-md border bg-background/90 px-3 py-2 text-sm shadow-md backdrop-blur-sm">
        <p className="font-medium text-foreground">
          {t("map.clickToSetLocation")}
        </p>
      </div>
    </div>
  );
}
