import postgres from 'postgres';

async function runSafeMigration() {
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERREUR: La variable d'environnement DATABASE_URL est manquante.");
    process.exit(1);
  }

  databaseUrl = databaseUrl.trim();
  if (databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.substring('DATABASE_URL='.length).trim();
  }
  if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) || (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
    databaseUrl = databaseUrl.substring(1, databaseUrl.length - 1).trim();
  }

  let sanitizedUrl = 'inconnue';
  try {
    const parsed = new URL(databaseUrl.replace(/^postgresql:\/\//, 'http://'));
    sanitizedUrl = `${parsed.hostname}:${parsed.port || 5432}/${parsed.pathname.replace(/^\//, '')}`;
  } catch {
    sanitizedUrl = 'masqué';
  }

  console.log(`\n🚀 Initialisation de la synchronisation de schéma PostgreSQL sur : ${sanitizedUrl}`);

  const isRemote = databaseUrl.includes('supabase') || databaseUrl.includes('pooler') || databaseUrl.includes('sslmode=require');
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: isRemote ? 'require' : undefined,
    connect_timeout: 15,
  });

  try {
    console.log('📦 1/4 - Création ou vérification du type ENUM user_role...');
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member', 'guest');
        END IF;
      END$$;
    `);

    console.log('📋 2/4 - Création idempotente des tables relationnelles & Better Auth...');
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

      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        "userId" VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role user_role NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        color VARCHAR(32) NOT NULL,
        bg_light VARCHAR(32) NOT NULL,
        icon_name VARCHAR(64) NOT NULL,
        workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE CASCADE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        due_date VARCHAR(32) NOT NULL,
        due_time VARCHAR(16),
        priority VARCHAR(32) NOT NULL DEFAULT 'medium',
        status VARCHAR(32) NOT NULL DEFAULT 'todo',
        category VARCHAR(64) NOT NULL DEFAULT 'work',
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE CASCADE,
        creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        assignee_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        reminder_minutes_before INTEGER NOT NULL DEFAULT 15,
        reminder_triggered BOOLEAN DEFAULT FALSE,
        reminder_dismissed BOOLEAN DEFAULT FALSE,
        reminder_triggered_at TIMESTAMP WITH TIME ZONE,
        recurrence VARCHAR(32) NOT NULL DEFAULT 'none',
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        subtasks JSONB NOT NULL DEFAULT '[]'::jsonb,
        color VARCHAR(32),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        task_id VARCHAR(64) REFERENCES tasks(id) ON DELETE CASCADE,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        role user_role NOT NULL DEFAULT 'member',
        department VARCHAR(128),
        status VARCHAR(32) DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS account (
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

      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('🛡️ 3/4 - Activation du Row Level Security (RLS) & Politiques...');
    await sql.unsafe(`
      DO $$
      BEGIN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
        ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

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

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_select_policy') THEN
          CREATE POLICY workspace_members_select_policy ON workspace_members FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_insert_policy') THEN
          CREATE POLICY workspace_members_insert_policy ON workspace_members FOR INSERT TO public WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_update_policy') THEN
          CREATE POLICY workspace_members_update_policy ON workspace_members FOR UPDATE TO public USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_delete_policy') THEN
          CREATE POLICY workspace_members_delete_policy ON workspace_members FOR DELETE TO public USING (true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_select_policy') THEN
          CREATE POLICY activity_logs_select_policy ON activity_logs FOR SELECT TO public USING (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_insert_policy') THEN
          CREATE POLICY activity_logs_insert_policy ON activity_logs FOR INSERT TO public WITH CHECK (true);
        END IF;
      END
      $$;
    `);

    console.log('🔄 4/4 - Migration des types de colonnes existantes vers user_role ENUM...');
    await sql.unsafe(`
      DO $$
      BEGIN
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
      END$$;
    `);

    console.log('✅ Base de données PostgreSQL & Supabase synchronisée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation de la base de données :', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSafeMigration();
