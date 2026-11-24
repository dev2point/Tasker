export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parsePushSubscriptionInput(body: unknown): PushSubscriptionInput | null {
  if (!isRecord(body)) return null;

  const endpoint = body.endpoint;
  const keys = body.keys;
  if (typeof endpoint !== 'string' || !isRecord(keys)) return null;

  const p256dh = keys.p256dh;
  const auth = keys.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  if (!endpoint || !p256dh || !auth) return null;
  if (endpoint.length > 2048 || p256dh.length > 512 || auth.length > 512) return null;

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  return { endpoint, p256dh, auth };
}
