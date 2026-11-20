import { NextRequest, NextResponse } from 'next/server';
import {
  realtimeHub,
  RealtimeEventType,
  RealtimeActor,
  canReceiveRealtimeEvent,
} from '@/lib/realtime-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/events
 * Server-Sent Events (SSE) stream endpoint for real-time collaborative updates.
 */
export async function GET(req: NextRequest) {
  let authUser: { id: string; role: string } | null = null;
  try {
    const { getAuthenticatedUser } = await import('@/lib/auth-server');
    authUser = await getAuthenticatedUser(req);
  } catch {
    authUser = null;
  }
  const viewer = authUser ? { id: authUser.id, role: authUser.role } : null;

  const encoder = new TextEncoder();
  const subscriberId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial CONNECTED handshake event
      const nowIso = new Date().toISOString();
      const initId = `init-${Date.now()}`;
      const filteredRecent = realtimeHub
        .getRecentEvents()
        .filter((evt) => canReceiveRealtimeEvent(evt, viewer))
        .slice(-10);

      const initialPayload = {
        id: initId,
        type: 'CONNECTED' as const,
        timestamp: nowIso,
        actor: { id: 'system', name: 'Système' },
        message: 'Flux collaboratif connecté',
        status: 'connected',
        subscriberId,
        connectedAt: nowIso,
        activePresence: realtimeHub.getActivePresence(),
        recentEvents: filteredRecent,
      };

      controller.enqueue(
        encoder.encode(`id: ${initId}\nevent: CONNECTED\ndata: ${JSON.stringify(initialPayload)}\n\n`)
      );

      // 2. Subscribe to the real-time event bus with strict recipient isolation
      unsubscribe = realtimeHub.subscribe(subscriberId, (event) => {
        try {
          if (!canReceiveRealtimeEvent(event, viewer)) {
            return;
          }
          const sseMessage = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        } catch {
          // Stream might have closed
        }
      });

      // 3. Keep-alive heartbeat every 20 seconds
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 20000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  // Handle client abort/disconnect
  req.signal.addEventListener('abort', () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

const CLIENT_BROADCASTABLE_EVENT_TYPES = new Set<RealtimeEventType>([
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
  'TASK_ASSIGNED',
  'TASK_COMPLETED',
]);

function sanitizeEventPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = { ...payload };
  for (const key of ['dossier', 'existingDossier']) {
    if (copy[key] && typeof copy[key] === 'object' && Array.isArray(copy[key].trackedFiles)) {
      copy[key] = {
        ...copy[key],
        trackedFiles: copy[key].trackedFiles.map((file: any) => ({
          ...file,
          versions: Array.isArray(file.versions)
            ? file.versions.map((ver: any) => ({
                ...ver,
                contentUrl:
                  typeof ver.contentUrl === 'string' && ver.contentUrl.startsWith('data:')
                    ? `/api/review/file-versions/${encodeURIComponent(ver.id)}/download?dossierId=${encodeURIComponent(copy[key].id || '')}`
                    : ver.contentUrl,
              }))
            : [],
        })),
      };
    }
  }
  return copy;
}

/**
 * POST /api/events
 * Broadcasts an authenticated, validated event to SSE clients.
 */
export async function POST(req: NextRequest) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/auth-server');
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentification requise pour diffuser un événement.' },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }
    const { type, targetId, targetRef, message, payload } = body;

    if (!type || !message || typeof type !== 'string' || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (type, message)' },
        { status: 400 }
      );
    }

    if (!CLIENT_BROADCASTABLE_EVENT_TYPES.has(type as RealtimeEventType)) {
      return NextResponse.json(
        { error: `Type d'événement non autorisé : ${type}` },
        { status: 403 }
      );
    }

    const sessionActor: RealtimeActor = {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      department: authUser.department,
      role: authUser.role,
    };

    const broadcasted = realtimeHub.broadcast({
      type: type as RealtimeEventType,
      actor: sessionActor,
      targetId: typeof targetId === 'string' ? targetId : undefined,
      targetRef: typeof targetRef === 'string' ? targetRef : undefined,
      message: message.trim().slice(0, 500),
      payload: sanitizeEventPayload(payload),
    });

    return NextResponse.json({
      success: true,
      event: broadcasted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erreur lors de la diffusion de l événement' },
      { status: 500 }
    );
  }
}
