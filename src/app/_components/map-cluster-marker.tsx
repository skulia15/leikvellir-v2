/**
 * Cluster marker showing the count of playgrounds in a cluster.
 * Scales size based on point count for visual hierarchy.
 */
import { memo, useCallback } from "react";
import { Marker } from "react-map-gl/mapbox";
import { useT } from "~/lib/i18n";

interface MapClusterMarkerProps {
  clusterId: number;
  longitude: number;
  latitude: number;
  pointCount: number;
  totalPoints: number;
  onClick: (clusterId: number, lng: number, lat: number) => void;
}

export const MapClusterMarker = memo(function MapClusterMarker({
  clusterId,
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

  const handleClick = useCallback(
    (e: { originalEvent: { stopPropagation: () => void } }) => {
      e.originalEvent.stopPropagation();
      onClick(clusterId, longitude, latitude);
    },
    [onClick, clusterId, longitude, latitude],
  );

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      onClick={handleClick}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(clusterId, longitude, latitude);
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
});
