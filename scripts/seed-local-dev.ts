/**
 * Seed a LOCAL development database with just enough to exercise check-ins
 * and the leaderboards by hand.
 *
 * Creates:
 *   - two users, one already on the leaderboard so the boards are not empty
 *   - four approved playgrounds at real Icelandic coordinates
 *   - a NextAuth *database session* for the first user, so you can sign in by
 *     setting one cookie instead of completing an OAuth round trip
 *   - a handful of check-ins for the second user
 *
 * Usage:
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/leikvellir \
 *     mise x -- npx tsx scripts/seed-local-dev.ts
 *
 * It refuses to run against anything that is not localhost. Do not remove that
 * guard: this script deletes and rewrites its own fixture rows.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import {
  checkIns,
  playgrounds,
  sessions,
  users,
} from "../src/server/db/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Safety guard — this script writes fixture data and must never touch a
// hosted database. The project's .env points at Neon, so an accidental run
// without an explicit override would otherwise hit production.
// ---------------------------------------------------------------------------
const host = new URL(DATABASE_URL).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(
    `Refusing to seed: DATABASE_URL points at "${host}", not localhost.\n` +
      `Pass an explicit local URL, e.g.\n` +
      `  DATABASE_URL=postgres://postgres:postgres@localhost:5432/leikvellir npx tsx scripts/seed-local-dev.ts`,
  );
  process.exit(1);
}

const DEV_USER_ID = "dev-user-1";
const DEV_RIVAL_ID = "dev-user-2";
const SESSION_TOKEN = "dev-session-token-leikvellir";

/** Real coordinates, so DevTools location overrides feel like the real thing. */
const FIXTURE_PLAYGROUNDS = [
  {
    key: "vidistadatun",
    title: "Víðistaðatún (dev)",
    latitude: 64.0722,
    longitude: -21.964,
    municipality: "Hafnarfjörður",
    isSchoolGround: false,
    schoolType: null,
  },
  {
    key: "klambratun",
    title: "Klambratún (dev)",
    latitude: 64.14,
    longitude: -21.911,
    municipality: "Reykjavík",
    isSchoolGround: false,
    schoolType: null,
  },
  {
    key: "laugardalur",
    title: "Laugardalur skólalóð (dev)",
    latitude: 64.143,
    longitude: -21.879,
    municipality: "Reykjavík",
    isSchoolGround: true,
    schoolType: "elementary" as const,
  },
  {
    // Far from the others on purpose: hop here from Reykjavík within a few
    // minutes and the teleport check should flag it.
    key: "akureyri",
    title: "Akureyri (dev, for teleport testing)",
    latitude: 65.6835,
    longitude: -18.1262,
    municipality: "Akureyri",
    isSchoolGround: false,
    schoolType: null,
  },
];

async function main() {
  const client = postgres(DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema: { checkIns, playgrounds, sessions, users } });

  console.log(`Seeding ${host}…`);

  // Users -------------------------------------------------------------------
  await db
    .insert(users)
    .values([
      {
        id: DEV_USER_ID,
        name: "Dev User",
        email: "dev@localhost",
        role: "super_admin",
        // Left off the board deliberately so the opt-in flow is testable.
        leaderboardOptIn: false,
      },
      {
        id: DEV_RIVAL_ID,
        name: "Rival User",
        email: "rival@localhost",
        role: "user",
        leaderboardOptIn: true,
        leaderboardName: "Fjallageit",
        leaderboardNameNormalized: "fjallageit",
      },
    ])
    .onConflictDoNothing();

  // Session — lets you sign in with a cookie instead of OAuth ---------------
  await db.delete(sessions).where(eq(sessions.userId, DEV_USER_ID));
  await db.insert(sessions).values({
    sessionToken: SESSION_TOKEN,
    userId: DEV_USER_ID,
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  // Playgrounds -------------------------------------------------------------
  const existing = await db
    .select({ id: playgrounds.id, title: playgrounds.title })
    .from(playgrounds);
  const existingTitles = new Set(existing.map((p) => p.title));

  const toInsert = FIXTURE_PLAYGROUNDS.filter((p) => !existingTitles.has(p.title));
  if (toInsert.length > 0) {
    await db.insert(playgrounds).values(
      toInsert.map((p) => ({
        title: p.title,
        latitude: p.latitude,
        longitude: p.longitude,
        municipality: p.municipality,
        isSchoolGround: p.isSchoolGround,
        schoolType: p.schoolType,
        publiclyAccessible: true,
        toddlerFriendly: true,
        status: "approved" as const,
        createdById: DEV_USER_ID,
        images: [],
      })),
    );
  }

  const seeded = await db
    .select({ id: playgrounds.id, title: playgrounds.title })
    .from(playgrounds)
    .where(
      inArray(
        playgrounds.title,
        FIXTURE_PLAYGROUNDS.map((p) => p.title),
      ),
    );

  // Rival check-ins, so the leaderboards have something on them -------------
  const rivalTargets = seeded.slice(0, 3);
  await db.delete(checkIns).where(eq(checkIns.userId, DEV_RIVAL_ID));
  if (rivalTargets.length > 0) {
    await db.insert(checkIns).values(
      rivalTargets.map((p, i) => ({
        userId: DEV_RIVAL_ID,
        playgroundId: p.id,
        // Distinct days, so all three count despite the per-day cooldown.
        checkInDate: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
        distanceMeters: 20 + i,
        accuracyMeters: 15,
        isFlagged: false,
      })),
    );
  }

  console.log("\nPlaygrounds (use these coordinates in DevTools → Sensors):");
  for (const p of seeded) {
    const fixture = FIXTURE_PLAYGROUNDS.find((f) => f.title === p.title)!;
    console.log(`  #${p.id}  ${p.title}`);
    console.log(`        ${fixture.latitude}, ${fixture.longitude}`);
  }

  console.log("\nTo sign in without OAuth, add this cookie on http://localhost:3000");
  console.log("  Name:  next-auth.session-token");
  console.log(`  Value: ${SESSION_TOKEN}`);
  console.log("\nDone.");

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
