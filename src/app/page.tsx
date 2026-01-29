import { api, HydrateClient } from "~/trpc/server";
import { type Metadata, type Viewport } from "next";
import HomeComponent from "./_components/home-client";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: "Leiksvæði | Leikvellir á Íslandi",
  description: "Uppgötvaðu og kortlegðu leiksvæði víðsvegar um Ísland. Finndu skemmtilega leikvelli með leiktækjum og ítarlegum upplýsingum fyrir fjölskylduna á gagnvirku korti.",
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
