export interface WebPushConfig {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
}

export class WebPushConfigurationError extends Error {
  readonly code = 'WEB_PUSH_NOT_CONFIGURED';

  constructor() {
    super('WEB_PUSH_NOT_CONFIGURED');
    this.name = 'WebPushConfigurationError';
  }
}

export function getWebPushConfig(): WebPushConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return getWebPushConfig() !== null;
}

export function requireWebPushConfig(): WebPushConfig {
  const config = getWebPushConfig();
  if (!config) throw new WebPushConfigurationError();
  return config;
}
