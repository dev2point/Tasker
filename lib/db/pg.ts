import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/src/db/schema';

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let tablesInitialized = false;
let tablesEnsuredPromise: Promise<{ success: boolean; message: string }> | null = null;

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
  if (tablesInitialized) {
    return { success: true, message: 'PostgreSQL schema already initialized.' };
  }
  if (tablesEnsuredPromise) {
    return tablesEnsuredPromise;
  }

  tablesEnsuredPromise = (async () => {
    const sql = getPostgresClient();
    if (!sql) {
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

    // 1. Users
    await sql.unsafe(`
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
    `);

    // 2. Workspaces
    await sql`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. Workspace Members
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        assignee_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
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
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 7. Better Auth Tables: "user", "session", "account", "verification"
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
        status VARCHAR(32) DEFAULT 'active'
      );

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
      END
      $$;
    `);

      tablesInitialized = true;
      return {
        success: true,
        message: 'PostgreSQL schema verified and initialized successfully with RLS policies.',
      };
    } catch (error) {
      tablesEnsuredPromise = null;
      console.warn('Error creating PostgreSQL tables:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  })();

  return tablesEnsuredPromise;
}
