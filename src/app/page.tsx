import {
  MapErrorBoundary,
  DataErrorBoundary,
} from "~/components/ui/error-boundary";
import {
  MapErrorFallback,
  DataErrorFallback,
} from "~/components/ui/error-fallbacks";

import { api, HydrateClient } from "~/trpc/server";
import { GoogleMap } from "./_components/map";
import PlaygroundDrawer from "./_components/playground-drawer";
import PlaygroundList from "./_components/playground-list";

export default async function Home() {
  void api.playground.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <MapErrorBoundary fallback={MapErrorFallback}>
          <GoogleMap />
        </MapErrorBoundary>

        <PlaygroundDrawer>
          <DataErrorBoundary fallback={DataErrorFallback}>
            <PlaygroundList />
          </DataErrorBoundary>
        </PlaygroundDrawer>
      </div>
    </HydrateClient>
  );
}
