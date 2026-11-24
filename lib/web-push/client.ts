export type SubscribeResult =
  | 'subscribed'
  | 'already-subscribed'
  | 'denied'
  | 'unsupported'
  | 'failed';

export interface PublicKeyResponse {
  enabled: boolean;
  publicKey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parsePublicKeyResponse(value: unknown): PublicKeyResponse | null {
  if (!isRecord(value) || typeof value.enabled !== 'boolean') return null;
  const publicKey = value.publicKey;
  return {
    enabled: value.enabled,
    publicKey: typeof publicKey === 'string' && publicKey ? publicKey : undefined,
  };
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export async function subscribeCurrentBrowser(): Promise<SubscribeResult> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    typeof Notification === 'undefined'
  ) {
    return 'unsupported';
  }

  const publicKeyResponse = await fetch('/api/push/public-key');
  if (!publicKeyResponse.ok) return 'failed';
  const payload: unknown = await publicKeyResponse.json();
  const publicKeyPayload = parsePublicKeyResponse(payload);
  if (!publicKeyPayload?.enabled || !publicKeyPayload.publicKey) return 'unsupported';

  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return 'already-subscribed';

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKeyPayload.publicKey),
  });

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });

  return response.ok ? 'subscribed' : 'failed';
}
