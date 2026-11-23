import type { RealtimeEvent } from '@/lib/realtime-hub';
import {
  SUPABASE_BROADCAST_EVENT,
  SUPABASE_REALTIME_CHANNEL,
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
  isNewSupabaseApiKey,
  isSupabaseServerConfigured,
} from '@/lib/supabase/config';

/**
 * Publishes a collaborative RealtimeEvent across all server containers via
 * Supabase Realtime's HTTP Broadcast API (stateless, zero persistent WS socket).
 *
 * Uses modern opaque `sb_secret_...` / `sb_publishable_...` keys in the `apikey` header
 * without sending them as Bearer tokens (retiring legacy JWT keys before 2027).
 * Falls back gracefully for legacy JWT keys during transition.
 */
export async function publishToSupabaseRealtime(event: RealtimeEvent): Promise<boolean> {
  if (!isSupabaseServerConfigured()) return false;
  if (process.env.VITEST && !process.env.ENABLE_SUPABASE_REALTIME_IN_TESTS) {
    return false;
  }

  const supabaseUrl = getSupabaseUrl().replace(/\/+$/, '');
  const apiKey = getSupabaseSecretKey() || getSupabasePublishableKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: apiKey,
  };

  // New Supabase keys (sb_secret_... / sb_publishable_...) are not JWTs and must not be sent as Bearer tokens
  if (!isNewSupabaseApiKey(apiKey)) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          {
            topic: SUPABASE_REALTIME_CHANNEL,
            event: SUPABASE_BROADCAST_EVENT,
            payload: event,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn('[Supabase Realtime] Broadcast returned HTTP', res.status);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Realtime] Broadcast failed:', err);
    return false;
  }
}
