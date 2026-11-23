import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/src/db/schema';

const globalForPg = globalThis as unknown as {
  __pgClient?: postgres.Sql | null;
  __pgTablesInitialized?: boolean;
  __pgTablesEnsuredPromise?: Promise<{ success: boolean; message: string }> | null;
};

let client: postgres.Sql | null = globalForPg.__pgClient ?? null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  url = url.trim();
  if (url.startsWith('DATABASE_URL=')) {
    url = url.substring('DATABASE_URL='.length).trim();
  }
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.substring(1, url.length - 1).trim();
  }
  return url;
}

export function isDatabaseConfigured(): boolean {
  const url = getDatabaseUrl();
  return Boolean(
    url &&
      (url.startsWith('postgres://') || url.startsWith('postgresql://')) &&
      !url.includes('[PASSWORD]')
  );
}

export function getPostgresClient(): postgres.Sql | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!client) {
    const url = getDatabaseUrl()!;
    const isRemote =
      url.includes('supabase') ||
      url.includes('pooler') ||
      url.includes('sslmode=require') ||
      url.includes('.com') ||
      url.includes('.net');

    // Use standard pooling and ssl settings for Supabase / PostgreSQL
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Essential for Supabase pooler / PgBouncer transaction mode
      ssl: isRemote ? 'require' : undefined,
    });
    globalForPg.__pgClient = client;
  }

  return client;
}

export function getDrizzleDb() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!dbInstance) {
    const sql = getPostgresClient();
    if (!sql) return null;
    dbInstance = drizzle(sql, { schema });
  }

  return dbInstance;
}

/**
 * Initializes tables in PostgreSQL if they don't exist yet.
 * Safe to call on first connection; memoized to run at most once per process.
 */
