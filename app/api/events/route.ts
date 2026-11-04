import { NextRequest, NextResponse } from 'next/server';
import { realtimeHub, RealtimeEventType, RealtimeActor } from '@/lib/realtime-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/events
 * Server-Sent Events (SSE) stream endpoint for real-time collaborative updates.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const subscriberId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial CONNECTED handshake event
      const initialPayload = {
        status: 'connected',
        subscriberId,
        connectedAt: new Date().toISOString(),
        activePresence: realtimeHub.getActivePresence(),
        recentEvents: realtimeHub.getRecentEvents().slice(-10),
      };

      controller.enqueue(
        encoder.encode(`id: init-${Date.now()}\nevent: CONNECTED\ndata: ${JSON.stringify(initialPayload)}\n\n`)
      );

      // 2. Subscribe to the real-time event bus
      unsubscribe = realtimeHub.subscribe(subscriberId, (event) => {
        try {
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

/**
 * POST /api/events
 * Broadcasts an event to all connected SSE clients.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }
    const { type, actor, targetId, targetRef, message, payload } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (type, message)' },
        { status: 400 }
      );
    }

    const defaultActor: RealtimeActor = actor || {
      id: 'system',
      name: 'Système PlanIt',
    };

    const broadcasted = realtimeHub.broadcast({
      type: type as RealtimeEventType,
      actor: defaultActor,
      targetId,
      targetRef,
      message,
      payload,
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
