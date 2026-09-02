import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/src/db/schema';

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function isDatabaseConfigured(): boolean {
  const url = getDatabaseUrl();
  return Boolean(url && url.startsWith('postgres') && !url.includes('[PASSWORD]'));
}

export function getPostgresClient(): postgres.Sql | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!client) {
    const url = getDatabaseUrl()!;
    // Use standard pooling and ssl settings for Supabase
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: url.includes('supabase.co') || url.includes('sslmode=require') ? 'require' : undefined,
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
 * Safe to call on first connection.
 */
export async function ensureDatabaseTables(): Promise<{ success: boolean; message: string }> {
  const sql = getPostgresClient();
  if (!sql) {
    return {
      success: false,
      message: 'DATABASE_URL is not configured.',
    };
  }

  try {
    // 1. Users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        role VARCHAR(32) NOT NULL DEFAULT 'member',
        department VARCHAR(128),
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

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
    await sql`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id VARCHAR(64) PRIMARY KEY,
        workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(32) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 4. Categories
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        color VARCHAR(32) NOT NULL,
        bg_light VARCHAR(32) NOT NULL,
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

    return {
      success: true,
      message: 'PostgreSQL schema verified and initialized successfully.',
    };
  } catch (error) {
    console.error('Error creating PostgreSQL tables:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}
