import { HydrateClient, publicApi } from "~/trpc/server";
import { type Metadata, type Viewport } from "next";
import HomeComponent from "~/app/_components/home-client";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";

// ISR: static, regenerated at most every 5 min (mutations also purge via revalidatePath)
export const revalidate = 300;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export const metadata: Metadata = generateSEOMetadata({
  title: "Leiksvæði | Leikvellir á Íslandi",
  exactTitle: true,
  description:
    "Uppgötvaðu og kortleggðu leiksvæði víðsvegar um Ísland. Finndu skemmtilega leikvelli með leiktækjum og ítarlegum upplýsingum fyrir fjölskylduna á gagnvirku korti.",
  path: "/",
});

export default async function Home() {
  // Awaited so the dehydrated cache already holds the playgrounds when the
  // client renders on the server; otherwise SSR emits no playground links.
  // getAll returns bare equipmentIds, so the catalog goes with it.
  await Promise.all([
    publicApi.playground.getAll.prefetch(),
    publicApi.equipment.getCatalog.prefetch(),
  ]);

  return (
    <HydrateClient>
      <HomeComponent />
    </HydrateClient>
  );
}
