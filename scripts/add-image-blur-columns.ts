/**
 * Apply drizzle/0010_add_image_blur_columns.sql.
 *
 *   pnpm db:add-blur-columns
 *
 * Deliberately not `drizzle-kit push`: push diffs the entire schema against the
 * database and will happily propose destructive changes wherever the two have
 * drifted. This runs only the two additive ADD COLUMN statements, so the blast
 * radius is exactly those columns.
 *
 * Both statements are IF NOT EXISTS, so re-running is a no-op.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import { env } from "../src/env";

async function main() {
  const sqlPath = path.join(process.cwd(), "drizzle/0010_add_image_blur_columns.sql");
  const migration = await readFile(sqlPath, "utf8");

  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    await sql.unsafe(migration);
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leikvellir_v2_playground'
        AND column_name IN ('cover_image_blur', 'image_blur_data')
      ORDER BY column_name
    `;

    console.log("Columns now present:");
    for (const column of columns) {
      console.log(
        `  ${String(column.column_name)} — ${String(column.data_type)}, nullable=${String(column.is_nullable)}`,
      );
    }

    if (columns.length !== 2) {
      console.error("Expected 2 columns; the migration did not fully apply.");
      process.exitCode = 1;
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Failed to add columns:", error);
  process.exit(1);
});
