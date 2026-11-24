import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskNotification } from '@/types/task';
import { enqueueWebPushDeliveries, processPendingWebPushDeliveries } from '@/lib/web-push/delivery';

const sendMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<{
      statusCode: number | null;
      expired: boolean;
      retryAt: number | null;
      error: string | null;
    }> => ({ statusCode: 201, expired: false, retryAt: null, error: null })
  )
);

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/web-push/config', () => ({
  isWebPushConfigured: () => true,
}));

vi.mock('@/lib/web-push/sender', () => ({
  sendWebPush: sendMock,
}));

vi.mock('@/lib/db/pg', () => ({
  getDrizzleDb: () => dbMock,
  isDatabaseConfigured: () => true,
  ensureDatabaseTables: async () => ({ success: true }),
}));

const dialect = new PgDialect();

const notification = {
  id: 'n1',
  taskId: 't1',
  taskTitle: 'Dossier à revérifier',
  dueDate: '2026-11-24',
  triggerTime: '2026-11-24T10:00:00.000Z',
  read: false,
  type: 'assigned',
  targetUserId: 'user-1',
  actionByName: 'Julien',
  message: 'Corrections demandées',
} satisfies TaskNotification;

function mockPendingRows(rows: unknown[]) {
  const captured: { joinCondition?: SQL; whereCondition?: SQL } = {};
  dbMock.select.mockImplementation(() => ({
    from: () => ({
      innerJoin: (_table: unknown, joinCondition: SQL) => {
        captured.joinCondition = joinCondition;
        return {
          where: (whereCondition: SQL) => {
            captured.whereCondition = whereCondition;
            return {
              orderBy: () => ({ limit: async () => rows }),
            };
          },
        };
      },
    }),
  }));
  return captured;
}

function mockUpdate() {
  const setValues: Record<string, unknown>[] = [];
  dbMock.update.mockImplementation(() => ({
    set: (values: Record<string, unknown>) => {
      setValues.push(values);
      return { where: async () => undefined };
    },
  }));
  return setValues;
}

describe('web push delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues one delivery per subscription for the notification recipient', async () => {
    let selectCondition: SQL | undefined;
    dbMock.select.mockImplementation(() => ({
      from: () => ({
        where: (condition: SQL) => {
          selectCondition = condition;
          return {
            limit: async () => [
              { id: 's1', userId: 'user-1' },
              { id: 's2', userId: 'user-1' },
            ],
          };
        },
      }),
    }));

    const onConflictDoNothing = vi.fn(async () => undefined);
    const insertValues = vi.fn((_values: unknown) => ({ onConflictDoNothing }));
    dbMock.insert.mockReturnValue({ values: insertValues });

    const ids = await enqueueWebPushDeliveries(notification);

    expect(ids).toHaveLength(2);
    expect(selectCondition).toBeDefined();
    if (!selectCondition) throw new Error('Missing subscription select condition');
    expect(dialect.sqlToQuery(selectCondition).params).toContain('user-1');
    expect(insertValues).toHaveBeenCalledTimes(2);
    expect(insertValues.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        notificationId: 'n1',
        recipientId: 'user-1',
        dedupeKey: 'n1:s1',
        status: 'pending',
        payload: expect.objectContaining({
          title: 'Planit — nouvelle notification',
          url: '/?notificationId=n1',
        }),
      })
    );
  });

  it('joins pending deliveries only to the subscription encoded in their dedupe key', async () => {
    const captured = mockPendingRows([]);
    await processPendingWebPushDeliveries({ recipientId: 'user-1', limit: 1 });

    expect(captured.joinCondition).toBeDefined();
    if (!captured.joinCondition) throw new Error('Missing subscription join condition');
    const joinQuery = dialect.sqlToQuery(captured.joinCondition);
    expect(joinQuery.sql).toContain('dedupe_key');
    expect(joinQuery.sql).toContain('split_part');

    expect(captured.whereCondition).toBeDefined();
    if (!captured.whereCondition) throw new Error('Missing pending delivery condition');
    const whereQuery = dialect.sqlToQuery(captured.whereCondition);
    expect(whereQuery.sql).toContain('recipient_id');
    expect(whereQuery.params).toContain('user-1');
  });

  it('deletes an expired subscription and marks its delivery expired', async () => {
    mockPendingRows([
      {
        delivery: {
          id: 'd1',
          dedupeKey: 'n1:s1',
          attempts: 0,
          maxAttempts: 5,
          payload: {
            title: 'Planit — nouvelle notification',
            body: 'Corrections demandées',
            url: '/?notificationId=n1',
            tag: 'planit-n1',
            notificationId: 'n1',
          },
        },
        subscription: { id: 's1', endpoint: 'https://push.test/a', p256dh: 'p', auth: 'a' },
      },
    ]);
    const setValues = mockUpdate();
    const deleteWhere = vi.fn(async (_condition: SQL) => undefined);
    dbMock.delete.mockReturnValue({ where: deleteWhere });
    sendMock.mockResolvedValueOnce({ statusCode: 410, expired: true, retryAt: null, error: 'Gone' });

    const result = await processPendingWebPushDeliveries({ limit: 1 });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(setValues[0]).toEqual(
      expect.objectContaining({ status: 'expired', attempts: 1, lastStatusCode: 410 })
    );
    expect(result).toEqual({ sent: 0, failed: 0, expired: 1, retried: 0 });
  });

  it('marks a successful send as sent', async () => {
    mockPendingRows([
      {
        delivery: {
          id: 'd2',
          dedupeKey: 'n1:s2',
          attempts: 0,
          maxAttempts: 5,
          payload: {
            title: 'Planit — nouvelle notification',
            body: 'Corrections demandées',
            url: '/?notificationId=n1',
            tag: 'planit-n1',
            notificationId: 'n1',
          },
        },
        subscription: { id: 's2', endpoint: 'https://push.test/b', p256dh: 'p2', auth: 'a2' },
      },
    ]);
    const setValues = mockUpdate();

    const result = await processPendingWebPushDeliveries({ limit: 1 });

    expect(setValues[0]).toEqual(expect.objectContaining({ status: 'sent', attempts: 1 }));
    expect(result).toEqual({ sent: 1, failed: 0, expired: 0, retried: 0 });
  });

  it('schedules a retry on a server error', async () => {
    mockPendingRows([
      {
        delivery: {
          id: 'd3',
          dedupeKey: 'n1:s3',
          attempts: 0,
          maxAttempts: 5,
          payload: {
            title: 'Planit — nouvelle notification',
            body: 'Corrections demandées',
            url: '/?notificationId=n1',
            tag: 'planit-n1',
            notificationId: 'n1',
          },
        },
        subscription: { id: 's3', endpoint: 'https://push.test/c', p256dh: 'p3', auth: 'a3' },
      },
    ]);
    const setValues = mockUpdate();
    sendMock.mockResolvedValueOnce({ statusCode: 503, expired: false, retryAt: null, error: 'Down' });

    const result = await processPendingWebPushDeliveries({ limit: 1 });

    expect(setValues[0]).toEqual(
      expect.objectContaining({ status: 'pending', attempts: 1, lastStatusCode: 503 })
    );
    expect(result).toEqual({ sent: 0, failed: 0, expired: 0, retried: 1 });
  });
});
