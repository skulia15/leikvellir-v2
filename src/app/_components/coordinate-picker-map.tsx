"use client";

import { Map as MapIcon, Satellite, Maximize2, Minimize2, Search, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect, useId, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "~/env";
import { useT } from "~/lib/i18n";
import { forwardGeocode, type ForwardGeocodeResult } from "~/lib/geocoding";
import { Input } from "~/components/ui/input";
import type { MapRef, ViewState } from "react-map-gl/mapbox";

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
  const mapRef = useRef<MapRef | null>(null);
  // Track whether coordinate change originated from a map click (vs external source)
  const isClickInitiatedRef = useRef(false);

  useEffect(() => {
    void import("react-map-gl/mapbox").then(setMapModule);
  }, []);

  const [markerPosition, setMarkerPosition] = useState({
    lat: latitude || defaultCenter.lat,
    lng: longitude || defaultCenter.lng,
  });

  // Use controlled viewState to prevent map from resetting
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: longitude || defaultCenter.lng,
    latitude: latitude || defaultCenter.lat,
    zoom: 14,
  });

  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ForwardGeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listboxId = useId();

  const t = useT();

  // Update marker position when props change (from external source)
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
      // Only fly if change was external (not from clicking the map)
      if (!isClickInitiatedRef.current) {
        setViewState(prev => ({
          ...prev,
          longitude: longitude,
          latitude: latitude,
          zoom: 14,
        }));
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
    setActiveIndex(-1);

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
      setActiveIndex(-1);
      setIsSearching(false);
    }, 300);
  }, []);

  const handleSelectResult = useCallback((result: ForwardGeocodeResult) => {
    setMarkerPosition({ lat: result.lat, lng: result.lng });
    isClickInitiatedRef.current = true;
    onCoordinateChange(result.lat, result.lng);
    setSearchQuery(result.formattedAddress);
    setShowResults(false);
    setActiveIndex(-1);

    // Fly to the selected location
    setViewState(prev => ({
      ...prev,
      longitude: result.lng,
      latitude: result.lat,
      zoom: 16,
    }));
  }, [onCoordinateChange]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    // Trigger map resize after the container animation completes
    setTimeout(() => {
      mapRef.current?.resize();
    }, 350);
  }, []);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false);
      setActiveIndex(-1);
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

  // Determine map height based on expanded state
  // When expandable, we control the height internally and ignore the className height
  const mapHeight = isExpanded ? "h-[500px]" : "h-80";

  // Filter out height classes from className when expandable
  const filteredClassName = expandable
    ? className.replace(/h-\S+/g, '').trim()
    : className;

  const isResultsOpen = showResults && searchResults.length > 0;

  return (
    <div className={`relative ${filteredClassName}`}>
      {/* Search bar above map */}
      {showSearch && (
        <div className="mb-2 relative" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isResultsOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                isResultsOpen && activeIndex >= 0
                  ? `${listboxId}-option-${activeIndex}`
                  : undefined
              }
              aria-label={t("map.searchAddress")}
              placeholder={t("map.searchAddress")}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  if (searchResults.length === 0) return;
                  e.preventDefault();
                  setShowResults(true);
                  setActiveIndex((prev) =>
                    prev < searchResults.length - 1 ? prev + 1 : 0,
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  if (searchResults.length === 0) return;
                  e.preventDefault();
                  setShowResults(true);
                  setActiveIndex((prev) =>
                    prev <= 0 ? searchResults.length - 1 : prev - 1,
                  );
                  return;
                }
                if (e.key === "Home" && isResultsOpen) {
                  e.preventDefault();
                  setActiveIndex(0);
                  return;
                }
                if (e.key === "End" && isResultsOpen) {
                  e.preventDefault();
                  setActiveIndex(searchResults.length - 1);
                  return;
                }
                if (e.key === "Escape" && isResultsOpen) {
                  e.preventDefault();
                  setShowResults(false);
                  setActiveIndex(-1);
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    const target =
                      activeIndex >= 0 && activeIndex < searchResults.length
                        ? searchResults[activeIndex]!
                        : searchResults[0]!;
                    handleSelectResult(target);
                  }
                }
              }}
              className="pl-9 pr-8 bg-background/95 backdrop-blur-sm"
            />
            {isSearching && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          {isResultsOpen && (
            <div
              id={listboxId}
              role="listbox"
              aria-label={t("a11y.searchAddressResults")}
              className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto z-50"
            >
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm transition-colors border-b last:border-b-0 ${
                    index === activeIndex ? "bg-muted" : "hover:bg-muted"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
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
      )}

      <div className={`relative ${mapHeight} rounded-lg overflow-hidden transition-all duration-300`}>
        <Map
          ref={mapRef}
          mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
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

        {/* Expand/Collapse button */}
        {expandable && (
          <button
            type="button"
            className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md border bg-background/90 px-2.5 py-1.5 text-sm shadow-md backdrop-blur-sm transition-colors hover:bg-background"
            onClick={handleToggleExpand}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-4 w-4 text-foreground" />
                <span className="text-foreground">{t("map.collapse")}</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 text-foreground" />
                <span className="text-foreground">{t("map.expand")}</span>
              </>
            )}
          </button>
        )}

        {/* Coordinates display */}
        <div className="absolute left-2 bottom-2 rounded-md border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-md backdrop-blur-sm">
          {markerPosition.lat.toFixed(5)}, {markerPosition.lng.toFixed(5)}
        </div>
      </div>
    </div>
  );
}
