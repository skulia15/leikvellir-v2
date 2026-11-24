-- Add missing foreign-key, lookup, and composite indexes.
-- Note on leikvellir_v2_user.email:
--   A non-unique btree index is created here so the migration never fails if
--   duplicate emails already exist in production. Before promoting this to a
--   UNIQUE index, verify no duplicates exist:
--     SELECT lower(email), count(*) FROM "leikvellir_v2_user"
--     GROUP BY lower(email) HAVING count(*) > 1;

CREATE INDEX IF NOT EXISTS "playground_created_by_idx" ON "leikvellir_v2_playground" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_reviewed_by_idx" ON "leikvellir_v2_playground" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_status_created_at_idx" ON "leikvellir_v2_playground" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_reviewed_by_idx" ON "leikvellir_v2_playground_edit_suggestion" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playground_edit_suggestion_status_created_at_idx" ON "leikvellir_v2_playground_edit_suggestion" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "leikvellir_v2_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "leikvellir_v2_user" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_is_banned_idx" ON "leikvellir_v2_user" USING btree ("is_banned");
