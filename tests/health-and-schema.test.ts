import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as schema from '@/src/db/schema';
import { GET as getHealth } from '@/app/api/health/route';

describe('Health & Database Schema Architecture', () => {
  it('unifies the user and users table references in Drizzle schema', () => {
    // Both user and users should point to the exact same table definition
    expect(schema.user).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.user).toBe(schema.users);
  });

  it('contains cabinet-specific fields in the unified user table', () => {
    // Check that core domain columns exist in the unified user table
    expect(schema.user.id).toBeDefined();
    expect(schema.user.email).toBeDefined();
    expect(schema.user.name).toBeDefined();
    expect(schema.user.role).toBeDefined();
    expect(schema.user.department).toBeDefined();
    expect(schema.user.pole).toBeDefined();
    expect(schema.user.grade).toBeDefined();
    expect(schema.user.status).toBeDefined();
  });

  it('defines relations connecting tasks, workspaces, and the unified user table', () => {
    expect(schema.tasksRelations).toBeDefined();
    expect(schema.usersRelations).toBeDefined();
  });

  it('targets unified "user"(id) for foreign keys and migrates legacy users FKs', () => {
    const pgInit = readFileSync(resolve(process.cwd(), 'lib/db/pg.ts'), 'utf8');
    const migrateScript = readFileSync(resolve(process.cwd(), 'scripts/migrate.mjs'), 'utf8');

    for (const source of [pgInit, migrateScript]) {
      expect(source).toContain('REFERENCES "user"(id)');
      expect(source).not.toContain('REFERENCES users(id)');
      expect(source).not.toContain('workspace_members_userId_user_id_fk');
      expect(source).toContain("to_regclass('public.users')");
      expect(source).toContain('tasks_creator_id_user_id_fk');
      expect(source).toContain('tasks_assignee_id_user_id_fk');
    }
  });

  it('responds with system diagnostics from /api/health route', async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);

    const text = await res.text();
    const data = JSON.parse(text);
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database');
    expect(data.services).toHaveProperty('auth');
    expect(data.services).toHaveProperty('ai');
    expect(data.services).toHaveProperty('storage');
    expect(Array.isArray(data.services.storage.missingConfigKeys)).toBe(true);
    expect(data.services.auth.engine).toContain('Better Auth');
    expect(data.services.database.driver).toContain('PostgreSQL');
  });
});

