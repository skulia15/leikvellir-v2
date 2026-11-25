/**
 * URL slugs for municipality landing pages (`/leiksvaedi/hafnarfjordur`).
 *
 * Icelandic letters that don't decompose into a base letter plus accent are
 * transliterated the conventional way (þ→th, ð→d, æ→ae); the rest lose their
 * accents via Unicode decomposition (á→a, ö→o).
 */
const TRANSLITERATIONS: Record<string, string> = {
  þ: 'th',
  ð: 'd',
  æ: 'ae',
  ø: 'o',
};

export function municipalitySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[þðæø]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Path of the landing page listing every playground in a municipality. */
export function municipalityPath(name: string): string {
  return `/leiksvaedi/${municipalitySlug(name)}`;
}

/**
 * Municipalities with fewer approved playgrounds than this get a page for
 * visitors but are kept out of the sitemap and marked noindex: a one-item
 * list is thin content that can drag down how Google rates the whole site.
 */
export const MIN_INDEXABLE_PLAYGROUNDS = 2;
