/**
 * Seed Reykjavik playground data from two open data sources:
 *   1. ArcGIS GeoJSON  — 59 public playgrounds with polygon coordinates
 *   2. Reykjavik CKAN API — equipment per playground/school, no coordinates
 *
 * Playgrounds are inserted as status="pending" for admin review.
 * CKAN equipment names are mapped to existing DB equipment IDs where possible;
 * only truly new types (Leikjahús, Hjólabrautir, Strandblakvöllur) get inserted.
 *
 * Usage:
 *   mise x -- npx tsx --env-file=.env scripts/seed-reykjavik.ts             # Preview
 *   mise x -- npx tsx --env-file=.env scripts/seed-reykjavik.ts --confirmed  # Import
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import {
  equipment as equipmentTable,
  playgrounds,
  playgroundEquipment,
  users,
} from "../src/server/db/schema.js";

// ---------------------------------------------------------------------------
// Data sources
// ---------------------------------------------------------------------------

const ARCGIS_URL =
  "https://data-reykjavik.opendata.arcgis.com/datasets/Reykjavik::opin-leiksvaedi.geojson?outSR=%7B%22latestWkid%22%3A4326%7D";

const CKAN_URL =
  "https://gagnagatt.reykjavik.is/api/3/action/datastore_search?resource_id=ad657159-4f0d-41a2-8a31-7875c4673b1a&limit=2000";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// ---------------------------------------------------------------------------
// Equipment mapping: CKAN leiktaeki name → existing DB equipment ID
//   or { category, name } to create a new entry
//   or null to skip entirely
// ---------------------------------------------------------------------------

type EquipmentCategory =
  | "core_equipment"
  | "climbing_and_movement"
  | "imaginative_and_themed"
  | "spinning_and_motion"
  | "fitness_and_obstacle"
  | "toddler_friendly"
  | "additional_common_equipment";

type EquipmentMapping =
  | { dbId: number; dbName: string }                        // map to existing entry
  | { category: EquipmentCategory; newName: string }        // create new entry
  | null;                                                    // skip

const EQUIPMENT_MAP: Record<string, EquipmentMapping> = {
  // ── Mapped to existing DB entries ────────────────────────────────────────
  Rólur:            { dbId: 2,  dbName: "Róla" },
  Rennibraut:       { dbId: 1,  dbName: "Rennibraut" },
  Vegasalt:         { dbId: 3,  dbName: "Vegasalt / Ramba" },
  Gormatæki:        { dbId: 28, dbName: "Gormatæki" },
  Klifurtæki:       { dbId: 4,  dbName: "Klifurgrind / Klifurkastali" },
  Aparóla:          { dbId: 8,  dbName: "Aparóla" },
  Snúningstæki:     { dbId: 19, dbName: "Hringekja" },
  Ungbarnarólur:    { dbId: 26, dbName: "Ungbarnaróla" },
  Jafnvægistæki:    { dbId: 11, dbName: "Jafnvægisstöng" },
  "Skúrar/kofar":   { dbId: 14, dbName: "Kofi" },
  Fótboltavöllur:   { dbId: 37, dbName: "Fótboltavöllur" },
  Körfuboltavöllur: { dbId: 39, dbName: "Körfuboltavöllur" },
  Körfurólur:       { dbId: 34, dbName: "Körfuróla" },
  Ærslabelgur:      { dbId: 31, dbName: "Ærslabelgur" },

  Strandblakvöllur: { dbId: 44, dbName: "Strandblakvöllur" },
  Leikjahús:        { dbId: 43, dbName: "Leikjahús" },
  Hjólabrautir:     { dbId: 42, dbName: "Hjólabrautir" },

  // ── Skip ─────────────────────────────────────────────────────────────────
  Óþekkt: null,
};

// ---------------------------------------------------------------------------
// Types for external APIs
// ---------------------------------------------------------------------------

interface ArcGISFeature {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: { OBJECTID: number; TEGUND: string; HVERFI: number; HEITI: string; NR_LEIKSVAEDI: number };
}

interface ArcGISFeatureCollection {
  type: "FeatureCollection";
  features: ArcGISFeature[];
}

interface CKANRecord {
  _id: number;
  ar: number;
  heiti: string;
  tegund: string; // "Leiksvæði" | "Grunnskóli" | "Leikskóli"
  leiktaeki: string;
  hverfi: string;
}

interface CKANResponse {
  success: boolean;
  result: { total: number; records: CKANRecord[] };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function polygonCentroid(coordinates: number[][][]): { lat: number; lon: number } {
  const ring = coordinates[0]!;
  const lons = ring.map((p) => p[0]!);
  const lats = ring.map((p) => p[1]!);
  return {
    lon: lons.reduce((a, b) => a + b, 0) / lons.length,
    lat: lats.reduce((a, b) => a + b, 0) / lats.length,
  };
}

function normalizeAddress(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(name: string): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({ q: `${name}, Reykjavik, Iceland`, format: "json", limit: "1", countrycodes: "is" });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": "leikvellir-seed-script/1.0 (open-source playground app)" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult[];
  const first = data[0];
  if (!first) return null;
  return { lat: parseFloat(first.lat), lon: parseFloat(first.lon) };
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

function printPreview(distinctEquipment: string[]) {
  console.log("\nEquipment mapping preview:");
  console.log("─".repeat(65));

  const unmapped: string[] = [];
  for (const name of distinctEquipment.sort()) {
    const entry = EQUIPMENT_MAP[name];
    if (entry === undefined) { unmapped.push(name); continue; }
    if (entry === null) {
      console.log(`  ✗  ${name.padEnd(24)} → SKIP`);
    } else if ("dbId" in entry) {
      console.log(`  ✓  ${name.padEnd(24)} → [${entry.dbId}] ${entry.dbName}`);
    } else {
      console.log(`  +  ${name.padEnd(24)} → NEW (${entry.category})`);
    }
  }

  if (unmapped.length > 0) {
    console.log(`\n  NOT IN MAP (add these to EQUIPMENT_MAP before --confirmed):`);
    for (const n of unmapped) console.log(`  ?  ${n}`);
  }

  console.log("─".repeat(65));
  console.log("  ✓ = map to existing  +  = create new  ✗ = skip\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const confirmed = process.argv.includes("--confirmed");
  const testMode = process.argv.includes("--test");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL env var is required");
    process.exit(1);
  }

  // ── Fetch data ─────────────────────────────────────────────────────────────
  console.log("Fetching ArcGIS GeoJSON...");
  const arcgisRes = await fetch(ARCGIS_URL, { redirect: "follow" });
  const arcgisJson = (await arcgisRes.json()) as ArcGISFeatureCollection;
  console.log(`  ${arcgisJson.features.length} public playground features`);

  console.log("Fetching CKAN equipment data...");
  const ckanRes = await fetch(CKAN_URL);
  const ckanJson = (await ckanRes.json()) as CKANResponse;
  const ckanRecords = ckanJson.result.records;
  console.log(`  ${ckanRecords.length} equipment records (${ckanJson.result.total} total)`);

  // ── Preview ────────────────────────────────────────────────────────────────
  const distinctEquipment = Array.from(new Set(ckanRecords.map((r) => r.leiktaeki)));
  printPreview(distinctEquipment);

  const unmapped = distinctEquipment.filter((e) => EQUIPMENT_MAP[e] === undefined);
  if (unmapped.length > 0) {
    console.log("Exiting — add unmapped types to EQUIPMENT_MAP, then run with --confirmed.");
    process.exit(0);
  }

  if (!confirmed && !testMode) {
    console.log("Run with --confirmed to proceed, or --test to import 1 playground.");
    process.exit(0);
  }

  // ── Connect ────────────────────────────────────────────────────────────────
  const conn = postgres(process.env.DATABASE_URL);
  const db = drizzle(conn);

  const adminUsers = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "super_admin")).limit(1);
  const adminUser =
    adminUsers[0] ??
    (await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "admin")).limit(1))[0];

  if (!adminUser) {
    console.error("No admin/super_admin user found. Create one first.");
    await conn.end();
    process.exit(1);
  }
  console.log(`Using user: ${adminUser.email}`);

  // ── Resolve equipment IDs (create new entries where needed) ───────────────
  console.log("\nResolving equipment IDs...");
  const equipmentIdMap = new Map<string, number>(); // CKAN name → DB id

  for (const [ckanName, entry] of Object.entries(EQUIPMENT_MAP)) {
    if (entry === null) continue;

    if ("dbId" in entry) {
      equipmentIdMap.set(ckanName, entry.dbId);
      continue;
    }

    // New entry — check if it already exists first
    const existing = await db
      .select({ id: equipmentTable.id })
      .from(equipmentTable)
      .where(sql`${equipmentTable.name}->>'is' = ${entry.newName}`)
      .limit(1);

    if (existing[0]) {
      equipmentIdMap.set(ckanName, existing[0].id);
      console.log(`  skip (exists) ${entry.newName}`);
      continue;
    }

    const [inserted] = await db
      .insert(equipmentTable)
      .values({ name: { is: entry.newName }, category: entry.category })
      .returning({ id: equipmentTable.id });

    if (inserted) {
      equipmentIdMap.set(ckanName, inserted.id);
      console.log(`  + created: ${entry.newName} (${entry.category})`);
    }
  }

  // ── Build lookup: "tegund||normalizedAddress" → DB equipment IDs ──────────
  const equipmentByKey = new Map<string, number[]>();
  for (const record of ckanRecords) {
    const dbId = equipmentIdMap.get(record.leiktaeki);
    if (!dbId) continue;
    const key = `${record.tegund}||${normalizeAddress(record.heiti)}`;
    const ids = equipmentByKey.get(key) ?? [];
    ids.push(dbId);
    equipmentByKey.set(key, ids);
  }

  let insertedCount = 0;
  let skippedCount = 0;

  // ── Import public playgrounds (ArcGIS) ────────────────────────────────────
  const featuresToImport = testMode ? arcgisJson.features.slice(0, 1) : arcgisJson.features;
  console.log(`\nImporting ${featuresToImport.length} public playground${testMode ? " (test mode)" : "s"}...`);

  for (const feature of featuresToImport) {
    const title = feature.properties.HEITI;
    if (!title) { console.log("  ✗ skipping feature with null HEITI"); skippedCount++; continue; }
    const { lat, lon } = polygonCentroid(feature.geometry.coordinates);

    const existing = await db.select({ id: playgrounds.id }).from(playgrounds).where(eq(playgrounds.title, title)).limit(1);
    if (existing[0]) { skippedCount++; continue; }

    const [pg] = await db
      .insert(playgrounds)
      .values({ title, latitude: lat, longitude: lon, municipality: "Reykjavík", isSchoolGround: false, status: "pending", createdById: adminUser.id, submitAnonymously: false })
      .returning({ id: playgrounds.id });

    if (!pg) continue;

    const eqIds = equipmentByKey.get(`Leiksvæði||${normalizeAddress(title)}`) ?? [];
    for (const equipmentId of eqIds) {
      await db.insert(playgroundEquipment).values({ playgroundId: pg.id, equipmentId }).onConflictDoNothing();
    }

    insertedCount++;
    const eqNote = eqIds.length === 0 ? " ⚠ no equipment matched" : ` (${eqIds.length} equipment)`;
    console.log(`  + ${title}${eqNote}`);
  }

  // ── Import school grounds (Nominatim geocoding) ───────────────────────────
  const schoolRecords = ckanRecords.filter((r) => r.tegund === "Grunnskóli" || r.tegund === "Leikskóli");
  const uniqueSchools = Array.from(new Map(schoolRecords.map((r) => [r.heiti, r])).values());

  if (testMode) { console.log("\nTest mode — skipping school grounds."); await conn.end(); return; }

  console.log(`\nImporting ${uniqueSchools.length} school grounds (geocoding — ~${Math.ceil(uniqueSchools.length * 1.1)}s)...`);

  for (const school of uniqueSchools) {
    const existing = await db.select({ id: playgrounds.id }).from(playgrounds).where(eq(playgrounds.title, school.heiti)).limit(1);
    if (existing[0]) { skippedCount++; continue; }

    await sleep(1100);
    const coords = await geocode(school.heiti);

    if (!coords) {
      console.log(`  ✗ ${school.heiti} — geocoding failed`);
      skippedCount++;
      continue;
    }

    const schoolType = school.tegund === "Leikskóli" ? "preschool" : "elementary";

    const [pg] = await db
      .insert(playgrounds)
      .values({ title: school.heiti, latitude: coords.lat, longitude: coords.lon, municipality: "Reykjavík", isSchoolGround: true, schoolType, status: "pending", createdById: adminUser.id, submitAnonymously: false })
      .returning({ id: playgrounds.id });

    if (!pg) continue;

    const eqIds = equipmentByKey.get(`${school.tegund}||${normalizeAddress(school.heiti)}`) ?? [];
    for (const equipmentId of eqIds) {
      await db.insert(playgroundEquipment).values({ playgroundId: pg.id, equipmentId }).onConflictDoNothing();
    }

    insertedCount++;
    console.log(`  + ${school.heiti} [${schoolType}] (${eqIds.length} equipment)`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(65)}`);
  console.log(`Done. ${insertedCount} inserted, ${skippedCount} skipped. Review at /admin.\n`);

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
