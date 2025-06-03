DO $$ BEGIN
 CREATE TYPE "public"."equipment_category" AS ENUM('core_equipment', 'climbing_and_movement', 'imaginative_and_themed', 'spinning_and_motion', 'fitness_and_obstacle', 'toddler_friendly', 'additional_common_equipment');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'super_admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leikvellir_v2_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"category" "equipment_category" NOT NULL,
	"image" varchar(512),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leikvellir_v2_playground_equipment" (
	"playground_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "leikvellir_v2_playground_equipment_playground_id_equipment_id_pk" PRIMARY KEY("playground_id","equipment_id")
);
--> statement-breakpoint
ALTER TABLE "leikvellir_v2_playground" ADD COLUMN "municipality" varchar(256);--> statement-breakpoint
ALTER TABLE "leikvellir_v2_user" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_user" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_user" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leikvellir_v2_user" ADD COLUMN "banned_by" varchar(255);--> statement-breakpoint
ALTER TABLE "leikvellir_v2_user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_equipment" ADD CONSTRAINT "leikvellir_v2_playground_equipment_playground_id_leikvellir_v2_playground_id_fk" FOREIGN KEY ("playground_id") REFERENCES "public"."leikvellir_v2_playground"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leikvellir_v2_playground_equipment" ADD CONSTRAINT "leikvellir_v2_playground_equipment_equipment_id_leikvellir_v2_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."leikvellir_v2_equipment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "equipment_name_idx" ON "leikvellir_v2_equipment" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "equipment_category_idx" ON "leikvellir_v2_equipment" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "equipment_is_active_idx" ON "leikvellir_v2_equipment" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_equipment_playground_idx" ON "leikvellir_v2_playground_equipment" USING btree ("playground_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_equipment_equipment_idx" ON "leikvellir_v2_playground_equipment" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_municipality_idx" ON "leikvellir_v2_playground" USING btree ("municipality");