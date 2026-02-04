"use client";

import { Map as MapIcon, Satellite, Maximize2, X, Search, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { env } from "~/env";
import { useT } from "~/lib/i18n";
import { forwardGeocode, type ForwardGeocodeResult } from "~/lib/geocoding";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import type { MapRef } from "react-map-gl/mapbox";

const MAP_STYLES = {
  standard: "mapbox://styles/skulipardus/cmkzwe4f2005s01skane25k5g",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

interface CoordinatePickerMapProps {
  latitude: number;
  longitude: number;
  onCoordinateChange: (lat: number, lng: number) => void;
  className?: string;
  expandable?: boolean;
  showSearch?: boolean;
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
  expandable = false,
  showSearch = false,
}: CoordinatePickerMapProps) {
  // Lazy import to avoid loading mapbox-gl at SSR time
  const [MapModule, setMapModule] = useState<typeof import("react-map-gl/mapbox") | null>(null);
  const mapRef = useRef<MapRef>(null);
  const expandedMapRef = useRef<MapRef>(null);
  // Track whether coordinate change originated from a map click (vs external source)
  const isClickInitiatedRef = useRef(false);

  useEffect(() => {
    void import("react-map-gl/mapbox").then(setMapModule);
  }, []);

  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ForwardGeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = useT();

  // Update marker position AND fly map to new location when props change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
      // Only fly if change was external (not from clicking the map)
      if (!isClickInitiatedRef.current) {
        mapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 1000,
        });
        expandedMapRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 1000,
        });
      }
      isClickInitiatedRef.current = false;
    }
  }, [latitude, longitude]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      const { lng, lat } = event.lngLat;
      setMarkerPosition({ lat, lng });
      isClickInitiatedRef.current = true;
      onCoordinateChange(lat, lng);
    },
    [onCoordinateChange],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setShowResults(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await forwardGeocode(value);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, []);

  const handleSelectResult = useCallback((result: ForwardGeocodeResult) => {
    setMarkerPosition({ lat: result.lat, lng: result.lng });
    isClickInitiatedRef.current = true;
    onCoordinateChange(result.lat, result.lng);
    setSearchQuery(result.formattedAddress);
    setShowResults(false);

    // Fly to the selected location
    mapRef.current?.flyTo({
      center: [result.lng, result.lat],
      zoom: 16,
      duration: 1000,
    });
    expandedMapRef.current?.flyTo({
      center: [result.lng, result.lat],
      zoom: 16,
      duration: 1000,
    });
  }, [onCoordinateChange]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCloseExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
    };

    if (showResults) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showResults]);

  if (!MapModule) {
    return (
      <div className={`relative ${className}`}>
        <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
          <div className="text-muted-foreground text-sm">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const { default: Map, Marker } = MapModule;

  const SearchBar = ({ className: searchClassName = "" }: { className?: string }) => (
    <div className={`relative ${searchClassName}`} onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t("map.searchAddress")}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="pl-9 pr-8 bg-background/95 backdrop-blur-sm"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
          {searchResults.map((result, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0"
              onClick={() => handleSelectResult(result)}
            >
              <div className="font-medium truncate">{result.formattedAddress}</div>
              {result.municipality && (
                <div className="text-xs text-muted-foreground">{result.municipality}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const MapContent = ({ mapRefProp, isExpandedView = false }: { mapRefProp: React.RefObject<MapRef | null>; isExpandedView?: boolean }) => (
    <>
      <Map
        ref={mapRefProp}
        mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
        initialViewState={{
          longitude: markerPosition.lng,
          latitude: markerPosition.lat,
          zoom: 14,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLES[mapStyle]}
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
          offset={[0, 6]}
        />
      </Map>

      {/* Map style toggle */}
      <button
        type="button"
        className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md border bg-background/90 px-2.5 py-1.5 text-sm shadow-md backdrop-blur-sm transition-colors hover:bg-background"
        onClick={() => setMapStyle((s) => (s === "standard" ? "satellite" : "standard"))}
      >
        {mapStyle === "standard" ? (
          <>
            <Satellite className="h-4 w-4 text-foreground" />
            <span className="text-foreground">{t("map.satelliteView")}</span>
          </>
        ) : (
          <>
            <MapIcon className="h-4 w-4 text-foreground" />
            <span className="text-foreground">{t("map.mapView")}</span>
          </>
        )}
      </button>

      {/* Expand button (only on main map, not expanded view) */}
      {expandable && !isExpandedView && (
        <button
          type="button"
          className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md border bg-background/90 px-2.5 py-1.5 text-sm shadow-md backdrop-blur-sm transition-colors hover:bg-background"
          onClick={handleExpand}
        >
          <Maximize2 className="h-4 w-4 text-foreground" />
          <span className="text-foreground">{t("map.expand")}</span>
        </button>
      )}
    </>
  );

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Search bar above map */}
        {showSearch && (
          <div className="mb-2">
            <SearchBar />
          </div>
        )}

        <div className="relative h-full rounded-lg overflow-hidden">
          <MapContent mapRefProp={mapRef} />
        </div>
      </div>

      {/* Expanded fullscreen modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 bg-background rounded-lg shadow-2xl border overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{t("map.selectLocation")}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCloseExpanded}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search bar in expanded view */}
            {showSearch && (
              <div className="p-4 border-b">
                <SearchBar />
              </div>
            )}

            {/* Map */}
            <div className="flex-1 relative">
              <MapContent mapRefProp={expandedMapRef} isExpandedView={true} />
            </div>

            {/* Footer with coordinates */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t("map.coordinates")}: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
              </div>
              <Button type="button" onClick={handleCloseExpanded}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
