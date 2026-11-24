import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { notificationDeliveries, pushSubscriptions } from '@/src/db/schema';

describe('web push schema', () => {
  it('defines subscription and delivery tables', () => {
    expect(getTableName(pushSubscriptions)).toBe('push_subscriptions');
    expect(getTableName(notificationDeliveries)).toBe('notification_deliveries');
    expect(pushSubscriptions.endpoint.name).toBe('endpoint');
    expect(notificationDeliveries.dedupeKey.name).toBe('dedupe_key');
  });
});
