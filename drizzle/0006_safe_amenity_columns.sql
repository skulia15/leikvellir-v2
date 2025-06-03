-- Safe migration: Add amenity columns to playground table
-- This migration skips any post table references since that table was manually removed

ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "has_seating" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "has_picnic_table" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "has_fencing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "has_garbage_can" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "has_bathroom_nearby" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "has_soft_play_area" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_has_seating_idx" ON "leikvellir_v2_playground" ("has_seating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_has_picnic_table_idx" ON "leikvellir_v2_playground" ("has_picnic_table");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_has_fencing_idx" ON "leikvellir_v2_playground" ("has_fencing");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_has_garbage_can_idx" ON "leikvellir_v2_playground" ("has_garbage_can");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_has_bathroom_nearby_idx" ON "leikvellir_v2_playground" ("has_bathroom_nearby");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_has_soft_play_area_idx" ON "leikvellir_v2_playground" ("has_soft_play_area");
