CREATE TABLE IF NOT EXISTS "review_files" (
	"id" varchar(96) PRIMARY KEY NOT NULL,
	"dossier_id" varchar(96) NOT NULL,
	"name" varchar(500) NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"file_type" varchar(32) NOT NULL,
	"current_version" varchar(32) DEFAULT 'v1.0' NOT NULL,
	"description" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_files_dossier_idx" ON "review_files" USING btree ("dossier_id");
--> statement-breakpoint
ALTER TABLE "review_files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_file_versions" (
	"id" varchar(96) PRIMARY KEY NOT NULL,
	"file_id" varchar(96) NOT NULL REFERENCES "review_files"("id") ON DELETE CASCADE,
	"dossier_id" varchar(96) NOT NULL,
	"version_number" varchar(32) NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_type" varchar(32) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"storage_provider" varchar(32) DEFAULT 'r2' NOT NULL,
	"r2_object_key" text,
	"checksum_sha256" varchar(128) NOT NULL,
	"author_id" text REFERENCES "user"(id) ON DELETE SET NULL,
	"author_name" varchar(255) NOT NULL,
	"summary" text,
	"extracted_text" text,
	"grid_data" jsonb,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_file_versions_dossier_idx" ON "review_file_versions" USING btree ("dossier_id", "file_id");
--> statement-breakpoint
ALTER TABLE "review_file_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pole" TEXT;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "grade" TEXT;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user' AND policyname = 'user_select_policy') THEN
		CREATE POLICY "user_select_policy" ON "user" AS PERMISSIVE FOR SELECT TO public USING (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user' AND policyname = 'user_insert_policy') THEN
		CREATE POLICY "user_insert_policy" ON "user" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user' AND policyname = 'user_update_policy') THEN
		CREATE POLICY "user_update_policy" ON "user" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user' AND policyname = 'user_delete_policy') THEN
		CREATE POLICY "user_delete_policy" ON "user" AS PERMISSIVE FOR DELETE TO public USING (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session' AND policyname = 'session_all_policy') THEN
		CREATE POLICY "session_all_policy" ON "session" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'account' AND policyname = 'account_all_policy') THEN
		CREATE POLICY "account_all_policy" ON "account" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'verification' AND policyname = 'verification_all_policy') THEN
		CREATE POLICY "verification_all_policy" ON "verification" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'review_files' AND policyname = 'review_files_all_policy') THEN
		CREATE POLICY "review_files_all_policy" ON "review_files" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'review_file_versions' AND policyname = 'review_file_versions_all_policy') THEN
		CREATE POLICY "review_file_versions_all_policy" ON "review_file_versions" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
	END IF;
END
$$;
--> statement-breakpoint
DO $$
DECLARE
	fk RECORD;
