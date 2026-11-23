export const SUPABASE_REALTIME_CHANNEL = 'mfisca-cabinet-realtime';
export const SUPABASE_BROADCAST_EVENT = 'realtime_event';

export type SupabaseKeyFormat = 'publishable_secret' | 'legacy_jwt' | 'mixed' | 'unconfigured';

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function isNewSupabaseApiKey(key: string): boolean {
  return key.startsWith('sb_publishable_') || key.startsWith('sb_secret_');
}

export function isLegacyJwtSupabaseKey(key: string): boolean {
  return key.startsWith('eyJ') && key.split('.').length === 3;
}

export function getSupabaseUrl(): string {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url || url.includes('[PROJECT-REF]')) return '';
  return url;
}

/**
 * Returns the client-safe Supabase Publishable Key (`sb_publishable_...`),
 * falling back to legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` only during migration.
 */
export function getSupabasePublishableKey(): string {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/**
 * Returns the server-only Supabase Secret Key (`sb_secret_...`),
 * falling back to legacy `SUPABASE_SERVICE_ROLE_KEY` only during migration.
 */
export function getSupabaseSecretKey(): string {
  return (
    cleanEnv(process.env.SUPABASE_SECRET_KEY) ||
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** @deprecated Use getSupabasePublishableKey() instead. */
export function getSupabaseAnonKey(): string {
  return getSupabasePublishableKey();
}

/** @deprecated Use getSupabaseSecretKey() instead. */
export function getSupabaseServiceRoleKey(): string {
  return getSupabaseSecretKey();
}

export function getSupabaseKeyFormat(): SupabaseKeyFormat {
  const pub = getSupabasePublishableKey();
  const sec = getSupabaseSecretKey();
  const keys = [pub, sec].filter((k) => k.length > 20);
  if (keys.length === 0) return 'unconfigured';

  const hasNew = keys.some((k) => isNewSupabaseApiKey(k));
  const hasLegacy = keys.some((k) => isLegacyJwtSupabaseKey(k) || !isNewSupabaseApiKey(k));

  if (hasNew && !hasLegacy) return 'publishable_secret';
  if (!hasNew && hasLegacy) return 'legacy_jwt';
  return 'mixed';
}

export function isSupabaseClientConfigured(): boolean {
  const url = getSupabaseUrl();
  const publishable = getSupabasePublishableKey();
  return Boolean(url.startsWith('https://') && publishable.length > 20);
}

export function isSupabaseServerConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey() || getSupabasePublishableKey();
  return Boolean(url.startsWith('https://') && key.length > 20);
}
