/**
 * Cluster marker showing the count of playgrounds in a cluster.
 * Scales size based on point count for visual hierarchy.
 */
import { Marker } from "react-map-gl/mapbox";
import { useT } from "~/lib/i18n";

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
  const t = useT();
  const label = t("playground.clusterLabel", { count: pointCount });
  // Scale the cluster circle size based on proportion of total points.
  // Floor is 44px: the smallest cluster is still a thumb target.
  const ratio = pointCount / totalPoints;
  const size = Math.max(44, Math.min(60, 44 + ratio * 16));

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
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="flex items-center justify-center rounded-full bg-primary text-primary-foreground
          font-semibold shadow-lg cursor-pointer transition-transform duration-200
          hover:scale-110 animate-marker-scale-up border-2 border-white/80"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: size < 48 ? "13px" : "14px",
        }}
      >
        {pointCount}
      </div>
    </Marker>
  );
}
