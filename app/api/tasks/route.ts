import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Task } from '@/types/task';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier pour accéder aux tâches.' },
      { status: 401 }
    );
  }

  const db = getDrizzleDb();

  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({
      source: 'offline_mode',
      tasks: [],
      message: 'PostgreSQL non connecté. Les tâches sont gérées en local via IndexedDB.',
    });
  }

  try {
    await ensureDatabaseTables();
    const rows = await db.select().from(tasks);

    const formatted: Task[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      dueDate: r.dueDate,
      dueTime: r.dueTime || undefined,
      priority: r.priority as Task['priority'],
      category: r.category,
      completed: r.completed,
      completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
      workspaceId: r.workspaceId || undefined,
      creatorId: r.creatorId || undefined,
      assigneeId: r.assigneeId || undefined,
      reminderMinutesBefore: r.reminderMinutesBefore,
      reminderTriggered: r.reminderTriggered || false,
      reminderDismissed: r.reminderDismissed || false,
      reminderTriggeredAt: r.reminderTriggeredAt ? r.reminderTriggeredAt.toISOString() : undefined,
      recurrence: r.recurrence as Task['recurrence'],
      tags: Array.isArray(r.tags) ? r.tags : [],
      subtasks: Array.isArray(r.subtasks) ? r.subtasks : [],
      color: r.color || undefined,
      status: (r.status as Task['status']) || (r.completed ? 'completed' : 'todo'),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      source: 'postgresql_supabase',
      tasks: formatted,
    });
  } catch (error) {
    console.warn('PostgreSQL tasks fetch failed, falling back to offline mode:', error);
    return NextResponse.json({
      source: 'offline_mode',
      tasks: [],
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier pour modifier les tâches.' },
      { status: 401 }
    );
  }

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json(
      { message: 'Database not connected, task saved in local storage' },
      { status: 200 }
    );
  }

  try {
    await ensureDatabaseTables();
    const taskData: Task = await req.json();

    // Ensure authenticated user exists in the users table to satisfy foreign key constraints
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user.role as any) || 'member',
        department: user.department || null,
        status: user.status || 'active',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          name: user.name,
          role: (user.role as any) || 'member',
          department: user.department || null,
          status: user.status || 'active',
          updatedAt: new Date(),
        },
      });

    let validCreatorId = taskData.creatorId || user.id;
    if (validCreatorId) {
      const creatorExists = await db.select().from(users).where(eq(users.id, validCreatorId)).limit(1);
      if (creatorExists.length === 0) {
        validCreatorId = user.id;
      }
    }

    let validAssigneeId = taskData.assigneeId || null;
    if (validAssigneeId) {
      const assigneeExists = await db.select().from(users).where(eq(users.id, validAssigneeId)).limit(1);
      if (assigneeExists.length === 0) {
        validAssigneeId = null;
      }
    }

    await db
      .insert(tasks)
      .values({
        id: taskData.id,
        title: taskData.title,
        description: taskData.description || null,
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime || null,
        priority: taskData.priority,
        status: taskData.status || (taskData.completed ? 'completed' : 'todo'),
        category: taskData.category,
        completed: taskData.completed,
        completedAt: taskData.completedAt ? new Date(taskData.completedAt) : null,
        workspaceId: taskData.workspaceId || null,
        creatorId: validCreatorId,
        assigneeId: validAssigneeId,
        reminderMinutesBefore: taskData.reminderMinutesBefore ?? 15,
        reminderTriggered: taskData.reminderTriggered || false,
        reminderDismissed: taskData.reminderDismissed || false,
        recurrence: taskData.recurrence || 'none',
        tags: taskData.tags || [],
        subtasks: taskData.subtasks || [],
        color: taskData.color || null,
        createdAt: taskData.createdAt ? new Date(taskData.createdAt) : new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: taskData.title,
          description: taskData.description || null,
          dueDate: taskData.dueDate,
          dueTime: taskData.dueTime || null,
          priority: taskData.priority,
          status: taskData.status || (taskData.completed ? 'completed' : 'todo'),
          category: taskData.category,
          completed: taskData.completed,
          completedAt: taskData.completedAt ? new Date(taskData.completedAt) : null,
          assigneeId: validAssigneeId,
          subtasks: taskData.subtasks || [],
          tags: taskData.tags || [],
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving task to PostgreSQL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier.' },
      { status: 401 }
    );
  }

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    await db.delete(tasks).where(eq(tasks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}
