import { HydrateClient, publicApi } from "~/trpc/server";
import PlaygroundsPageClient from "~/app/_components/playgrounds-page-client";

export default async function PlaygroundsPage() {
  // Awaited so the dehydrated cache already holds the list when the client
  // renders on the server; otherwise SSR emits only a skeleton with no
  // playground links for crawlers. loading.tsx still covers the wait.
  // getAll returns bare equipmentIds; the catalog resolves them client-side.
  await Promise.all([
    publicApi.playground.getAll.prefetch(),
    publicApi.equipment.getCatalog.prefetch(),
  ]);

  return (
    <HydrateClient>
      <PlaygroundsPageClient />
    </HydrateClient>
  );
}
