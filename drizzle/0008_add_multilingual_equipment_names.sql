-- Migration to convert equipment names from varchar to json for multilingual support
-- This migration preserves existing data by converting string names to Icelandic-only multilingual objects

-- Step 1: Add a temporary column with the new type
ALTER TABLE "leikvellir_v2_equipment" ADD COLUMN "name_temp" json;

-- Step 2: Convert existing names to multilingual format (Icelandic only)
UPDATE "leikvellir_v2_equipment" 
SET "name_temp" = json_build_object('is', "name", 'en', null, 'pl', null);

-- Step 3: Drop the old column
ALTER TABLE "leikvellir_v2_equipment" DROP COLUMN "name";

-- Step 4: Rename the temporary column to the original name
ALTER TABLE "leikvellir_v2_equipment" RENAME COLUMN "name_temp" TO "name";

-- Step 5: Add NOT NULL constraint to the new name column
ALTER TABLE "leikvellir_v2_equipment" ALTER COLUMN "name" SET NOT NULL;