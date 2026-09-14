import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Task } from '@/types/task';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier pour synchroniser vos tâches.' },
      { status: 401 }
    );
  }

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

    if (Array.isArray(clientTasks) && clientTasks.length > 0) {
      for (const t of clientTasks) {
        let validCreatorId = t.creatorId || user.id;
        if (validCreatorId) {
          const creatorExists = await db.select().from(users).where(eq(users.id, validCreatorId)).limit(1);
          if (creatorExists.length === 0) {
            validCreatorId = user.id;
          }
        }

        let validAssigneeId = t.assigneeId || null;
        if (validAssigneeId) {
          const assigneeExists = await db.select().from(users).where(eq(users.id, validAssigneeId)).limit(1);
          if (assigneeExists.length === 0) {
            validAssigneeId = null;
          }
        }

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
            creatorId: validCreatorId,
            assigneeId: validAssigneeId,
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
              assigneeId: validAssigneeId,
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
