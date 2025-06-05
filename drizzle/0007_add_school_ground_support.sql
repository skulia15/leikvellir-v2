-- Add school type enum
CREATE TYPE "leikvellir_v2_school_type" AS ENUM ('preschool', 'elementary');

-- Add school ground columns to playground table
ALTER TABLE "leikvellir_v2_playground" 
ADD COLUMN "is_school_ground" boolean NOT NULL DEFAULT false,
ADD COLUMN "school_type" "leikvellir_v2_school_type";

-- Add index for school ground filtering
CREATE INDEX "playground_is_school_ground_idx" ON "leikvellir_v2_playground" ("is_school_ground");
CREATE INDEX "playground_school_type_idx" ON "leikvellir_v2_playground" ("school_type");