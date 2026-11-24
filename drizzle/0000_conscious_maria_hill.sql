CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"task_id" varchar(64),
	"user_id" varchar(64),
	"user_name" varchar(255) NOT NULL,
	"action" varchar(64) NOT NULL,
	"details" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"color" varchar(32) NOT NULL,
	"bg_light" varchar(32) NOT NULL,
	"icon_name" varchar(64) NOT NULL,
	"workspace_id" varchar(64),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"due_date" varchar(32) NOT NULL,
	"due_time" varchar(16),
	"priority" varchar(32) DEFAULT 'medium' NOT NULL,
	"status" varchar(32) DEFAULT 'todo' NOT NULL,
	"category" varchar(64) DEFAULT 'work' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"workspace_id" varchar(64),
	"creator_id" varchar(64),
	"assignee_id" varchar(64),
	"reminder_minutes_before" integer DEFAULT 15 NOT NULL,
	"reminder_triggered" boolean DEFAULT false,
	"reminder_dismissed" boolean DEFAULT false,
	"reminder_triggered_at" timestamp,
	"recurrence" varchar(32) DEFAULT 'none' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"role" varchar(32) DEFAULT 'member' NOT NULL,
	"department" varchar(128),
	"status" varchar(32) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(64) NOT NULL,
	"userId" varchar(64) NOT NULL,
	"role" varchar(32) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"owner_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.activity_logs')
			AND conname = 'activity_logs_task_id_tasks_id_fk'
	) THEN
		ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.activity_logs')
			AND conname = 'activity_logs_user_id_users_id_fk'
	) THEN
		ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.categories')
			AND conname = 'categories_workspace_id_workspaces_id_fk'
	) THEN
		ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.tasks')
			AND conname = 'tasks_workspace_id_workspaces_id_fk'
	) THEN
		ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.tasks')
			AND conname = 'tasks_creator_id_users_id_fk'
	) THEN
		ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.tasks')
			AND conname = 'tasks_assignee_id_users_id_fk'
	) THEN
		ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.workspace_members')
			AND conname = 'workspace_members_workspace_id_workspaces_id_fk'
	) THEN
		ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.workspace_members')
			AND conname = 'workspace_members_userId_users_id_fk'
	) THEN
		ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE connamespace = 'public'::regnamespace
			AND conrelid = to_regclass('public.workspaces')
			AND conname = 'workspaces_owner_id_users_id_fk'
	) THEN
		ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END
$$;
