import Link from "next/link";
import { type Metadata } from "next";
import { municipalityPath } from "~/lib/municipality-slug";
import { getBaseUrl } from "~/lib/seo/base-url";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";
import { BreadcrumbSchema } from "~/lib/seo/structured-data";
import { getMunicipalities } from "~/server/queries/municipalities";

// Rendered per request: the Workers build has no database, so a prerendered
// copy would ship without any municipalities.
export const dynamic = "force-dynamic";

export const metadata: Metadata = generateSEOMetadata({
  title: "Leiksvæði eftir sveitarfélögum | Leiksvæði.is",
  exactTitle: true,
  description:
    "Finndu leiksvæði og leikvelli eftir sveitarfélagi: Reykjavík, Hafnarfjörður, Garðabær, Kópavogur og fleiri staðir um allt land.",
  path: "/leiksvaedi",
});

export default async function MunicipalitiesPage() {
  const municipalities = await getMunicipalities();
  const baseUrl = getBaseUrl();

  return (
    <div className="container mx-auto px-4 py-8">
      <BreadcrumbSchema
        items={[
          { name: "Heim", url: baseUrl },
          { name: "Sveitarfélög", url: `${baseUrl}/leiksvaedi` },
        ]}
      />

      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Leiksvæði eftir sveitarfélögum
        </h1>
        <p className="mt-3 text-muted-foreground">
          Veldu sveitarfélag til að sjá öll leiksvæði þar, með myndum, leiktækjum og staðsetningu.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {municipalities.map((m) => (
          <li key={m.slug}>
            <Link
              href={municipalityPath(m.name)}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="font-medium">{m.name}</span>
              <span className="text-sm text-muted-foreground">
                {m.playgroundCount} leiksvæði
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
