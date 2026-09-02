import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Task } from '@/types/task';

export async function GET() {
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
    console.error('Error fetching tasks from PostgreSQL:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Database error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
        creatorId: taskData.creatorId || null,
        assigneeId: taskData.assigneeId || null,
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
          assigneeId: taskData.assigneeId || null,
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
