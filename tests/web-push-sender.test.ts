import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendWebPush } from '@/lib/web-push/sender';

const webPushMock = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(async () => ({ statusCode: 201 })),
}));

vi.mock('web-push', () => ({
  setVapidDetails: webPushMock.setVapidDetails,
  sendNotification: webPushMock.sendNotification,
}));

vi.mock('@/lib/web-push/config', () => ({
  requireWebPushConfig: () => ({
    publicKey: 'public',
    privateKey: 'private',
    subject: 'mailto:admin@example.com',
  }),
}));

describe('sendWebPush', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends encrypted payload and reports status', async () => {
    const result = await sendWebPush(
      { endpoint: 'https://push.test/a', p256dh: 'p', auth: 'a' },
      { title: 'T', body: 'B', url: '/', tag: 'tag', notificationId: 'n1' }
    );

    expect(webPushMock.setVapidDetails).toHaveBeenCalledTimes(1);
    expect(webPushMock.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.test/a', keys: { p256dh: 'p', auth: 'a' } },
      expect.any(String),
      expect.objectContaining({ TTL: 86400, urgency: 'high', topic: 'tag' })
    );
    expect(result).toEqual({ statusCode: 201, expired: false, retryAt: null, error: null });
  });
});
