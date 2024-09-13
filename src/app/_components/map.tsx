"use client";

import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import { env } from "~/env";

const center = {
  lat: 64.071, // Your default latitude
  lng: -21.954, // Your default longitude
};

export function GoogleMap() {
  return (
    <APIProvider
      // TODO: Hide API key
      apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
    >
      <div className="h-screen">
        <Map
          defaultZoom={15}
          defaultCenter={center}
          onCameraChanged={(ev: MapCameraChangedEvent) =>
            console.log(
              "camera changed:",
              ev.detail.center,
              "zoom:",
              ev.detail.zoom,
            )
          }
        ></Map>
      </div>
    </APIProvider>
  );
}
