"use client";

import { useState, useCallback, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapCameraChangedEvent,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { env } from "~/env";
import { useT } from "~/lib/i18n";

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
  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  const [mapCenter, setMapCenter] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  const t = useT();

  // Update marker position when props change
  useEffect(() => {
    if (latitude && longitude) {
      const newPosition = { lat: latitude, lng: longitude };
      setMarkerPosition(newPosition);
      setMapCenter(newPosition);
    }
  }, [latitude, longitude]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (event.detail.latLng) {
        const lat = event.detail.latLng.lat;
        const lng = event.detail.latLng.lng;
        setMarkerPosition({ lat, lng });
        onCoordinateChange(lat, lng);
      }
    },
    [onCoordinateChange],
  );

  const handleCameraChange = useCallback((event: MapCameraChangedEvent) => {
    setMapCenter(event.detail.center);
  }, []);

  return (
    <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <div className={`relative ${className}`}>
        <Map
          defaultZoom={14}
          center={mapCenter}
          onClick={handleMapClick}
          onCameraChanged={handleCameraChange}
          mapId="coordinate-picker-map"
          className="h-full w-full rounded-md"
          gestureHandling="greedy"
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          zoomControl={true}
          scaleControl={false}
          cameraControl={false}
          clickableIcons={false}
          draggableCursor="default"
          draggingCursor="grabbing"
        >
          <AdvancedMarker
            position={markerPosition}
            title={t('map.selectedPlaygroundLocation')}
          />
        </Map>

        {/* Instruction overlay */}
        <div className="absolute left-2 top-2 rounded-md border bg-background/90 px-3 py-2 text-sm shadow-md backdrop-blur-sm">
          <p className="font-medium text-foreground">
            {t('map.clickToSetLocation')}
          </p>
          {/* <p className="text-xs text-muted-foreground">
            {t('playground.latitude')}: {markerPosition.lat.toFixed(6)}, {t('playground.longitude')}:{" "}
            {markerPosition.lng.toFixed(6)}
          </p> */}
        </div>
      </div>
    </APIProvider>
  );
}
