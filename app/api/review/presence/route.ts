import { NextRequest, NextResponse } from 'next/server';
import { realtimeHub, ServerPresenceMember } from '@/lib/realtime-hub';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review/presence
 * Retrieves the current real-time presence list across all reviewers.
 */
export async function GET() {
  const active = realtimeHub.getActivePresence();
  return NextResponse.json({
    members: active,
    total: active.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/review/presence
 * Pings current user presence and broadcasts to all connected SSE clients.
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
    const { userId, userName, department, role, dossierId, status } = body;

    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'userId et userName sont requis pour enregistrer la présence' },
        { status: 400 }
      );
    }

    const member: ServerPresenceMember = {
      userId,
      userName,
      department: department || 'Fiscalité',
      role: role || 'Collaborateur',
      dossierId: dossierId || undefined,
      status: status || 'viewing',
      lastSeen: new Date().toISOString(),
    };

    const updatedList = realtimeHub.updatePresence(member);

    return NextResponse.json({
      success: true,
      members: updatedList,
      currentMember: member,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erreur lors de la mise à jour de présence' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/review/presence
 * Removes a user from presence when closing a dossier or disconnecting.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    const updatedList = realtimeHub.removePresence(userId);

    return NextResponse.json({
      success: true,
      members: updatedList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erreur lors de la suppression de présence' },
      { status: 500 }
    );
  }
}
