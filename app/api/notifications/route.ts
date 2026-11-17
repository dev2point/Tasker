import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { notifications } from '@/src/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { TaskNotification } from '@/types/task';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier pour consulter vos notifications.' },
      { status: 401 }
    );
  }

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({
      source: 'offline_mode',
      notifications: [],
    });
  }

  try {
    await ensureDatabaseTables();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, user.id))
      .orderBy(desc(notifications.triggerTime))
      .limit(100);

    const formatted: TaskNotification[] = rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      taskTitle: r.taskTitle,
      dueDate: r.dueDate,
      dueTime: r.dueTime || undefined,
      triggerTime: r.triggerTime.toISOString(),
      read: Boolean(r.read),
      type: r.type as TaskNotification['type'],
      targetUserId: r.recipientId,
      actionBy: r.actorId || undefined,
      actionByName: r.actorName || undefined,
      message: r.message || undefined,
    }));

    return NextResponse.json({
      source: 'postgresql',
      notifications: formatted,
    });
  } catch (error) {
    console.warn('Error fetching notifications:', error);
    return NextResponse.json({
      source: 'offline_mode',
      notifications: [],
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    await ensureDatabaseTables();
    const body = await req.json().catch(() => ({}));
    const readValue = body.read !== undefined ? Boolean(body.read) : true;

    if (body.markAll) {
      await db
        .update(notifications)
        .set({ read: readValue })
        .where(eq(notifications.recipientId, user.id));
    } else if (typeof body.id === 'string' && body.id.trim()) {
      await db
        .update(notifications)
        .set({ read: readValue })
        .where(and(eq(notifications.id, body.id), eq(notifications.recipientId, user.id)));
    } else {
      return NextResponse.json({ error: 'Paramètre id ou markAll requis.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('Error updating notification state:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    await ensureDatabaseTables();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await db
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.recipientId, user.id)));
    } else {
      await db.delete(notifications).where(eq(notifications.recipientId, user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn('Error deleting notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
