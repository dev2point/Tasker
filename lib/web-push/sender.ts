import { sendNotification, setVapidDetails } from 'web-push';
import { requireWebPushConfig } from '@/lib/web-push/config';
import type { WebPushPayload } from '@/lib/web-push/payload';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushSendResult {
  statusCode: number | null;
  expired: boolean;
  retryAt: number | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStatusCode(error: unknown): number | null {
  if (!isRecord(error)) return null;
  const statusCode = error.statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}

function readRetryAfter(error: unknown): number | null {
  if (!isRecord(error) || !isRecord(error.headers)) return null;
  const value = error.headers['retry-after'];
  if (typeof value !== 'string' || !value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Date.now() + seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : null;
}

function readErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string' && error.message) return error.message;
  return 'WEB_PUSH_SEND_FAILED';
}

let configured = false;

function configure(): void {
  if (configured) return;
  const config = requireWebPushConfig();
  setVapidDetails(config.subject, config.publicKey, config.privateKey);
  configured = true;
}

export async function sendWebPush(
  target: PushTarget,
  payload: WebPushPayload
): Promise<WebPushSendResult> {
  configure();

  try {
    const response = await sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      {
        TTL: 86400,
        urgency: 'high',
        topic: payload.tag,
      }
    );
    return { statusCode: response.statusCode ?? null, expired: false, retryAt: null, error: null };
  } catch (caught: unknown) {
    const statusCode = readStatusCode(caught);
    const expired = statusCode === 404 || statusCode === 410;
    const retryAt = statusCode === 429 ? readRetryAfter(caught) : null;
    return { statusCode, expired, retryAt, error: readErrorMessage(caught) };
  }
}
