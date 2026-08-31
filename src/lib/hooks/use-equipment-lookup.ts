"use client";

import { useMemo } from "react";

import { api } from "~/trpc/react";
import type { Equipment, MultilingualName, Playground } from "~/types";

/** The subset of an equipment record that list and map views actually render. */
export type CatalogEquipment = Pick<Equipment, "id" | "name" | "category"> &
  Partial<Equipment>;

export type EquipmentLookup = Map<number, CatalogEquipment>;

/**
 * The equipment catalog, keyed by id.
 *
 * `playground.getAll` returns bare `equipmentId`s rather than inlining the same
 * 39 equipment records into all 659 playground links, so views that need names
 * or categories resolve them through this. The catalog is small (44 rows) and
 * changes rarely, so it is fetched once and reused across every page.
 */
export function useEquipmentLookup(): EquipmentLookup {
  const { data } = api.equipment.getCatalog.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });

  return useMemo(
    () => new Map((data ?? []).map((item) => [item.id, item])),
    [data],
  );
}

/**
 * Equipment records for a playground, from whichever shape it arrived in:
 * `getById` still embeds them, `getAll` leaves ids for the catalog to resolve.
 * Ids with no catalog entry are dropped rather than rendered as blanks.
 */
export function resolveEquipment(
  playground: Pick<Playground, "playgroundEquipment">,
  lookup: EquipmentLookup,
): CatalogEquipment[] {
  if (!playground.playgroundEquipment) return [];

  return playground.playgroundEquipment
    .map((pe) => pe.equipment ?? lookup.get(pe.equipmentId))
    .filter((item): item is CatalogEquipment => item !== undefined);
}

/**
 * Whether a playground has equipment with the given Icelandic name. Names are
 * multilingual objects, but older rows may still hold a plain string.
 */
export function hasEquipmentNamed(
  playground: Pick<Playground, "playgroundEquipment">,
  nameIs: string,
  lookup: EquipmentLookup,
): boolean {
  const target = nameIs.toLowerCase();

  return resolveEquipment(playground, lookup).some((item) => {
    const name = item.name as string | MultilingualName;
    if (typeof name === "string") return name.toLowerCase() === target;
    return name.is?.toLowerCase() === target;
  });
}
