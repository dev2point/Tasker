import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { GET as getPublicKey } from '@/app/api/push/public-key/route';
import { POST as postSubscribe } from '@/app/api/push/subscribe/route';
import { DELETE as deleteSubscribe } from '@/app/api/push/unsubscribe/route';
import { getAuthenticatedUser } from '@/lib/auth-server';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
}));

const configMock = vi.hoisted(() => ({
  getWebPushConfig: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/db/pg', () => ({
  getDrizzleDb: () => dbMock,
  isDatabaseConfigured: () => true,
  ensureDatabaseTables: async () => ({ success: true, message: 'ok' }),
}));

vi.mock('@/lib/web-push/config', () => ({
  getWebPushConfig: () => configMock.getWebPushConfig(),
}));

const dialect = new PgDialect();

function request(url: string, method: 'POST' | 'DELETE', body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('web push routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      name: 'Test',
      email: 'test@io.io',
      role: 'member',
    });
    configMock.getWebPushConfig.mockReturnValue({
      publicKey: 'public-only',
      privateKey: 'private-secret',
      subject: 'mailto:admin@example.com',
    });
  });

  it('exposes only the public key', async () => {
    const res = await getPublicKey();
    const body: unknown = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ enabled: true, publicKey: 'public-only' });
    expect(JSON.stringify(body)).not.toContain('private-secret');
  });

  it('reports disabled when VAPID is not configured', async () => {
    configMock.getWebPushConfig.mockReturnValue(null);

    const res = await getPublicKey();
    const body: unknown = await res.json();

    expect(body).toEqual({ enabled: false });
  });

  it('stores a subscription for the authenticated user', async () => {
    const selectWhere = vi.fn((_where: SQL) => ({
      limit: vi.fn(async () => []),
    }));
    dbMock.select.mockReturnValue({ from: () => ({ where: selectWhere }) });

    const onConflictDoUpdate = vi.fn(async () => undefined);
    const insertValues = vi.fn(() => ({ onConflictDoUpdate }));
    dbMock.insert.mockReturnValue({ values: insertValues });

    const res = await postSubscribe(
      request('http://localhost:3000/api/push/subscribe', 'POST', {
        endpoint: 'https://push.example.test/send/abc',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      })
    );

    expect(res.status).toBe(200);
    const selectQuery = dialect.sqlToQuery(selectWhere.mock.calls[0][0]);
    expect(selectQuery.params).toContain('https://push.example.test/send/abc');
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        endpoint: 'https://push.example.test/send/abc',
        p256dh: 'p256dh-value',
        auth: 'auth-value',
      })
    );
    expect(onConflictDoUpdate).toHaveBeenCalled();
  });

  it('refuses an invalid subscription body', async () => {
    const res = await postSubscribe(
      request('http://localhost:3000/api/push/subscribe', 'POST', { endpoint: 'http://push.test/a' })
    );

    expect(res.status).toBe(400);
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it('scopes unsubscribe to both endpoint and authenticated user', async () => {
    const deleteWhere = vi.fn(async (_where: SQL) => undefined);
    dbMock.delete.mockReturnValue({ where: deleteWhere });

    const res = await deleteSubscribe(
      request('http://localhost:3000/api/push/unsubscribe', 'DELETE', {
        endpoint: 'https://push.test/other',
      })
    );

    expect(res.status).toBe(200);
    expect(deleteWhere).toHaveBeenCalled();
    const deleteQuery = dialect.sqlToQuery(deleteWhere.mock.calls[0][0]);
    expect(deleteQuery.sql).toContain('"endpoint"');
    expect(deleteQuery.sql).toContain('"user_id"');
    expect(deleteQuery.params).toEqual(
      expect.arrayContaining(['https://push.test/other', 'user-1'])
    );
  });

  it('refuses an invalid unsubscribe endpoint', async () => {
    const res = await deleteSubscribe(
      request('http://localhost:3000/api/push/unsubscribe', 'DELETE', { endpoint: '' })
    );

    expect(res.status).toBe(400);
    expect(dbMock.delete).not.toHaveBeenCalled();
  });
});
