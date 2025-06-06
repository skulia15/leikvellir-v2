DO $$ BEGIN
 CREATE TYPE "public"."edit_suggestion_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leikvellir_v2_playground_edit_suggestion_equipment" (
	"suggestion_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "leikvellir_v2_playground_edit_suggestion_equipment_suggestion_id_equipment_id_pk" PRIMARY KEY("suggestion_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leikvellir_v2_playground_edit_suggestion" (
	"id" serial PRIMARY KEY NOT NULL,
	"playground_id" integer NOT NULL,
	"status" "edit_suggestion_status" DEFAULT 'pending' NOT NULL,
	"title" varchar(256),
	"latitude" double precision,
	"longitude" double precision,
	"municipality" varchar(256),
	"publicly_accessible" boolean,
	"toddler_friendly" boolean,
	"is_school_ground" boolean,
	"school_type" "school_type",
	"has_seating" boolean,
	"has_picnic_table" boolean,
	"has_fencing" boolean,
	"has_garbage_can" boolean,
	"has_bathroom_nearby" boolean,
	"has_soft_play_area" boolean,
	"cover_image" varchar(512),
	"images" json,
	"equipment_ids" json,
	"submit_anonymously" boolean,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_edit_suggestion_equipment" ADD CONSTRAINT "leikvellir_v2_playground_edit_suggestion_equipment_suggestion_id_leikvellir_v2_playground_edit_suggestion_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."leikvellir_v2_playground_edit_suggestion"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_edit_suggestion_equipment" ADD CONSTRAINT "leikvellir_v2_playground_edit_suggestion_equipment_equipment_id_leikvellir_v2_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."leikvellir_v2_equipment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_edit_suggestion" ADD CONSTRAINT "leikvellir_v2_playground_edit_suggestion_playground_id_leikvellir_v2_playground_id_fk" FOREIGN KEY ("playground_id") REFERENCES "public"."leikvellir_v2_playground"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_edit_suggestion" ADD CONSTRAINT "leikvellir_v2_playground_edit_suggestion_reviewed_by_leikvellir_v2_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."leikvellir_v2_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_edit_suggestion" ADD CONSTRAINT "leikvellir_v2_playground_edit_suggestion_created_by_leikvellir_v2_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."leikvellir_v2_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_equipment_suggestion_idx" ON "leikvellir_v2_playground_edit_suggestion_equipment" USING btree ("suggestion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_equipment_equipment_idx" ON "leikvellir_v2_playground_edit_suggestion_equipment" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_playground_id_idx" ON "leikvellir_v2_playground_edit_suggestion" USING btree ("playground_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_status_idx" ON "leikvellir_v2_playground_edit_suggestion" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_created_by_idx" ON "leikvellir_v2_playground_edit_suggestion" USING btree ("created_by");