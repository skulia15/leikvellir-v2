/**
 * Cluster marker showing the count of playgrounds in a cluster.
 * Scales size based on point count for visual hierarchy.
 */
import { Marker } from "react-map-gl/mapbox";

interface MapClusterMarkerProps {
  longitude: number;
  latitude: number;
  pointCount: number;
  totalPoints: number;
  onClick: () => void;
}

export function MapClusterMarker({
  longitude,
  latitude,
  pointCount,
  totalPoints,
  onClick,
}: MapClusterMarkerProps) {
  // Scale the cluster circle size based on proportion of total points
  const ratio = pointCount / totalPoints;
  const size = Math.max(32, Math.min(56, 32 + ratio * 40));

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-primary text-primary-foreground
          font-semibold shadow-lg cursor-pointer transition-all duration-200
          hover:scale-110 hover:shadow-xl animate-marker-scale-up border-2 border-white/80"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: size < 40 ? "12px" : "14px",
        }}
      >
        {pointCount}
      </div>
    </Marker>
  );
}
