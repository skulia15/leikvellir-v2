import {
  type EquipmentCategory,
  type MultilingualName,
  type Playground,
} from "~/types";
import { isSchoolGroundAccessible } from "./school-hours";

export type AmenityFilterKey =
  | "hasFencing"
  | "hasBathroomNearby"
  | "hasPicnicTable"
  | "hasSeating"
  | "hasSoftPlayArea";

export interface MapPlaygroundFilters {
  search?: string;
  toddlerFriendly?: boolean;
  publiclyAccessible?: boolean;
  accessibleNow?: boolean; // Includes publicly accessible + school grounds during accessible hours
  categories?: EquipmentCategory[];
  bouncyPillow?: boolean;
  footballField?: boolean;
  hasFencing?: boolean;
  hasBathroomNearby?: boolean;
  hasPicnicTable?: boolean;
  hasSeating?: boolean;
  hasSoftPlayArea?: boolean;
}

export const AMENITY_FILTER_KEYS: readonly AmenityFilterKey[] = [
  "hasFencing",
  "hasBathroomNearby",
  "hasPicnicTable",
  "hasSeating",
  "hasSoftPlayArea",
] as const;

/**
 * Fold Icelandic diacritics and special letters to plain ASCII lowercase
 * for diacritic-insensitive search matching.
 *
 * Handles NFD combining marks (á→a, é→e, í→i, ó→o, ú→u, ý→y, ö→o, etc.)
 * as well as non-decomposing Icelandic letters (ð→d, þ→th, æ→ae, ö→o).
 */
export function foldIcelandic(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/æ/g, "ae")
    .replace(/ö/g, "o");
}

/**
 * Diacritic-insensitive substring check against a single target string.
 */
export function matchesIcelandicText(target: string, query: string): boolean {
  const foldedQuery = foldIcelandic(query).trim();
  if (!foldedQuery) return true;
  return foldIcelandic(target).includes(foldedQuery);
}

/**
 * Diacritic-insensitive search matching against a playground's title and municipality.
 * Multi-word queries require all tokens to appear in the combined title + municipality text.
 */
export function matchesPlaygroundSearch(
  playground: Pick<Playground, "title" | "municipality">,
  query: string,
): boolean {
  const foldedQuery = foldIcelandic(query).trim();
  if (!foldedQuery) return true;

  const tokens = foldedQuery.split(/\s+/);
  const haystack = foldIcelandic(
    `${playground.title} ${playground.municipality ?? ""}`,
  );

  return tokens.every((token) => haystack.includes(token));
}

/**
 * Compare two strings using Icelandic alphabetical collation ("is").
 * Properly orders Icelandic letters (Á, Ð, É, Í, Ó, Ú, Ý, Þ, Æ, Ö).
 */
export function compareIcelandic(a: string, b: string): number {
  return a.localeCompare(b, "is");
}

/**
 * Return a new array of playgrounds sorted alphabetically by title in Icelandic order.
 */
export function sortPlaygroundsByName<T extends { title: string }>(
  playgrounds: readonly T[],
): T[] {
  return [...playgrounds].sort((a, b) => compareIcelandic(a.title, b.title));
}

export interface EquipmentCatalogItem {
  name: string | MultilingualName;
  category: EquipmentCategory;
}

export type EquipmentCatalogLookup = ReadonlyMap<number, EquipmentCatalogItem>;

function resolvePlaygroundEquipment(
  playground: Pick<Playground, "playgroundEquipment">,
  equipmentLookup?: EquipmentCatalogLookup,
): EquipmentCatalogItem[] {
  if (!playground.playgroundEquipment) return [];
  const items: EquipmentCatalogItem[] = [];
  for (const pe of playground.playgroundEquipment) {
    const resolved = pe.equipment ?? equipmentLookup?.get(pe.equipmentId);
    if (resolved) {
      items.push(resolved);
    }
  }
  return items;
}

/**
 * Check whether a playground has a specific piece of equipment by its Icelandic name.
 */
export function hasEquipmentByName(
  playground: Pick<Playground, "playgroundEquipment">,
  nameIs: string,
  equipmentLookup?: EquipmentCatalogLookup,
): boolean {
  const target = foldIcelandic(nameIs).trim();
  return resolvePlaygroundEquipment(playground, equipmentLookup).some((item) => {
    const name = item.name as string | MultilingualName;
    if (typeof name === "string") {
      return foldIcelandic(name).trim() === target;
    }
    return name.is ? foldIcelandic(name.is).trim() === target : false;
  });
}

/**
 * Returns true if any filter (including non-empty search query) is active.
 */
export function hasActiveMapFilters(filters: MapPlaygroundFilters): boolean {
  if (filters.search && filters.search.trim().length > 0) return true;
  if (filters.toddlerFriendly !== undefined) return true;
  if (filters.publiclyAccessible !== undefined) return true;
  if (filters.accessibleNow !== undefined) return true;
  if (filters.bouncyPillow) return true;
  if (filters.footballField) return true;
  if (filters.categories && filters.categories.length > 0) return true;
  return AMENITY_FILTER_KEYS.some((key) => filters[key] === true);
}

/**
 * Count active secondary filters (equipment categories, special equipment, and amenities) for compact UI badges.
 */
export function countSecondaryMapFilters(filters: MapPlaygroundFilters): number {
  let count = filters.categories?.length ?? 0;
  if (filters.bouncyPillow) count += 1;
  if (filters.footballField) count += 1;
  for (const key of AMENITY_FILTER_KEYS) {
    if (filters[key]) count += 1;
  }
  return count;
}

/**
 * Shared predicate to check if a playground satisfies all active map/sidebar filters.
 */
export function matchesMapFilters(
  playground: Playground,
  filters: MapPlaygroundFilters,
  equipmentLookup?: EquipmentCatalogLookup,
): boolean {
  if (filters.search && !matchesPlaygroundSearch(playground, filters.search)) {
    return false;
  }

  if (
    filters.toddlerFriendly !== undefined &&
    playground.toddlerFriendly !== filters.toddlerFriendly
  ) {
    return false;
  }

  if (
    filters.publiclyAccessible !== undefined &&
    playground.publiclyAccessible !== filters.publiclyAccessible
  ) {
    return false;
  }

  if (filters.accessibleNow) {
    // School grounds: check school hours (regardless of publiclyAccessible flag)
    // Non-school grounds: check publiclyAccessible flag
    const isAccessible = playground.isSchoolGround
      ? isSchoolGroundAccessible(playground.isSchoolGround)
      : playground.publiclyAccessible;
    if (!isAccessible) {
      return false;
    }
  }

  if (filters.categories && filters.categories.length > 0) {
    const categorySet = new Set(filters.categories);
    const hasMatchingCategory = resolvePlaygroundEquipment(
      playground,
      equipmentLookup,
    ).some((item) => categorySet.has(item.category));
    if (!hasMatchingCategory) {
      return false;
    }
  }

  if (
    filters.bouncyPillow &&
    !hasEquipmentByName(playground, "Ærslabelgur", equipmentLookup)
  ) {
    return false;
  }

  if (
    filters.footballField &&
    !hasEquipmentByName(playground, "Fótboltavöllur", equipmentLookup)
  ) {
    return false;
  }

  for (const amenityKey of AMENITY_FILTER_KEYS) {
    if (filters[amenityKey] && !playground[amenityKey]) {
      return false;
    }
  }

  return true;
}
