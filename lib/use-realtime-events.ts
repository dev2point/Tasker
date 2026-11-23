'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RealtimeEvent,
  RealtimeEventType,
  normalizeRealtimeEvent,
  shouldSurfaceRealtimeAlert,
  canReceiveRealtimeEvent,
} from '@/lib/realtime-hub';
import { PresenceMember, ReviewDossier } from '@/types/review';
import { soundManager } from '@/lib/sound';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  SUPABASE_BROADCAST_EVENT,
  SUPABASE_REALTIME_CHANNEL,
  isSupabaseClientConfigured,
} from '@/lib/supabase/config';
import { subscribeToSharedSupabaseChannel } from '@/lib/supabase/realtime-manager';

export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type RealtimeTransportMode = 'supabase+sse' | 'sse';

interface UseRealtimeEventsOptions {
  enabled?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  onEvent?: (event: RealtimeEvent) => void;
  onPresenceUpdate?: (members: PresenceMember[]) => void;
  onDossierUpdate?: (dossier: ReviewDossier, eventType: RealtimeEventType) => void;
  onDossierDelete?: (dossierId: string) => void;
  enableSounds?: boolean;
}

const MAX_SEEN_EVENT_IDS = 300;

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const {
    enabled = true,
    currentUserId,
    currentUserRole,
    onEvent,
    onPresenceUpdate,
    onDossierUpdate,
    enableSounds = true,
  } = options;

  const supabaseEnabled = isSupabaseClientConfigured();
  const [status, setStatus] = useState<SSEConnectionStatus>(enabled ? 'connecting' : 'disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [alerts, setAlerts] = useState<RealtimeEvent[]>([]);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // Store options in ref to avoid reconnecting on every render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const playNotificationSound = useCallback(
    (type: RealtimeEventType) => {
      if (!enableSounds) return;
      try {
        if (type === 'DOSSIER_VALIDATED' || type === 'TASK_COMPLETED') {
          soundManager.playCompleteSound();
        } else if (
          type === 'DOSSIER_REJECTED' ||
          type === 'DOSSIER_LOCKED' ||
          type === 'DOSSIER_CONFLICT' ||
          type === 'TASK_ASSIGNED'
        ) {
          soundManager.playReminderChime();
        } else if (type === 'DOSSIER_SUBMITTED' || type === 'DOSSIER_AMENDED') {
          soundManager.playClickSound();
        }
      } catch {
        // Audio playback might be restricted by browser policy before user interaction
      }
    },
    [enableSounds]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let attempts = 0;
    let sseOpen = false;
    let supabaseOpen = false;

    const supabase = getSupabaseBrowserClient();
    let supabaseChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    const refreshConnectionStatus = () => {
      if (sseOpen || supabaseOpen) {
        setStatus('connected');
      }
    };

    const handleIncomingEvent = (rawEventData: unknown, fallbackType?: RealtimeEventType) => {
      const eventData = normalizeRealtimeEvent(rawEventData, fallbackType);
      if (!eventData) return;

      // Deduplicate events across dual transport (SSE + Supabase Realtime)
      const seen = seenEventIdsRef.current;
      if (seen.has(eventData.id)) {
        return;
      }
      seen.add(eventData.id);
      if (seen.size > MAX_SEEN_EVENT_IDS) {
        const iterator = seen.values();
        for (let i = 0; i < 100; i++) {
          const oldest = iterator.next();
          if (oldest.done) break;
          seen.delete(oldest.value);
        }
      }

      const viewerId = optionsRef.current.currentUserId;
      const viewerRole = optionsRef.current.currentUserRole;
      if (
        viewerId &&
        !canReceiveRealtimeEvent(eventData, { id: viewerId, role: viewerRole })
      ) {
        return;
      }

      setLastEvent(eventData);

      if (shouldSurfaceRealtimeAlert(eventData)) {
        setAlerts((prev) => {
          const deduped = prev.filter((a) => a.id !== eventData.id);
          return [eventData, ...deduped.slice(0, 9)];
        });
        playNotificationSound(eventData.type);
      }

      if (optionsRef.current.onEvent) {
        optionsRef.current.onEvent(eventData);
      }

      if (eventData.type === 'PRESENCE_CHANGED' && eventData.payload?.members) {
        if (optionsRef.current.onPresenceUpdate) {
          optionsRef.current.onPresenceUpdate(eventData.payload.members);
        }
      }

      if (
        eventData.payload?.dossier &&
        optionsRef.current.onDossierUpdate &&
        [
          'DOSSIER_CREATED',
          'DOSSIER_SUBMITTED',
          'DOSSIER_REVIEW_STARTED',
          'DOSSIER_AMENDED',
          'DOSSIER_VALIDATED',
          'DOSSIER_REJECTED',
          'DOSSIER_ARCHIVED',
          'DOSSIER_LOCKED',
          'DOSSIER_UNLOCKED',
        ].includes(eventData.type)
      ) {
        optionsRef.current.onDossierUpdate(eventData.payload.dossier, eventData.type);
      }

      if (eventData.type === 'DOSSIER_DELETED' && optionsRef.current.onDossierDelete) {
        const deletedId = eventData.targetId || eventData.payload?.dossierId;
        if (deletedId) {
          optionsRef.current.onDossierDelete(deletedId);
        }
      }
    };

    const setupSSEConnection = () => {
      try {
        es = new EventSource('/api/events');
        eventSourceRef.current = es;

        es.onopen = () => {
          sseOpen = true;
          attempts = 0;
          refreshConnectionStatus();
        };

        es.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            handleIncomingEvent(parsed);
          } catch {
            // ignore
          }
        };

        const eventTypes: RealtimeEventType[] = [
          'CONNECTED',
          'DOSSIER_CREATED',
          'DOSSIER_SUBMITTED',
          'DOSSIER_REVIEW_STARTED',
          'DOSSIER_AMENDED',
          'DOSSIER_VALIDATED',
          'DOSSIER_REJECTED',
          'DOSSIER_ARCHIVED',
          'DOSSIER_LOCKED',
          'DOSSIER_UNLOCKED',
          'DOSSIER_CONFLICT',
          'DOSSIER_DELETED',
          'PRESENCE_CHANGED',
          'TASK_UPDATED',
          'TASK_ASSIGNED',
          'TASK_COMPLETED',
          'TASK_DELETED',
        ];

        eventTypes.forEach((type) => {
          es?.addEventListener(type, (e: MessageEvent) => {
            try {
              const parsed = JSON.parse(e.data);
              handleIncomingEvent(parsed, type);
            } catch {
              // ignore
            }
          });
        });

        es.onerror = () => {
          sseOpen = false;
          if (!supabaseOpen) {
            setStatus('error');
          }
          if (es) {
            es.close();
            es = null;
          }

          const delay = Math.min(1000 * Math.pow(1.5, ++attempts), 15000);
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(setupSSEConnection, delay);
        };
      } catch {
        if (!supabaseOpen) {
          setStatus('error');
        }
      }
    };

    const setupSupabaseRealtime = () => {
      if (!supabase) return undefined;

      return subscribeToSharedSupabaseChannel(supabase, {
        userId: currentUserId,
        userRole: currentUserRole,
        onBroadcast: (payload: unknown) => {
          handleIncomingEvent(payload);
        },
        onPostgresNotification: (row: Record<string, any>) => {
          const viewerId = optionsRef.current.currentUserId;
          if (viewerId && row.user_id && row.user_id !== viewerId) {
            return;
          }
          const notifType =
            row.type === 'assignment'
              ? 'TASK_ASSIGNED'
              : row.type === 'completion'
                ? 'TASK_COMPLETED'
                : 'TASK_UPDATED';

          handleIncomingEvent({
            id: `pg-notif-${row.id || Date.now()}`,
            type: notifType,
            timestamp: row.created_at || new Date().toISOString(),
            actor: { id: 'system', name: 'Cabinet Mfisca' },
            targetId: row.task_id,
            targetUserId: row.user_id,
            message: row.message || row.title || 'Nouvelle notification',
            payload: { notification: row },
          });
        },
        onPresenceMembers: (members: PresenceMember[]) => {
          if (optionsRef.current.onPresenceUpdate) {
            optionsRef.current.onPresenceUpdate(members);
          }
        },
        onStatus: (channelStatus: string) => {
          if (channelStatus === 'SUBSCRIBED') {
            supabaseOpen = true;
            refreshConnectionStatus();
          } else if (
            channelStatus === 'CHANNEL_ERROR' ||
            channelStatus === 'TIMED_OUT' ||
            channelStatus === 'CLOSED'
          ) {
            supabaseOpen = false;
            if (!sseOpen) {
              setStatus('error');
            }
          }
        },
      });
    };

    setupSSEConnection();
    const unsubscribeSupabase = setupSupabaseRealtime();

    return () => {
      if (es) {
        es.close();
        es = null;
      }
      eventSourceRef.current = null;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (unsubscribeSupabase) {
        unsubscribeSupabase();
      }
    };
  }, [enabled, currentUserId, currentUserRole, playNotificationSound, reconnectNonce]);

  const reconnect = useCallback(() => {
    setStatus('connecting');
    setReconnectNonce((n) => n + 1);
  }, []);

  // Method to manually send an event
  const sendEvent = useCallback(
    async (
      type: RealtimeEventType,
      message: string,
      targetId?: string,
      targetRef?: string,
      payload?: any
    ) => {
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            message,
            targetId,
            targetRef,
            payload,
          }),
        });
        return await res.json();
      } catch (err) {
        console.warn('Failed to send SSE event:', err);
        return null;
      }
    },
    []
  );

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    status,
    transportMode: (supabaseEnabled ? 'supabase+sse' : 'sse') as RealtimeTransportMode,
    lastEvent,
    alerts,
    dismissAlert,
    clearAlerts,
    sendEvent,
    reconnect,
  };
}
