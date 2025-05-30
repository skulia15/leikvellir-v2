import { api, HydrateClient } from "~/trpc/server";
import HomeComponent from "./_components/home-client";

export default async function Home() {
  // Prefetch playground data on the server
  void api.playground.getAll.prefetch();

  return (
    <HydrateClient>
      <HomeComponent />
    </HydrateClient>
  );
}
