import { api, HydrateClient } from "~/trpc/server";
import PlaygroundsPageClient from "~/app/_components/playgrounds-page-client";

export default function PlaygroundsPage() {
  // Not awaited: it seeds the dehydrated cache so the client does not refetch
  // the list, without holding up the shell. loading.tsx covers the wait.
  void api.playground.getAll.prefetch();
  // getAll returns bare equipmentIds; the catalog resolves them client-side.
  void api.equipment.getCatalog.prefetch();

  return (
    <HydrateClient>
      <PlaygroundsPageClient />
    </HydrateClient>
  );
}
