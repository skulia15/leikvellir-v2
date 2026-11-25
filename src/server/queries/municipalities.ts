import { cache } from 'react';
import { and, asc, count, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '~/server/db';
import { playgrounds } from '~/server/db/schema';
import { municipalitySlug } from '~/lib/municipality-slug';

export interface MunicipalitySummary {
  name: string;
  slug: string;
  playgroundCount: number;
  /** Every stored spelling that maps to this slug. */
  spellings: string[];
}

/** Municipalities that have at least one approved playground, largest first. */
export const getMunicipalities = cache(async (): Promise<MunicipalitySummary[]> => {
  const rows = await db
    .select({ name: playgrounds.municipality, playgroundCount: count() })
    .from(playgrounds)
    .where(and(eq(playgrounds.status, 'approved'), isNotNull(playgrounds.municipality)))
    .groupBy(playgrounds.municipality);

  // Different spellings can collapse to one slug ("Grímsnes-og…" vs
  // "Grímsnes- og…"); merge them so each slug is a single page.
  const bySlug = new Map<string, MunicipalitySummary>();
  for (const row of rows) {
    const stored = row.name;
    const name = stored?.trim();
    if (!stored || !name) continue;
    const slug = municipalitySlug(name);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (existing) {
      existing.playgroundCount += row.playgroundCount;
      existing.spellings.push(stored);
    } else {
      bySlug.set(slug, { name, slug, playgroundCount: row.playgroundCount, spellings: [stored] });
    }
  }

  return [...bySlug.values()].sort(
    (a, b) => b.playgroundCount - a.playgroundCount || a.name.localeCompare(b.name, 'is'),
  );
});

export interface MunicipalityPlayground {
  id: number;
  title: string;
  coverImage: string | null;
  coverImageBlur: string | null;
  isSchoolGround: boolean;
}

/** Resolves a slug to its municipality and approved playgrounds, or null if unknown. */
export const getMunicipalityBySlug = cache(async (slug: string) => {
  const municipalities = await getMunicipalities();
  const municipality = municipalities.find((m) => m.slug === slug);
  if (!municipality) return null;

  const items: MunicipalityPlayground[] = await db
    .select({
      id: playgrounds.id,
      title: playgrounds.title,
      coverImage: playgrounds.coverImage,
      coverImageBlur: playgrounds.coverImageBlur,
      isSchoolGround: playgrounds.isSchoolGround,
    })
    .from(playgrounds)
    .where(
      and(
        eq(playgrounds.status, 'approved'),
        inArray(playgrounds.municipality, municipality.spellings),
      ),
    )
    .orderBy(asc(playgrounds.title));

  return { ...municipality, playgrounds: items };
});
