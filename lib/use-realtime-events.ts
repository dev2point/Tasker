'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeEvent, RealtimeEventType } from '@/lib/realtime-hub';
import { PresenceMember, ReviewDossier } from '@/types/review';
import { soundManager } from '@/lib/sound';

export type SSEConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeEventsOptions {
  onEvent?: (event: RealtimeEvent) => void;
  onPresenceUpdate?: (members: PresenceMember[]) => void;
  onDossierUpdate?: (dossier: ReviewDossier, eventType: RealtimeEventType) => void;
  enableSounds?: boolean;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const { onEvent, onPresenceUpdate, onDossierUpdate, enableSounds = true } = options;
  const [status, setStatus] = useState<SSEConnectionStatus>('connecting');
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
      if (type === 'DOSSIER_VALIDATED') {
        soundManager.playCompleteSound();
      } else if (type === 'DOSSIER_REJECTED' || type === 'DOSSIER_LOCKED' || type === 'DOSSIER_CONFLICT') {
        soundManager.playReminderChime();
      } else if (type === 'DOSSIER_SUBMITTED' || type === 'DOSSIER_AMENDED') {
        soundManager.playClickSound();
      }
    } catch {
      // Audio playback might be restricted by browser policy before user interaction
    }
  }, [enableSounds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

        const handleIncomingEvent = (eventData: RealtimeEvent) => {
          setLastEvent(eventData);

          if (
            eventData.type !== 'CONNECTED' &&
            eventData.type !== 'HEARTBEAT' &&
            eventData.type !== 'PRESENCE_CHANGED'
          ) {
            setAlerts((prev) => [eventData, ...prev.slice(0, 9)]);
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
          'PRESENCE_CHANGED',
          'TASK_UPDATED',
        ];

        eventTypes.forEach((type) => {
          es?.addEventListener(type, (e: MessageEvent) => {
            try {
              const parsed = JSON.parse(e.data);
              handleIncomingEvent(parsed);
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
  }, [playNotificationSound, reconnectNonce]);

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
