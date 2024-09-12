CREATE TABLE IF NOT EXISTS "leikvellir_v2_playground" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"publicly_accessible" boolean DEFAULT true NOT NULL,
	"toddler_friendly" boolean DEFAULT false NOT NULL,
	"cover_image" varchar(512),
	"images" json DEFAULT '[]'::json,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
DROP INDEX IF EXISTS "name_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground" ADD CONSTRAINT "leikvellir_v2_playground_created_by_leikvellir_v2_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."leikvellir_v2_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_title_idx" ON "leikvellir_v2_playground" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_title_idx" ON "leikvellir_v2_post" USING btree ("name");