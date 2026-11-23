'use client';

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { PresenceMember } from '@/types/review';
import {
  SUPABASE_BROADCAST_EVENT,
  SUPABASE_REALTIME_CHANNEL,
} from '@/lib/supabase/config';

export interface SupabaseRealtimeSubscriber {
  userId?: string;
  userRole?: string;
  onBroadcast: (payload: unknown) => void;
  onPostgresNotification: (row: Record<string, any>) => void;
  onPresenceMembers: (members: PresenceMember[]) => void;
  onStatus: (status: string) => void;
}

interface ChannelController {
  listeners: Map<symbol, SupabaseRealtimeSubscriber>;
  channel: RealtimeChannel | null;
  lastStatus: string | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  initPromise: Promise<void> | null;
  teardownPromise: Promise<void> | null;
  lastTrackedKey: string | null;
}

const controllersByClient = new WeakMap<SupabaseClient, ChannelController>();
const CHANNEL_TEARDOWN_GRACE_MS = 80;

function getController(supabase: SupabaseClient): ChannelController {
  let controller = controllersByClient.get(supabase);
  if (!controller) {
    controller = {
      listeners: new Map(),
      channel: null,
      lastStatus: null,
      cleanupTimer: null,
      initPromise: null,
      teardownPromise: null,
      lastTrackedKey: null,
    };
    controllersByClient.set(supabase, controller);
  }
  return controller;
}

function extractPresenceMembers(channel: RealtimeChannel): PresenceMember[] {
  const rawState = channel.presenceState() as Record<string, any[]>;
  const members: PresenceMember[] = [];
  Object.values(rawState || {}).forEach((entries) => {
    const latest = Array.isArray(entries) ? entries[0] : null;
    if (latest && latest.userId) {
      members.push({
        userId: String(latest.userId),
        userName: String(latest.userName || latest.userId),
        department: (latest.department as any) || 'Fiscalité',
        role: String(latest.role || 'Collaborateur'),
        dossierId: latest.dossierId,
        status: (latest.status as any) || 'viewing',
        lastSeen: String(latest.lastSeen || new Date().toISOString()),
      });
    }
  });
  return members;
}

function getPreferredTrackIdentity(controller: ChannelController): {
  userId: string;
  role: string;
} | null {
  for (const listener of controller.listeners.values()) {
    if (listener.userId) {
      return {
        userId: listener.userId,
        role: listener.userRole || 'Collaborateur',
      };
    }
  }
  return null;
}

function syncPresenceTrack(controller: ChannelController): void {
  if (!controller.channel || controller.lastStatus !== 'SUBSCRIBED') return;
  const identity = getPreferredTrackIdentity(controller);
  if (!identity) return;

  const trackKey = `${identity.userId}:${identity.role}`;
  if (controller.lastTrackedKey === trackKey) return;
  controller.lastTrackedKey = trackKey;

  void controller.channel.track({
    userId: identity.userId,
    role: identity.role,
    status: 'viewing',
    lastSeen: new Date().toISOString(),
  });
}

