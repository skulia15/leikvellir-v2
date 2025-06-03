DO $$ BEGIN
 CREATE TYPE "public"."playground_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "status" "playground_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "reviewed_by" varchar(255);--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground" ADD CONSTRAINT "leikvellir_v2_playground_reviewed_by_leikvellir_v2_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."leikvellir_v2_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_status_idx" ON "leikvellir_v2_playground" USING btree ("status");