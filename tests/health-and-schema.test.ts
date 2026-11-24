import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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

  it('uses drizzle-kit migrate as the only npm migration command', () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));

    expect(manifest.scripts['db:migrate']).toBe('drizzle-kit migrate');
    expect(manifest.scripts['db:push']).toBeUndefined();
  });

  it('runs drizzle-kit migrate in CI without alternate migration paths', () => {
    const workflow = readFileSync(
      resolve(process.cwd(), '.github/workflows/drizzle-migrations.yml'),
      'utf8',
    );

    expect(workflow).toContain('npm run db:migrate');
    expect(workflow).not.toContain('drizzle-kit push');
    expect(workflow).not.toContain('scripts/migrate.mjs');
  });

  it('does not ship homegrown migration scripts', () => {
    expect(existsSync(resolve(process.cwd(), 'scripts/migrate.mjs'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'scripts/migrate.ts'))).toBe(false);
  });

  it('ships a Drizzle migration chain that provisions the core schema', () => {
    const migrationDir = resolve(process.cwd(), 'drizzle');
    const journal = JSON.parse(readFileSync(resolve(migrationDir, 'meta/_journal.json'), 'utf8'));
    const sql = journal.entries
      .map((entry: { tag: string }) => readFileSync(resolve(migrationDir, `${entry.tag}.sql`), 'utf8'))
      .join('\n');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "notifications"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "review_files"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "review_file_versions"');
    expect(sql).toContain('"pole" TEXT');
    expect(sql).toContain('"grade" TEXT');
  });

  it('targets unified "user"(id) for foreign keys and migrates legacy users FKs', () => {
    const pgInit = readFileSync(resolve(process.cwd(), 'lib/db/pg.ts'), 'utf8');
    const migrationDir = resolve(process.cwd(), 'drizzle');
    const journal = JSON.parse(readFileSync(resolve(migrationDir, 'meta/_journal.json'), 'utf8'));
    const migrations = journal.entries
      .map((entry: { tag: string }) => readFileSync(resolve(migrationDir, `${entry.tag}.sql`), 'utf8'))
      .join('\n');

    for (const source of [pgInit, migrations]) {
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

