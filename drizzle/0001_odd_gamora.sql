ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "activity_logs_select_policy" ON "activity_logs" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "activity_logs_insert_policy" ON "activity_logs" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "activity_logs_update_policy" ON "activity_logs" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "activity_logs_delete_policy" ON "activity_logs" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "categories_select_policy" ON "categories" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "categories_insert_policy" ON "categories" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "categories_update_policy" ON "categories" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "categories_delete_policy" ON "categories" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "tasks_select_policy" ON "tasks" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "tasks_insert_policy" ON "tasks" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "tasks_update_policy" ON "tasks" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "tasks_delete_policy" ON "tasks" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "users_select_policy" ON "users" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "users_insert_policy" ON "users" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_update_policy" ON "users" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_delete_policy" ON "users" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "workspace_members_select_policy" ON "workspace_members" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "workspace_members_insert_policy" ON "workspace_members" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspace_members_update_policy" ON "workspace_members" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspace_members_delete_policy" ON "workspace_members" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "workspaces_select_policy" ON "workspaces" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "workspaces_insert_policy" ON "workspaces" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspaces_update_policy" ON "workspaces" AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "workspaces_delete_policy" ON "workspaces" AS PERMISSIVE FOR DELETE TO public USING (true);