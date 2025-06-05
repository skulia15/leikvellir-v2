DO $$ BEGIN
 CREATE TYPE "public"."school_type" AS ENUM('preschool', 'elementary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN "is_school_ground" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN "school_type" "school_type";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_is_school_ground_idx" ON "leikvellir_v2_playground" USING btree ("is_school_ground");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_school_type_idx" ON "leikvellir_v2_playground" USING btree ("school_type");