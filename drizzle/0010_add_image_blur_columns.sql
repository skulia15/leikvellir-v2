-- Blur placeholder columns for progressive image loading.
--
-- Purely additive: both columns are nullable with defaults, so existing rows
-- and any currently deployed code that does not know about them keep working.
-- Written by hand rather than generated because drizzle/meta is malformed
-- (0008 snapshot missing, 0009 unreadable), which blocks `drizzle-kit generate`.

ALTER TABLE "leikvellir_v2_playground"
  ADD COLUMN IF NOT EXISTS "cover_image_blur" varchar(2048);

ALTER TABLE "leikvellir_v2_playground"
  ADD COLUMN IF NOT EXISTS "image_blur_data" json DEFAULT '{}'::json;
