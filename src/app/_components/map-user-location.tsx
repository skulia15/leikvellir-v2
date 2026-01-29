/**
 * User location dot with animated ping rings for the Mapbox map.
 * Renders as a Mapbox Marker at the user's GPS coordinates.
 */
import { Marker } from "react-map-gl/mapbox";
import { type UserLocation } from "~/lib/geo-utils";

interface MapUserLocationProps {
  location: UserLocation;
}

export function MapUserLocation({ location }: MapUserLocationProps) {
  return (
    <Marker
      longitude={location.lng}
      latitude={location.lat}
      anchor="center"
    >
      <div className="relative flex items-center justify-center">
        {/* Ping animation rings */}
        <div
          className="absolute h-8 w-8 rounded-full bg-blue-500 animate-ping opacity-15"
          style={{ animationDuration: "4s", animationDelay: "0s" }}
        />
        <div
          className="absolute h-6 w-6 rounded-full bg-blue-500 animate-ping opacity-25"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />
        {/* Main location dot */}
        <div className="h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg relative z-10" />
      </div>
    </Marker>
  );
}
