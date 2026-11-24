CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" varchar(96) PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "failure_count" integer DEFAULT 0 NOT NULL,
  "last_status_code" integer,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");
--> statement-breakpoint
CREATE POLICY "push_subscriptions_select_policy" ON "push_subscriptions" AS PERMISSIVE FOR SELECT TO public USING (true);
--> statement-breakpoint
CREATE POLICY "push_subscriptions_insert_policy" ON "push_subscriptions" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "push_subscriptions_update_policy" ON "push_subscriptions" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "push_subscriptions_delete_policy" ON "push_subscriptions" AS PERMISSIVE FOR DELETE TO public USING (true);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" varchar(96) PRIMARY KEY NOT NULL,
  "notification_id" varchar(96) NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "recipient_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "channel" varchar(32) DEFAULT 'web_push' NOT NULL,
  "dedupe_key" varchar(160) NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "next_attempt_at" timestamp DEFAULT now() NOT NULL,
  "sent_at" timestamp,
  "last_status_code" integer,
  "last_error" text,
  "payload" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_dedupe_key_unique" ON "notification_deliveries" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_deliveries_pending_idx" ON "notification_deliveries" USING btree ("status", "next_attempt_at");
--> statement-breakpoint
CREATE POLICY "notification_deliveries_select_policy" ON "notification_deliveries" AS PERMISSIVE FOR SELECT TO public USING (true);
--> statement-breakpoint
CREATE POLICY "notification_deliveries_insert_policy" ON "notification_deliveries" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "notification_deliveries_update_policy" ON "notification_deliveries" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "notification_deliveries_delete_policy" ON "notification_deliveries" AS PERMISSIVE FOR DELETE TO public USING (true);
