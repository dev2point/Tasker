import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks } from '@/src/db/schema';
import { Task } from '@/types/task';

export async function POST(req: NextRequest) {
  const db = getDrizzleDb();

  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({
      synced: false,
      message: 'PostgreSQL non configuré. Mode local uniquement.',
    });
  }

  try {
    await ensureDatabaseTables();
    const clientTasks: Task[] = await req.json();

    if (Array.isArray(clientTasks) && clientTasks.length > 0) {
      for (const t of clientTasks) {
        await db
          .insert(tasks)
          .values({
            id: t.id,
            title: t.title,
            description: t.description || null,
            dueDate: t.dueDate,
            dueTime: t.dueTime || null,
            priority: t.priority,
            status: t.status || (t.completed ? 'completed' : 'todo'),
            category: t.category,
            completed: t.completed,
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            workspaceId: t.workspaceId || null,
            creatorId: t.creatorId || null,
            assigneeId: t.assigneeId || null,
            reminderMinutesBefore: t.reminderMinutesBefore ?? 15,
            reminderTriggered: t.reminderTriggered || false,
            reminderDismissed: t.reminderDismissed || false,
            recurrence: t.recurrence || 'none',
            tags: t.tags || [],
            subtasks: t.subtasks || [],
            color: t.color || null,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: tasks.id,
            set: {
              title: t.title,
              description: t.description || null,
              dueDate: t.dueDate,
              dueTime: t.dueTime || null,
              priority: t.priority,
              status: t.status || (t.completed ? 'completed' : 'todo'),
              category: t.category,
              completed: t.completed,
              completedAt: t.completedAt ? new Date(t.completedAt) : null,
              assigneeId: t.assigneeId || null,
              subtasks: t.subtasks || [],
              tags: t.tags || [],
              updatedAt: new Date(),
            },
          });
      }
    }

    // Retrieve full synced dataset from PostgreSQL
    const serverRows = await db.select().from(tasks);
    const syncedTasks: Task[] = serverRows.map((r) => ({
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
      synced: true,
      count: syncedTasks.length,
      tasks: syncedTasks,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync error' },
      { status: 500 }
    );
  }
}
