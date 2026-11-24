import { describe, expect, it } from 'vitest';
import { parsePushSubscriptionInput } from '@/lib/web-push/validation';

describe('parsePushSubscriptionInput', () => {
  it('accepts a valid https subscription', () => {
    expect(
      parsePushSubscriptionInput({
        endpoint: 'https://push.example.test/send/abc',
        keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
      })
    ).toEqual({
      endpoint: 'https://push.example.test/send/abc',
      p256dh: 'p256dh-value',
      auth: 'auth-value',
    });
  });

  it('rejects http endpoints, missing keys and empty values', () => {
    expect(parsePushSubscriptionInput({ endpoint: 'http://push.test/a', keys: {} })).toBeNull();
    expect(
      parsePushSubscriptionInput({
        endpoint: 'https://push.test/a',
        keys: { p256dh: '', auth: 'x' },
      })
    ).toBeNull();
    expect(parsePushSubscriptionInput(null)).toBeNull();
  });
});
