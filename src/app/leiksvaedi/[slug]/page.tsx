import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { Camera, GraduationCap } from "lucide-react";
import { formatIcelandicLocation } from "~/lib/icelandic-declension";
import { blurPlaceholderProps } from "~/lib/image-placeholder";
import { MIN_INDEXABLE_PLAYGROUNDS, municipalityPath } from "~/lib/municipality-slug";
import { getBaseUrl } from "~/lib/seo/base-url";
import { generateMetadata as generateSEOMetadata } from "~/lib/seo/metadata";
import { BreadcrumbSchema, PlaygroundListSchema } from "~/lib/seo/structured-data";
import { getMunicipalities, getMunicipalityBySlug } from "~/server/queries/municipalities";

/*
 * Landing page per municipality ("Leiksvæði í Hafnarfirði"), aimed at local
 * searches the generic /playgrounds page can't rank for. Server-rendered in
 * Icelandic only: these pages exist for Icelandic search queries.
 */

interface MunicipalityPageProps {
  params: Promise<{ slug: string }>;
}

// ISR: rendered on first request, regenerated at most every 5 min
// (mutations also purge via revalidatePath)
export const revalidate = 300;

// No pages at build time (the Workers build has no database); each slug renders on demand
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: MunicipalityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const municipality = await getMunicipalityBySlug(slug);
  if (!municipality) {
    return { title: "Sveitarfélag fannst ekki", robots: { index: false, follow: false } };
  }

  const location = formatIcelandicLocation(municipality.name);
  const metadata = generateSEOMetadata({
    title: `Leiksvæði ${location} | Leiksvæði.is`,
    exactTitle: true,
    description: `${municipality.playgroundCount} leiksvæði og leikvellir ${location}, með myndum, leiktækjum, aðgengi og staðsetningu á korti. Finndu leiksvæði fyrir börnin í nágrenninu.`,
    path: municipalityPath(municipality.name),
    keywords: [
      "leiksvæði",
      "leikvöllur",
      "leikvellir",
      "róló",
      `leiksvæði ${location}`,
      `leikvellir ${location}`,
      municipality.name.toLowerCase(),
    ],
  });

  // Too few playgrounds to be worth indexing, but still pass link equity on
  if (municipality.playgroundCount < MIN_INDEXABLE_PLAYGROUNDS) {
    return { ...metadata, robots: { index: false, follow: true }, alternates: undefined };
  }
  return metadata;
}

export default async function MunicipalityPage({ params }: MunicipalityPageProps) {
  const { slug } = await params;
  const [municipality, allMunicipalities] = await Promise.all([
    getMunicipalityBySlug(slug),
    getMunicipalities(),
  ]);
  if (!municipality) {
    notFound();
  }

  const location = formatIcelandicLocation(municipality.name);
  const baseUrl = getBaseUrl();
  const pageUrl = `${baseUrl}${municipalityPath(municipality.name)}`;
  const otherMunicipalities = allMunicipalities.filter(
    (m) => m.slug !== municipality.slug && m.playgroundCount >= MIN_INDEXABLE_PLAYGROUNDS,
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <PlaygroundListSchema
        name={`Leiksvæði ${location}`}
        description={`Listi yfir leiksvæði ${location}`}
        playgrounds={municipality.playgrounds.map((p) => ({
          id: p.id,
          name: p.title,
          municipality: municipality.name,
        }))}
      />
      <BreadcrumbSchema
        items={[
          { name: "Heim", url: baseUrl },
          { name: "Sveitarfélög", url: `${baseUrl}/leiksvaedi` },
          { name: municipality.name, url: pageUrl },
        ]}
      />

      <nav aria-label="Brauðmolar" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">Heim</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/leiksvaedi" className="hover:text-foreground">Sveitarfélög</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-foreground">{municipality.name}</li>
        </ol>
      </nav>

      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Leiksvæði {location}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {municipality.playgroundCount} leiksvæði {location} eru á skrá hjá Leiksvæði.is.
          Hvert þeirra er með myndum, lista yfir leiktæki, upplýsingum um aðgengi og staðsetningu
          á korti.
        </p>
        <Link
          href={`/playgrounds?municipality=${encodeURIComponent(municipality.name)}`}
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sía eftir leiktækjum
        </Link>
      </header>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {municipality.playgrounds.map((playground, index) => (
          <li key={playground.id}>
            <Link
              href={`/playground/${playground.id}`}
              className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {playground.coverImage?.trim() ? (
                  <Image
                    src={playground.coverImage}
                    {...blurPlaceholderProps(playground.coverImageBlur)}
                    alt={playground.title}
                    fill
                    priority={index < 3}
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <Camera className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-4">
                <h2 className="font-display text-lg font-semibold leading-snug">{playground.title}</h2>
                {playground.isSchoolGround && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    <GraduationCap className="h-3 w-3" aria-hidden="true" />
                    Skólalóð
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {otherMunicipalities.length > 0 && (
        <section className="mt-12" aria-labelledby="other-municipalities">
          <h2 id="other-municipalities" className="font-display text-xl font-semibold">
            Leiksvæði í öðrum sveitarfélögum
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {otherMunicipalities.map((m) => (
              <li key={m.slug}>
                <Link
                  href={municipalityPath(m.name)}
                  className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  {m.name} ({m.playgroundCount})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