BEGIN
	IF to_regclass('public.users') IS NOT NULL AND to_regclass('public."user"') IS NOT NULL THEN
		INSERT INTO "user" (id, name, email, image, role, department, status, created_at, updated_at)
		SELECT
			u.id,
			u.name,
			u.email,
			u.avatar_url,
			CASE WHEN u.role::text IN ('admin', 'manager', 'member', 'guest')
				THEN u.role::text::"public"."user_role"
				ELSE 'member'::"public"."user_role"
			END,
			u.department,
			u.status,
			COALESCE(u.created_at, NOW()),
			COALESCE(u.updated_at, NOW())
		FROM "users" u
		ON CONFLICT DO NOTHING;

		FOR fk IN
			SELECT c.conname, c.conrelid::regclass::text AS table_name
			FROM pg_constraint c
			WHERE c.contype = 'f'
				AND c.confrelid = to_regclass('public.users')
				AND c.connamespace = 'public'::regnamespace
		LOOP
			EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', fk.table_name, fk.conname);
		END LOOP;
	END IF;

	IF to_regclass('public.tasks') IS NOT NULL THEN
		UPDATE "tasks" SET "creator_id" = NULL
		WHERE "creator_id" IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = "tasks"."creator_id");
		UPDATE "tasks" SET "assignee_id" = NULL
		WHERE "assignee_id" IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = "tasks"."assignee_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.tasks')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'creator_id'
				)
		) THEN
			ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_user_id_fk"
				FOREIGN KEY ("creator_id") REFERENCES "user"(id) ON DELETE SET NULL;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.tasks')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'assignee_id'
				)
		) THEN
			ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_user_id_fk"
				FOREIGN KEY ("assignee_id") REFERENCES "user"(id) ON DELETE SET NULL;
		END IF;
	END IF;

	IF to_regclass('public.activity_logs') IS NOT NULL THEN
		UPDATE "activity_logs" SET "user_id" = NULL
		WHERE "user_id" IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = "activity_logs"."user_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.activity_logs')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'user_id'
				)
		) THEN
			ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_user_id_fk"
				FOREIGN KEY ("user_id") REFERENCES "user"(id) ON DELETE SET NULL;
		END IF;
	END IF;

	IF to_regclass('public.workspaces') IS NOT NULL THEN
		UPDATE "workspaces" SET "owner_id" = NULL
		WHERE "owner_id" IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = "workspaces"."owner_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.workspaces')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'owner_id'
				)
		) THEN
			ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_user_id_fk"
				FOREIGN KEY ("owner_id") REFERENCES "user"(id) ON DELETE SET NULL;
		END IF;
	END IF;

	IF to_regclass('public.workspace_members') IS NOT NULL THEN
		IF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'user_id'
		) THEN
			DELETE FROM "workspace_members" wm
			WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = wm."user_id");

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint c
				WHERE c.conrelid = to_regclass('public.workspace_members')
					AND c.contype = 'f'
					AND EXISTS (
						SELECT 1 FROM pg_attribute a
						WHERE a.attrelid = c.conrelid
							AND a.attnum = ANY(c.conkey)
							AND a.attname = 'user_id'
					)
			) THEN
				ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_user_id_fk"
					FOREIGN KEY ("user_id") REFERENCES "user"(id) ON DELETE CASCADE;
			END IF;
		ELSIF EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'userId'
		) THEN
			DELETE FROM "workspace_members" wm
			WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = wm."userId");

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint c
				WHERE c.conrelid = to_regclass('public.workspace_members')
					AND c.contype = 'f'
					AND EXISTS (
						SELECT 1 FROM pg_attribute a
						WHERE a.attrelid = c.conrelid
							AND a.attnum = ANY(c.conkey)
							AND a.attname = 'userId'
					)
			) THEN
				ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userid_user_id_fk"
					FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
			END IF;
		END IF;
	END IF;

	IF to_regclass('public.notifications') IS NOT NULL THEN
		DELETE FROM "notifications" n
		WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = n."recipient_id");
		UPDATE "notifications" SET "actor_id" = NULL
		WHERE "actor_id" IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = "notifications"."actor_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.notifications')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'recipient_id'
				)
		) THEN
			ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk"
				FOREIGN KEY ("recipient_id") REFERENCES "user"(id) ON DELETE CASCADE;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.notifications')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'actor_id'
				)
		) THEN
			ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk"
				FOREIGN KEY ("actor_id") REFERENCES "user"(id) ON DELETE SET NULL;
		END IF;
	END IF;

	IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
		DELETE FROM "push_subscriptions" ps
		WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = ps."user_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.push_subscriptions')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'user_id'
				)
		) THEN
			ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk"
				FOREIGN KEY ("user_id") REFERENCES "user"(id) ON DELETE CASCADE;
		END IF;
	END IF;

	IF to_regclass('public.notification_deliveries') IS NOT NULL THEN
		DELETE FROM "notification_deliveries" nd
		WHERE NOT EXISTS (SELECT 1 FROM "notifications" n WHERE n.id = nd."notification_id")
			OR NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = nd."recipient_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.notification_deliveries')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'notification_id'
				)
		) THEN
			ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk"
				FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.notification_deliveries')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'recipient_id'
				)
		) THEN
			ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_id_user_id_fk"
				FOREIGN KEY ("recipient_id") REFERENCES "user"(id) ON DELETE CASCADE;
		END IF;
	END IF;

	IF to_regclass('public.review_file_versions') IS NOT NULL AND to_regclass('public.review_files') IS NOT NULL THEN
		DELETE FROM "review_file_versions" v
		WHERE NOT EXISTS (SELECT 1 FROM "review_files" f WHERE f.id = v."file_id");
		UPDATE "review_file_versions" SET "author_id" = NULL
		WHERE "author_id" IS NOT NULL
			AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = "review_file_versions"."author_id");

		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.review_file_versions')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'file_id'
				)
		) THEN
			ALTER TABLE "review_file_versions" ADD CONSTRAINT "review_file_versions_file_id_review_files_id_fk"
				FOREIGN KEY ("file_id") REFERENCES "review_files"("id") ON DELETE CASCADE;
		END IF;
		IF NOT EXISTS (
			SELECT 1 FROM pg_constraint c
			WHERE c.conrelid = to_regclass('public.review_file_versions')
				AND c.contype = 'f'
				AND EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = c.conrelid
						AND a.attnum = ANY(c.conkey)
						AND a.attname = 'author_id'
				)
		) THEN
			ALTER TABLE "review_file_versions" ADD CONSTRAINT "review_file_versions_author_id_user_id_fk"
				FOREIGN KEY ("author_id") REFERENCES "user"(id) ON DELETE SET NULL;
		END IF;
	END IF;
END
$$;
