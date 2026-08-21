/**
 * One-off backfill of blur placeholders for playgrounds uploaded before the
 * `cover_image_blur` / `image_blur_data` columns existed.
 *
 * Run after the columns exist (`pnpm db:push`):
 *   pnpm tsx scripts/backfill-image-blur.ts
 *   pnpm tsx scripts/backfill-image-blur.ts --dry-run
 *
 * Safe to re-run: rows that already have a cover placeholder are skipped, and
 * already-generated entries are reused rather than re-downloaded. Images whose
 * placeholder cannot be generated are left null and simply load as they do now.
 */
// Next loads .env on its own; a bare tsx script does not. Must come before the
// db import, which validates the environment on load.
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "../src/server/db";
import { playgrounds } from "../src/server/db/schema";
import { buildPlaygroundBlurData } from "../src/lib/image-blur";

/** Blob downloads plus JPEG encodes — a few at a time is plenty. */
const CONCURRENCY = 4;

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const rows = await db.query.playgrounds.findMany({
    columns: {
      id: true,
      title: true,
      coverImage: true,
      images: true,
      coverImageBlur: true,
      imageBlurData: true,
    },
  });

  const pending = rows.filter((row) => {
    const hasPhotos = Boolean(row.coverImage) || (row.images?.length ?? 0) > 0;
    if (!hasPhotos) return false;

    const coverDone = !row.coverImage || Boolean(row.coverImageBlur);
    const galleryDone = (row.images ?? []).every(
      (url) => row.imageBlurData?.[url],
    );
    return !coverDone || !galleryDone;
  });

  console.log(
    `${rows.length} playgrounds, ${pending.length} need placeholders${dryRun ? " (dry run)" : ""}`,
  );

  let done = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (row) => {
        const { coverImageBlur, imageBlurData } = await buildPlaygroundBlurData(
          row.coverImage,
          row.images ?? [],
          row.imageBlurData ?? {},
        );

        const generated = Object.keys(imageBlurData).length;
        if (generated === 0) {
          failed++;
          console.warn(
            `  ✗ #${row.id} ${row.title} — no placeholders generated`,
          );
          return;
        }

        if (!dryRun) {
          await db
            .update(playgrounds)
            .set({ coverImageBlur, imageBlurData })
            .where(eq(playgrounds.id, row.id));
        }

        done++;
        console.log(
          `  ✓ #${row.id} ${row.title} — ${generated} placeholder(s)`,
        );
      }),
    );
  }

  console.log(`\nDone: ${done} updated, ${failed} without placeholders.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