export async function ensureDatabaseTables(): Promise<{ success: boolean; message: string }> {
  if (globalForPg.__pgTablesInitialized) {
    return { success: true, message: 'PostgreSQL schema already initialized.' };
  }
  if (globalForPg.__pgTablesEnsuredPromise) {
    return globalForPg.__pgTablesEnsuredPromise;
  }

  globalForPg.__pgTablesEnsuredPromise = (async () => {
    const sql = getPostgresClient();
    if (!sql) {
      globalForPg.__pgTablesEnsuredPromise = null;
      return {
        success: false,
        message: 'DATABASE_URL is not configured.',
      };
    }

    try {
    // 0. Define PostgreSQL Enum Type for Roles
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member', 'guest');
        END IF;
      END$$;
    `);

    // 1. Unified Better Auth & Application User Table
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        image TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        role user_role NOT NULL DEFAULT 'member',
        department VARCHAR(128),
        pole TEXT,
        grade TEXT,
        status VARCHAR(32) DEFAULT 'active'
      );

      -- Legacy users compatibility table
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role user_role NOT NULL DEFAULT 'member',
        department VARCHAR(128),
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Safe migration: synchronize any legacy users records into the unified "user" table
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          INSERT INTO "user" (id, name, email, image, role, department, status, created_at, updated_at)
          SELECT id, name, email, avatar_url,
            CASE WHEN role IN ('admin', 'manager', 'member', 'guest') THEN role::user_role ELSE 'member'::user_role END,
            department, status, COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
          FROM users
          ON CONFLICT DO NOTHING;
        END IF;
      END$$;
    `);

    // 2. Workspaces
    await sql`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id VARCHAR(64) REFERENCES "user"(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. Workspace Members
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        role user_role NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Categories
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        color VARCHAR(64) NOT NULL,
        bg_light TEXT NOT NULL,
        icon_name VARCHAR(64) NOT NULL,
        workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE CASCADE,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 5. Tasks
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        due_date VARCHAR(32) NOT NULL,
        due_time VARCHAR(16),
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        status VARCHAR(32) NOT NULL DEFAULT 'todo',
        category VARCHAR(64) NOT NULL DEFAULT 'work',
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP WITH TIME ZONE,
        workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE CASCADE,
        creator_id VARCHAR(64) REFERENCES "user"(id) ON DELETE SET NULL,
        assignee_id VARCHAR(64) REFERENCES "user"(id) ON DELETE SET NULL,
        reminder_minutes_before INTEGER DEFAULT 15,
        reminder_triggered BOOLEAN DEFAULT false,
        reminder_dismissed BOOLEAN DEFAULT false,
        reminder_triggered_at TIMESTAMP WITH TIME ZONE,
        recurrence VARCHAR(32) DEFAULT 'none',
        tags JSONB DEFAULT '[]'::jsonb,
        subtasks JSONB DEFAULT '[]'::jsonb,
        color VARCHAR(32),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 6. Activity Logs
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        task_id VARCHAR(64) REFERENCES tasks(id) ON DELETE CASCADE,
        user_id VARCHAR(64) REFERENCES "user"(id) ON DELETE SET NULL,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 6b. Persistent User Notifications
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(96) PRIMARY KEY,
        recipient_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        actor_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        actor_name VARCHAR(255),
        task_id VARCHAR(64) NOT NULL,
        task_title VARCHAR(500) NOT NULL,
        due_date VARCHAR(32) NOT NULL,
        due_time VARCHAR(16),
        type VARCHAR(32) NOT NULL,
        message TEXT,
        read BOOLEAN NOT NULL DEFAULT false,
        trigger_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications (recipient_id, trigger_time DESC);

      CREATE TABLE IF NOT EXISTS review_files (
        id VARCHAR(96) PRIMARY KEY,
        dossier_id VARCHAR(96) NOT NULL,
        name VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(32) NOT NULL,
        current_version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
        description TEXT,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS review_files_dossier_idx ON review_files (dossier_id);

      CREATE TABLE IF NOT EXISTS review_file_versions (
        id VARCHAR(96) PRIMARY KEY,
        file_id VARCHAR(96) NOT NULL REFERENCES review_files(id) ON DELETE CASCADE,
        dossier_id VARCHAR(96) NOT NULL,
        version_number VARCHAR(32) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_type VARCHAR(32) NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        storage_provider VARCHAR(32) NOT NULL DEFAULT 'r2',
        r2_object_key TEXT,
        checksum_sha256 VARCHAR(128) NOT NULL,
        author_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        author_name VARCHAR(255) NOT NULL,
        summary TEXT,
        extracted_text TEXT,
        grid_data JSONB,
        is_current BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS review_file_versions_dossier_idx ON review_file_versions (dossier_id, file_id);
      ALTER TABLE review_files ENABLE ROW LEVEL SECURITY;
      ALTER TABLE review_file_versions ENABLE ROW LEVEL SECURITY;
    `);

    // 7. Better Auth Tables: "session", "account", "verification"
    await sql.unsafe(`

      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMP WITH TIME ZONE,
        refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
        scope TEXT,
        password TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
      ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user' AND policyname = 'user_all_policy') THEN
          CREATE POLICY user_all_policy ON "user" FOR ALL TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session' AND policyname = 'session_all_policy') THEN
          CREATE POLICY session_all_policy ON "session" FOR ALL TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account' AND policyname = 'account_all_policy') THEN
          CREATE POLICY account_all_policy ON "account" FOR ALL TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verification' AND policyname = 'verification_all_policy') THEN
          CREATE POLICY verification_all_policy ON "verification" FOR ALL TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_policy') THEN
          CREATE POLICY users_select_policy ON users FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_insert_policy') THEN
          CREATE POLICY users_insert_policy ON users FOR INSERT TO public WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_policy') THEN
          CREATE POLICY users_update_policy ON users FOR UPDATE TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_delete_policy') THEN
          CREATE POLICY users_delete_policy ON users FOR DELETE TO public USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_select_policy') THEN
          CREATE POLICY workspaces_select_policy ON workspaces FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_insert_policy') THEN
          CREATE POLICY workspaces_insert_policy ON workspaces FOR INSERT TO public WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_update_policy') THEN
          CREATE POLICY workspaces_update_policy ON workspaces FOR UPDATE TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_delete_policy') THEN
          CREATE POLICY workspaces_delete_policy ON workspaces FOR DELETE TO public USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_select_policy') THEN
          CREATE POLICY tasks_select_policy ON tasks FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_insert_policy') THEN
          CREATE POLICY tasks_insert_policy ON tasks FOR INSERT TO public WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_update_policy') THEN
          CREATE POLICY tasks_update_policy ON tasks FOR UPDATE TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_delete_policy') THEN
          CREATE POLICY tasks_delete_policy ON tasks FOR DELETE TO public USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_select_policy') THEN
          CREATE POLICY categories_select_policy ON categories FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_insert_policy') THEN
          CREATE POLICY categories_insert_policy ON categories FOR INSERT TO public WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_update_policy') THEN
          CREATE POLICY categories_update_policy ON categories FOR UPDATE TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_delete_policy') THEN
          CREATE POLICY categories_delete_policy ON categories FOR DELETE TO public USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_select_policy') THEN
          CREATE POLICY workspace_members_select_policy ON workspace_members FOR SELECT TO public USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_select_policy') THEN
          CREATE POLICY activity_logs_select_policy ON activity_logs FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_insert_policy') THEN
          CREATE POLICY activity_logs_insert_policy ON activity_logs FOR INSERT TO public WITH CHECK (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_all_policy') THEN
          CREATE POLICY notifications_all_policy ON notifications FOR ALL TO public USING (true) WITH CHECK (true);
        END IF;

        -- Safe automatic column migration to user_role ENUM
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role' AND udt_name != 'user_role'
        ) THEN
          ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
          ALTER TABLE users ALTER COLUMN role TYPE user_role USING (
            CASE 
              WHEN role IN ('admin', 'manager', 'member', 'guest') THEN role::user_role 
              ELSE 'member'::user_role 
            END
          );
          ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'::user_role;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user' AND column_name = 'role' AND udt_name != 'user_role'
        ) THEN
          ALTER TABLE "user" ALTER COLUMN role DROP DEFAULT;
          ALTER TABLE "user" ALTER COLUMN role TYPE user_role USING (
            CASE 
              WHEN role IN ('admin', 'manager', 'member', 'guest') THEN role::user_role 
              ELSE 'member'::user_role 
            END
          );
          ALTER TABLE "user" ALTER COLUMN role SET DEFAULT 'member'::user_role;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'workspace_members' AND column_name = 'role' AND udt_name != 'user_role'
        ) THEN
          ALTER TABLE workspace_members ALTER COLUMN role DROP DEFAULT;
          ALTER TABLE workspace_members ALTER COLUMN role TYPE user_role USING (
            CASE 
              WHEN role IN ('admin', 'manager', 'member', 'guest') THEN role::user_role 
              ELSE 'member'::user_role 
            END
          );
          ALTER TABLE workspace_members ALTER COLUMN role SET DEFAULT 'member'::user_role;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'categories' AND column_name = 'bg_light'
        ) THEN
          ALTER TABLE categories ALTER COLUMN bg_light TYPE TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user' AND column_name = 'pole'
        ) THEN
          ALTER TABLE "user" ADD COLUMN pole TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user' AND column_name = 'grade'
        ) THEN
          ALTER TABLE "user" ADD COLUMN grade TEXT;
        END IF;

        -- Migrate legacy foreign keys pointing to "users" so they point to unified "user" table
        IF to_regclass('public.users') IS NOT NULL AND to_regclass('public."user"') IS NOT NULL THEN
          DECLARE
            fk RECORD;
          BEGIN
            FOR fk IN
              SELECT
                c.conname,
                c.conrelid::regclass::text AS table_name
              FROM pg_constraint c
              WHERE c.contype = 'f'
                AND c.confrelid = to_regclass('public.users')
                AND c.connamespace = 'public'::regnamespace
            LOOP
              EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', fk.table_name, fk.conname);
            END LOOP;
          END;

          IF to_regclass('public.tasks') IS NOT NULL THEN
            UPDATE tasks SET creator_id = NULL
            WHERE creator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = tasks.creator_id);

            UPDATE tasks SET assignee_id = NULL
            WHERE assignee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = tasks.assignee_id);

            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint c
              WHERE c.conrelid = to_regclass('public.tasks')
                AND c.contype = 'f'
                AND (
                  lower(c.conname) = 'tasks_creator_id_user_id_fk'
                  OR (
                    c.confrelid = to_regclass('public."user"')
                    AND EXISTS (
                      SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'creator_id'
                    )
                  )
                )
            ) THEN
              ALTER TABLE tasks ADD CONSTRAINT tasks_creator_id_user_id_fk
                FOREIGN KEY (creator_id) REFERENCES "user"(id) ON DELETE SET NULL;
            END IF;

            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint c
              WHERE c.conrelid = to_regclass('public.tasks')
                AND c.contype = 'f'
                AND (
                  lower(c.conname) = 'tasks_assignee_id_user_id_fk'
                  OR (
                    c.confrelid = to_regclass('public."user"')
                    AND EXISTS (
                      SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'assignee_id'
                    )
                  )
                )
            ) THEN
              ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_id_user_id_fk
                FOREIGN KEY (assignee_id) REFERENCES "user"(id) ON DELETE SET NULL;
            END IF;
          END IF;

          IF to_regclass('public.activity_logs') IS NOT NULL THEN
            UPDATE activity_logs SET user_id = NULL
            WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = activity_logs.user_id);

            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint c
              WHERE c.conrelid = to_regclass('public.activity_logs')
                AND c.contype = 'f'
                AND (
                  lower(c.conname) = 'activity_logs_user_id_user_id_fk'
                  OR c.confrelid = to_regclass('public."user"')
                )
            ) THEN
              ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_user_id_fk
                FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL;
            END IF;
          END IF;

          IF to_regclass('public.workspaces') IS NOT NULL THEN
            DELETE FROM workspaces
            WHERE owner_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = workspaces.owner_id);

            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint c
              WHERE c.conrelid = to_regclass('public.workspaces')
                AND c.contype = 'f'
                AND (
                  lower(c.conname) = 'workspaces_owner_id_user_id_fk'
                  OR c.confrelid = to_regclass('public."user"')
                )
            ) THEN
              ALTER TABLE workspaces ADD CONSTRAINT workspaces_owner_id_user_id_fk
                FOREIGN KEY (owner_id) REFERENCES "user"(id) ON DELETE CASCADE;
            END IF;
          END IF;

          IF to_regclass('public.workspace_members') IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'user_id') THEN
              DELETE FROM workspace_members wm
              WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = wm.user_id);

              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint c
                WHERE c.conrelid = to_regclass('public.workspace_members')
                  AND c.contype = 'f'
                  AND (
                    lower(c.conname) IN ('workspace_members_user_id_user_id_fk', 'workspace_members_userid_user_id_fk')
                    OR c.confrelid = to_regclass('public."user"')
                  )
              ) THEN
                ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_user_id_user_id_fk
                  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
              END IF;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_members' AND column_name = 'userId') THEN
              DELETE FROM workspace_members wm
              WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = wm."userId");

              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint c
                WHERE c.conrelid = to_regclass('public.workspace_members')
                  AND c.contype = 'f'
                  AND (
                    lower(c.conname) IN ('workspace_members_userid_user_id_fk', 'workspace_members_user_id_user_id_fk')
                    OR c.confrelid = to_regclass('public."user"')
                  )
              ) THEN
                ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_userid_user_id_fk
                  FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
              END IF;
            END IF;
          END IF;
        END IF;
      END
      $$;
    `);

      globalForPg.__pgTablesInitialized = true;
      return {
        success: true,
        message: 'PostgreSQL schema verified and initialized successfully with RLS policies.',
      };
    } catch (error) {
      globalForPg.__pgTablesEnsuredPromise = null;
      console.warn('Error creating PostgreSQL tables:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  })();

  return globalForPg.__pgTablesEnsuredPromise;
}
