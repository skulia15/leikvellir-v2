"use client";

import { useState, useCallback, useEffect } from "react";
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
  if (env.NEXT_PUBLIC_MAP_PROVIDER === "mapbox") {
    return (
      <MapboxCoordinatePicker
        latitude={latitude}
        longitude={longitude}
        onCoordinateChange={onCoordinateChange}
        className={className}
      />
    );
  }

  return (
    <GoogleCoordinatePicker
      latitude={latitude}
      longitude={longitude}
      onCoordinateChange={onCoordinateChange}
      className={className}
    />
  );
}

// ─── Mapbox implementation ───────────────────────────────────────────────────

function MapboxCoordinatePicker({
  latitude,
  longitude,
  onCoordinateChange,
  className = "",
}: CoordinatePickerMapProps) {
  // Lazy import to avoid loading mapbox-gl when using Google
  const [MapModule, setMapModule] = useState<typeof import("react-map-gl/mapbox") | null>(null);

  useEffect(() => {
    void import("react-map-gl/mapbox").then(setMapModule);
  }, []);

  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  const t = useT();

  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
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

// ─── Google Maps implementation ──────────────────────────────────────────────

function GoogleCoordinatePicker({
  latitude,
  longitude,
  onCoordinateChange,
  className = "",
}: CoordinatePickerMapProps) {
  const [GoogleModule, setGoogleModule] = useState<typeof import("@vis.gl/react-google-maps") | null>(null);

  useEffect(() => {
    void import("@vis.gl/react-google-maps").then(setGoogleModule);
  }, []);

  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  const [mapCenter, setMapCenter] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  const t = useT();

  useEffect(() => {
    if (latitude && longitude) {
      const newPosition = { lat: latitude, lng: longitude };
      setMarkerPosition(newPosition);
      setMapCenter(newPosition);
    }
  }, [latitude, longitude]);

  if (!GoogleModule) {
    return (
      <div className={`relative ${className}`}>
        <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading map...</div>
        </div>
      </div>
    );
  }

  const { APIProvider, Map, AdvancedMarker } = GoogleModule;

  return (
    <APIProvider apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className={`relative ${className}`}>
        <Map
          defaultZoom={14}
          center={mapCenter}
          onClick={(event) => {
            if (event.detail.latLng) {
              const lat = event.detail.latLng.lat;
              const lng = event.detail.latLng.lng;
              setMarkerPosition({ lat, lng });
              setMapCenter({ lat, lng });
              onCoordinateChange(lat, lng);
            }
          }}
          onCameraChanged={(event) => {
            setMapCenter(event.detail.center);
          }}
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
            title={t("map.selectedPlaygroundLocation")}
          />
        </Map>

        <div className="absolute left-2 top-2 rounded-md border bg-background/90 px-3 py-2 text-sm shadow-md backdrop-blur-sm">
          <p className="font-medium text-foreground">
            {t("map.clickToSetLocation")}
          </p>
        </div>
      </div>
    </APIProvider>
  );
}
