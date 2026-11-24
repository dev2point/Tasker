import { randomUUID } from 'node:crypto';
import { and, asc, eq, lte, sql, type SQL } from 'drizzle-orm';
import { ensureDatabaseTables, getDrizzleDb, isDatabaseConfigured } from '@/lib/db/pg';
import { isWebPushConfigured } from '@/lib/web-push/config';
import { buildWebPushPayload, type WebPushPayload } from '@/lib/web-push/payload';
import { sendWebPush } from '@/lib/web-push/sender';
import { notificationDeliveries, pushSubscriptions } from '@/src/db/schema';
import type { TaskNotification } from '@/types/task';

export interface DeliverySummary {
  sent: number;
  failed: number;
  expired: number;
  retried: number;
}

export interface DeliveryOptions {
  recipientId?: string;
  limit?: number;
}

function retryDelay(attempts: number, override: number | null): number {
  if (override !== null) return override;
  return Math.min(2 ** Math.max(0, attempts) * 60_000, 24 * 60 * 60 * 1000);
}

function subscriptionFromDedupeKey(): SQL {
  return sql`split_part(${notificationDeliveries.dedupeKey}, ':', 2) = ${pushSubscriptions.id}`;
}

export async function enqueueWebPushDeliveries(
  notification: TaskNotification
): Promise<string[]> {
  if (!isWebPushConfigured() || !notification.targetUserId) return [];

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) return [];
  const setup = await ensureDatabaseTables();
  if (!setup.success) return [];

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, notification.targetUserId))
    .limit(50);

  const payload: WebPushPayload = buildWebPushPayload(notification);
  const ids: string[] = [];

  for (const subscription of subscriptions) {
    const id = `push-del-${randomUUID()}`;
    await db
      .insert(notificationDeliveries)
      .values({
        id,
        notificationId: notification.id,
        recipientId: notification.targetUserId,
        channel: 'web_push',
        dedupeKey: `${notification.id}:${subscription.id}`.slice(0, 160),
        status: 'pending',
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
        sentAt: null,
        lastStatusCode: null,
        lastError: null,
        payload,
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    ids.push(id);
  }

  return ids;
}

export async function processPendingWebPushDeliveries(
  options: DeliveryOptions = {}
): Promise<DeliverySummary> {
  const summary: DeliverySummary = { sent: 0, failed: 0, expired: 0, retried: 0 };
  if (!isWebPushConfigured()) return summary;

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) return summary;
  const setup = await ensureDatabaseTables();
  if (!setup.success) return summary;

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const conditions: SQL[] = [
    eq(notificationDeliveries.status, 'pending'),
    lte(notificationDeliveries.nextAttemptAt, new Date()),
  ];
  if (options.recipientId) {
    conditions.push(eq(notificationDeliveries.recipientId, options.recipientId));
  }

  const pending = await db
    .select({ delivery: notificationDeliveries, subscription: pushSubscriptions })
    .from(notificationDeliveries)
    .innerJoin(
      pushSubscriptions,
      and(
        eq(notificationDeliveries.recipientId, pushSubscriptions.userId),
        subscriptionFromDedupeKey()
      )
    )
    .where(and(...conditions))
    .orderBy(asc(notificationDeliveries.createdAt))
    .limit(limit);

  for (const row of pending) {
    const attempts = row.delivery.attempts + 1;
    const result = await sendWebPush(row.subscription, row.delivery.payload);

    if (result.expired) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, row.subscription.id));
      await db
        .update(notificationDeliveries)
        .set({
          status: 'expired',
          attempts,
          lastStatusCode: result.statusCode,
          lastError: result.error,
          updatedAt: new Date(),
        })
        .where(eq(notificationDeliveries.id, row.delivery.id));
      summary.expired += 1;
      continue;
    }

    const shouldRetry =
      result.retryAt !== null || (result.statusCode !== null && result.statusCode >= 500);
    if (shouldRetry && attempts < row.delivery.maxAttempts) {
      await db
        .update(notificationDeliveries)
        .set({
          status: 'pending',
          attempts,
          nextAttemptAt: new Date(retryDelay(attempts, result.retryAt)),
          lastStatusCode: result.statusCode,
          lastError: result.error,
          updatedAt: new Date(),
        })
        .where(eq(notificationDeliveries.id, row.delivery.id));
      summary.retried += 1;
      continue;
    }

    const succeeded = result.statusCode !== null && result.statusCode < 300;
    await db
      .update(notificationDeliveries)
      .set({
        status: succeeded ? 'sent' : 'failed',
        attempts,
        nextAttemptAt: new Date(),
        sentAt: succeeded ? new Date() : null,
        lastStatusCode: result.statusCode,
        lastError: succeeded ? null : result.error,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, row.delivery.id));

    if (succeeded) summary.sent += 1;
    else summary.failed += 1;
  }

  return summary;
}
