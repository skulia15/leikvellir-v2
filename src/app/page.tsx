import { api, HydrateClient } from "~/trpc/server";
import { type Metadata } from "next";
import HomeComponent from "./_components/home-client";

// Override viewport for front page only - prevent zoom on map interactions
export const metadata: Metadata = {
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
};

export default async function Home() {
  // Prefetch playground data on the server
  void api.playground.getAll.prefetch();

  return (
    <HydrateClient>
      <HomeComponent />
    </HydrateClient>
  );
}
