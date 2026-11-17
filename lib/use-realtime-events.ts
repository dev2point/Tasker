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

export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeEventsOptions {
  enabled?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  onEvent?: (event: RealtimeEvent) => void;
  onPresenceUpdate?: (members: PresenceMember[]) => void;
  onDossierUpdate?: (dossier: ReviewDossier, eventType: RealtimeEventType) => void;
  enableSounds?: boolean;
}

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
  const [status, setStatus] = useState<SSEConnectionStatus>(enabled ? 'connecting' : 'disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [alerts, setAlerts] = useState<RealtimeEvent[]>([]);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Store options in ref to avoid reconnecting on every render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const playNotificationSound = useCallback((type: RealtimeEventType) => {
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
  }, [enableSounds]);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let attempts = 0;

    const setupConnection = () => {
      try {
        es = new EventSource('/api/events');
        eventSourceRef.current = es;

        es.onopen = () => {
          setStatus('connected');
          attempts = 0;
        };

        const handleIncomingEvent = (rawEventData: unknown, fallbackType?: RealtimeEventType) => {
          const eventData = normalizeRealtimeEvent(rawEventData, fallbackType);
          if (!eventData) return;

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
          setStatus('error');
          if (es) {
            es.close();
            es = null;
          }

          const delay = Math.min(1000 * Math.pow(1.5, ++attempts), 15000);
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(setupConnection, delay);
        };
      } catch {
        setStatus('error');
      }
    };

    setupConnection();

    return () => {
      if (es) {
        es.close();
        es = null;
      }
      eventSourceRef.current = null;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
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
    lastEvent,
    alerts,
    dismissAlert,
    clearAlerts,
    sendEvent,
    reconnect,
  };
}