async function ensureChannel(
  supabase: SupabaseClient,
  controller: ChannelController
): Promise<void> {
  if (controller.initPromise) {
    await controller.initPromise;
    return;
  }

  controller.initPromise = (async () => {
    try {
      if (controller.teardownPromise) {
        await controller.teardownPromise;
      }

      if (controller.listeners.size === 0 || controller.channel) {
        return;
      }

      const topicName = `realtime:${SUPABASE_REALTIME_CHANNEL}`;
      const existingChannel = supabase
        .getChannels?.()
        .find((c) => c.topic === topicName);

      if (existingChannel) {
        const alreadyJoined = Boolean(
          (existingChannel as unknown as { joinedOnce?: boolean }).joinedOnce
        );
        if (alreadyJoined) {
          await Promise.resolve(supabase.removeChannel(existingChannel)).catch(() => {});
          if (controller.listeners.size === 0 || controller.channel) {
            return;
          }
        }
      }

      const identity = getPreferredTrackIdentity(controller);
      const presenceKey =
        identity?.userId || `anon-${Math.random().toString(36).slice(2, 8)}`;

      const channel = supabase.channel(SUPABASE_REALTIME_CHANNEL, {
        config: {
          broadcast: { self: false },
          presence: { key: presenceKey },
        },
      });

      // Double-check `joinedOnce` guard before calling `.on(...)`
      if (Boolean((channel as unknown as { joinedOnce?: boolean }).joinedOnce)) {
        await Promise.resolve(supabase.removeChannel(channel)).catch(() => {});
        if (controller.listeners.size === 0) return;
      }

      const activeChannel = Boolean(
        (channel as unknown as { joinedOnce?: boolean }).joinedOnce
      )
        ? supabase.channel(SUPABASE_REALTIME_CHANNEL, {
            config: {
              broadcast: { self: false },
              presence: { key: presenceKey },
            },
          })
        : channel;

      controller.channel = activeChannel;
      controller.lastStatus = null;
      controller.lastTrackedKey = null;

      activeChannel
        .on('broadcast', { event: SUPABASE_BROADCAST_EVENT }, ({ payload }) => {
          controller.listeners.forEach((listener) => {
            listener.onBroadcast(payload);
          });
        })
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (pgPayload) => {
            const row = pgPayload?.new as Record<string, any> | undefined;
            if (!row) return;
            controller.listeners.forEach((listener) => {
              listener.onPostgresNotification(row);
            });
          }
        )
        .on('presence', { event: 'sync' }, () => {
          if (!controller.channel) return;
          const members = extractPresenceMembers(controller.channel);
          if (members.length === 0) return;
          controller.listeners.forEach((listener) => {
            listener.onPresenceMembers(members);
          });
        })
        .subscribe((channelStatus) => {
          if (controller.channel !== activeChannel) return;
          controller.lastStatus = channelStatus;
          if (channelStatus === 'SUBSCRIBED') {
            syncPresenceTrack(controller);
          }
          controller.listeners.forEach((listener) => {
            listener.onStatus(channelStatus);
          });
        });
    } finally {
      controller.initPromise = null;
    }
  })();

  await controller.initPromise;
}

/**
 * Subscribes a hook instance to the singleton shared Supabase Realtime channel.
 * Guarantees `.on('broadcast' | 'postgres_changes' | 'presence')` and `.subscribe()`
 * are attached strictly once per channel lifecycle — immune to React StrictMode
 * double-mounts and multiple concurrent `useRealtimeEvents` callers.
 */
export function subscribeToSharedSupabaseChannel(
  supabase: SupabaseClient,
  subscriber: SupabaseRealtimeSubscriber
): () => void {
  const controller = getController(supabase);
  const token = Symbol('supabase-realtime-subscriber');

  if (controller.cleanupTimer) {
    clearTimeout(controller.cleanupTimer);
    controller.cleanupTimer = null;
  }

  controller.listeners.set(token, subscriber);

  if (controller.channel) {
    if (controller.lastStatus) {
      queueMicrotask(() => {
        if (!controller.listeners.has(token) || !controller.lastStatus) return;
        subscriber.onStatus(controller.lastStatus);
        if (controller.lastStatus === 'SUBSCRIBED' && controller.channel) {
          syncPresenceTrack(controller);
          const members = extractPresenceMembers(controller.channel);
          if (members.length > 0) {
            subscriber.onPresenceMembers(members);
          }
        }
      });
    }
  } else {
    void ensureChannel(supabase, controller);
  }

  return () => {
    controller.listeners.delete(token);
    if (controller.listeners.size > 0) {
      return;
    }

    if (controller.cleanupTimer) {
      clearTimeout(controller.cleanupTimer);
    }

    controller.cleanupTimer = setTimeout(() => {
      controller.cleanupTimer = null;
      if (controller.listeners.size > 0 || !controller.channel) {
        return;
      }

      const channelToRemove = controller.channel;
      controller.channel = null;
      controller.lastStatus = null;
      controller.lastTrackedKey = null;

      controller.teardownPromise = Promise.resolve(
        supabase.removeChannel(channelToRemove)
      )
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => {
          controller.teardownPromise = null;
        });
    }, CHANNEL_TEARDOWN_GRACE_MS);
  };
}
