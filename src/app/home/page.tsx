import { GoogleMap } from "../_components/map";

import { api, HydrateClient } from "~/trpc/server";
import PlaygroundDrawer from "../_components/playground-drawer";
import PlaygroundList from "../_components/playground-list";

export default async function Home() {
  void api.playground.getAll.prefetch();

  return (
    <HydrateClient>
      <div className="flex flex-col">
        <GoogleMap />
        <PlaygroundDrawer>
          <PlaygroundList />
        </PlaygroundDrawer>
      </div>
    </HydrateClient>
  );
}
