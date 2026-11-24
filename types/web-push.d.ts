declare module 'web-push' {
  export interface WebPushSubscriptionPayload {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }

  export interface WebPushSendOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
  }

  export interface WebPushSendResponse {
    statusCode?: number;
    headers?: Record<string, string | undefined>;
    body?: string;
  }

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: WebPushSubscriptionPayload,
    payload: string,
    options?: WebPushSendOptions
  ): Promise<WebPushSendResponse>;
}
