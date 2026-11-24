DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = 'public' AND t.typname = 'user_role'
	) THEN
		CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'member', 'guest');
	END IF;
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" "public"."user_role" DEFAULT 'member' NOT NULL,
	"department" text,
	"pole" TEXT,
	"grade" TEXT,
	"status" text DEFAULT 'active',
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pole" TEXT;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "grade" TEXT;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'users'
			AND column_name = 'role' AND udt_name <> 'user_role'
	) THEN
		ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
		ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."user_role" USING (
			CASE WHEN "role"::text IN ('admin', 'manager', 'member', 'guest')
				THEN "role"::text::"public"."user_role"
				ELSE 'member'::"public"."user_role"
			END
		);
		ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."user_role";
	END IF;
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name = 'workspace_members'
			AND column_name = 'role' AND udt_name <> 'user_role'
	) THEN
		ALTER TABLE "workspace_members" ALTER COLUMN "role" DROP DEFAULT;
		ALTER TABLE "workspace_members" ALTER COLUMN "role" TYPE "public"."user_role" USING (
			CASE WHEN "role"::text IN ('admin', 'manager', 'member', 'guest')
				THEN "role"::text::"public"."user_role"
				ELSE 'member'::"public"."user_role"
			END
		);
		ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."user_role";
	END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.account')
			AND conname = 'account_user_id_user_id_fk'
	) THEN
		ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.session')
			AND conname = 'session_user_id_user_id_fk'
	) THEN
		ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END
$$;
