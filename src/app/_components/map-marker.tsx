/**
 * Custom playground marker for the Mapbox map.
 * Color-coded based on accessibility: green (public), amber (school, accessible), red (school, not accessible).
 */
import { Marker } from "react-map-gl/mapbox";
import { MapPin, GraduationCap } from "lucide-react";
import { type Playground } from "~/types";
import {
  getPlaygroundMarkerColor,
  isSchoolGroundAccessible,
} from "~/lib/school-hours";

interface MapMarkerProps {
  playground: Playground;
  isSelected?: boolean;
  onClick: (playground: Playground) => void;
}

export function MapMarker({ playground, isSelected, onClick }: MapMarkerProps) {
  const markerColor = getPlaygroundMarkerColor(
    playground.isSchoolGround,
    playground.schoolType,
  );
  const isSchoolGround = playground.isSchoolGround;
  const isAccessible =
    !isSchoolGround || isSchoolGroundAccessible(isSchoolGround);

  return (
    <Marker
      longitude={playground.longitude}
      latitude={playground.latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(playground);
      }}
    >
      <div
        className={`
          flex h-8 w-8 items-center justify-center rounded-full text-white
          shadow-lg cursor-pointer transition-all duration-200
          hover:scale-110 hover:shadow-xl animate-marker-scale-up
          ${isSelected ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-primary" : ""}
          ${isSchoolGround
            ? isAccessible
              ? "bg-amber-500 hover:bg-amber-600"
              : "bg-red-500 hover:bg-red-600"
            : "bg-green-500 hover:bg-green-600"
          }
        `}
        style={{ backgroundColor: markerColor }}
      >
        {isSchoolGround ? (
          <GraduationCap className="h-5 w-5" />
        ) : (
          <MapPin className="h-5 w-5" />
        )}
      </div>
    </Marker>
  );
}
