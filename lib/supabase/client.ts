'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseClientConfigured,
} from '@/lib/supabase/config';

let browserSupabaseClient: SupabaseClient | null = null;

/**
 * Browser singleton client dedicated to Supabase Realtime & Presence.
 * Uses the modern Supabase Publishable Key (`sb_publishable_...`, with legacy fallback).
 * Authentication remains managed by Better Auth so Supabase auth persistence is disabled.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined' || !isSupabaseClientConfigured()) {
    return null;
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return browserSupabaseClient;
}
