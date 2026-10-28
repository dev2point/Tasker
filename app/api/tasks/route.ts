import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks, users, activityLogs } from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';
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
    
    // RBAC: Admin sees all tasks; regular users only see tasks they created or that are assigned to them
    let rows;
    if (user.role === 'admin') {
      rows = await db.select().from(tasks);
    } else {
      rows = await db
        .select()
        .from(tasks)
        .where(
          or(
            eq(tasks.creatorId, user.id),
            eq(tasks.assigneeId, user.id)
          )
        );
    }

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

    // Check if task exists to verify RBAC rights on update
    const existingRows = await db.select().from(tasks).where(eq(tasks.id, taskData.id)).limit(1);
    const existing = existingRows[0];
    const isAdmin = user.role === 'admin';

    if (existing) {
      const isCreator = existing.creatorId === user.id;
      const isAssignee = existing.assigneeId === user.id;

      if (!isAdmin && !isCreator && !isAssignee) {
        return NextResponse.json(
          { error: "Action non autorisée. Vous n'avez pas les droits pour modifier cette tâche." },
          { status: 403 }
        );
      }

      // Log admin modifications on user's tasks
      if (isAdmin && (existing.creatorId !== user.id || existing.assigneeId !== user.id)) {
        try {
          const actionKind = taskData.completed !== existing.completed ? 'completed' : 'updated';
          await db.insert(activityLogs).values({
            id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            taskId: existing.id,
            userId: user.id,
            userName: user.name,
            action: actionKind,
            details: `L'administrateur ${user.name} a ${actionKind === 'completed' ? 'marqué comme terminée' : 'modifié'} la tâche « ${existing.title} »`,
            createdAt: new Date(),
          });
        } catch (logErr) {
          console.warn('Activity log insert skipped:', logErr);
        }
      }
    }

    let validCreatorId = existing ? existing.creatorId : (taskData.creatorId || user.id);
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

    // RBAC: Verify if task exists and check if user is admin or creator
    const existingRows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (existingRows.length > 0) {
      const existing = existingRows[0];
      const isAdmin = user.role === 'admin';
      const isCreator = existing.creatorId === user.id;

      if (!isAdmin && !isCreator) {
        return NextResponse.json(
          { error: "Action non autorisée. Seul le créateur ou l'administrateur peut supprimer cette tâche." },
          { status: 403 }
        );
      }

      if (isAdmin && existing.creatorId && existing.creatorId !== user.id) {
        try {
          await db.insert(activityLogs).values({
            id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            taskId: existing.id,
            userId: user.id,
            userName: user.name,
            action: 'updated',
            details: `L'administrateur ${user.name} a supprimé la tâche « ${existing.title} »`,
            createdAt: new Date(),
          });
        } catch (e) {
          console.warn('Activity log deletion trace skipped:', e);
        }
      }
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
