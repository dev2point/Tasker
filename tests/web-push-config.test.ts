import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getWebPushConfig,
  isWebPushConfigured,
  requireWebPushConfig,
} from '@/lib/web-push/config';

const keys = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'WEB_PUSH_VAPID_PRIVATE_KEY',
  'WEB_PUSH_VAPID_SUBJECT',
] as const;

type VapidKey = (typeof keys)[number];

describe('web push config', () => {
  const original: Record<VapidKey, string | undefined> = {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined,
    WEB_PUSH_VAPID_PRIVATE_KEY: undefined,
    WEB_PUSH_VAPID_SUBJECT: undefined,
  };

  beforeEach(() => {
    for (const key of keys) original[key] = process.env[key];
    for (const key of keys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  it('returns null when configuration is incomplete', () => {
    expect(getWebPushConfig()).toBeNull();
    expect(isWebPushConfigured()).toBe(false);
    expect(() => requireWebPushConfig()).toThrow('WEB_PUSH_NOT_CONFIGURED');
  });

  it('returns trimmed config values when complete', () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = '  public-key  ';
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY = '  private-key  ';
    process.env.WEB_PUSH_VAPID_SUBJECT = '  mailto:admin@example.com  ';

    expect(getWebPushConfig()).toEqual({
      publicKey: 'public-key',
      privateKey: 'private-key',
      subject: 'mailto:admin@example.com',
    });
  });
});
