import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks, users, workspaces, activityLogs, notifications as notificationsTable } from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';
import { Task, TaskNotification } from '@/types/task';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { isDueDateTimeInPast } from '@/lib/due-date-utils';
import { sanitizeTaskForPostgres } from '@/lib/db/task-sanitize';
import { normalizeTaskStatus } from '@/lib/constants';
import {
  detectTaskNotificationTransitions,
  toTaskNotification,
} from '@/lib/notifications-helper';
import { realtimeHub } from '@/lib/realtime-hub';

export const dynamic = 'force-dynamic';

function mapDbTaskToDomain(
  r: typeof tasks.$inferSelect,
  userDirectory: Map<string, { name: string; image?: string | null }>
): Task {
  const creatorInfo = r.creatorId ? userDirectory.get(r.creatorId) : undefined;
  const assigneeInfo = r.assigneeId ? userDirectory.get(r.assigneeId) : undefined;
  const status = normalizeTaskStatus(r.status, r.completed);

  return {
    id: r.id,
    title: r.title,
    description: r.description || undefined,
    dueDate: r.dueDate,
    dueTime: r.dueTime || undefined,
    priority: r.priority as Task['priority'],
    category: r.category,
    completed: status === 'completed',
    completedAt: r.completedAt ? r.completedAt.toISOString() : undefined,
    workspaceId: r.workspaceId || undefined,
    creatorId: r.creatorId || undefined,
    creatorName: creatorInfo?.name || undefined,
    assigneeId: r.assigneeId || undefined,
    assigneeName: assigneeInfo?.name || undefined,
    assigneeAvatar: assigneeInfo?.image || undefined,
    reminderMinutesBefore: r.reminderMinutesBefore,
    reminderTriggered: r.reminderTriggered || false,
    reminderDismissed: r.reminderDismissed || false,
    reminderTriggeredAt: r.reminderTriggeredAt ? r.reminderTriggeredAt.toISOString() : undefined,
    recurrence: r.recurrence as Task['recurrence'],
    tags: Array.isArray(r.tags) ? r.tags : [],
    subtasks: Array.isArray(r.subtasks) ? r.subtasks : [],
    color: r.color || undefined,
    status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

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

    // Fetch user names once for resolving creatorName / assigneeName cleanly
    const allUsers = await db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(users);
    const userDirectory = new Map<string, { name: string; image?: string | null }>(
      allUsers.map((u) => [u.id, { name: u.name, image: u.image }])
    );

    // RBAC: Admin sees all tasks; regular users only see tasks they created or that are assigned to them
    let rows;
    if (user.role === 'admin') {
      rows = await db.select().from(tasks);
    } else {
      rows = await db
        .select()
        .from(tasks)
        .where(or(eq(tasks.creatorId, user.id), eq(tasks.assigneeId, user.id)));
    }

    const formatted: Task[] = rows.map((r) => mapDbTaskToDomain(r, userDirectory));

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

    // Ensure authenticated user exists in the unified "user" table without tripping email unique constraints
    const existingAuthUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    let resolvedAuthUserId: string | null = existingAuthUser[0]?.id ?? null;

    if (!resolvedAuthUserId) {
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
        .onConflictDoNothing();

      const afterInsert = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (afterInsert[0]?.id) {
        resolvedAuthUserId = afterInsert[0].id;
      } else if (user.email) {
        const byEmail = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        resolvedAuthUserId = byEmail[0]?.id ?? null;
      }
    }

    // Check if task exists to verify RBAC rights on update
    const existingRows = await db.select().from(tasks).where(eq(tasks.id, taskData.id)).limit(1);
    const existing = existingRows[0];
    const isAdmin = user.role === 'admin';

    if (existing) {
      const isCreator =
        existing.creatorId === user.id || (resolvedAuthUserId && existing.creatorId === resolvedAuthUserId);
      const isAssignee =
        existing.assigneeId === user.id || (resolvedAuthUserId && existing.assigneeId === resolvedAuthUserId);

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
            userId: resolvedAuthUserId,
            userName: user.name,
            action: actionKind,
            details: `L'administrateur ${user.name} a ${actionKind === 'completed' ? 'marqué comme terminée' : 'modifié'} la tâche « ${existing.title} »`,
            createdAt: new Date(),
          });
        } catch (logErr) {
          console.warn('Activity log insert skipped:', logErr);
        }
      }
    } else {
      // Nouvelle tâche : interdiction stricte d'associer une date/heure passée
      if (isDueDateTimeInPast(taskData.dueDate, taskData.dueTime)) {
        return NextResponse.json(
          { error: "L'échéance d'une nouvelle tâche ne peut pas être fixée dans le passé." },
          { status: 400 }
        );
      }
    }

    let validCreatorId: string | null = existing
      ? existing.creatorId
      : taskData.creatorId || resolvedAuthUserId || user.id;
    if (validCreatorId) {
      const creatorExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, validCreatorId))
        .limit(1);
      if (creatorExists.length === 0) {
        validCreatorId = resolvedAuthUserId;
      }
    }

    let validAssigneeId: string | null = taskData.assigneeId || null;
    if (validAssigneeId) {
      const assigneeExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, validAssigneeId))
        .limit(1);
      if (assigneeExists.length === 0) {
        validAssigneeId = null;
      }
    }

    let validWorkspaceId: string | null = taskData.workspaceId || null;
    if (validWorkspaceId) {
      const wsExists = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, validWorkspaceId))
        .limit(1);
      if (wsExists.length === 0) {
        validWorkspaceId = null;
      }
    }

    const pgTask = sanitizeTaskForPostgres(taskData, {
      workspaceId: validWorkspaceId,
      creatorId: validCreatorId,
      assigneeId: validAssigneeId,
    });

    await db
      .insert(tasks)
      .values(pgTask)
      .onConflictDoUpdate({
        target: tasks.id,
        set: {
          title: pgTask.title,
          description: pgTask.description,
          dueDate: pgTask.dueDate,
          dueTime: pgTask.dueTime,
          priority: pgTask.priority,
          status: pgTask.status,
          category: pgTask.category,
          completed: pgTask.completed,
          completedAt: pgTask.completedAt,
          assigneeId: pgTask.assigneeId,
          reminderMinutesBefore: pgTask.reminderMinutesBefore,
          reminderTriggered: pgTask.reminderTriggered,
          reminderDismissed: pgTask.reminderDismissed,
          reminderTriggeredAt: pgTask.reminderTriggeredAt,
          recurrence: pgTask.recurrence,
          subtasks: pgTask.subtasks,
          tags: pgTask.tags,
          color: pgTask.color,
          updatedAt: pgTask.updatedAt,
        },
      });

    // Resolve creator & assignee display names for task snapshot & SSE payloads
    const allUsers = await db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(users);
    const userDirectory = new Map<string, { name: string; image?: string | null }>(
      allUsers.map((u) => [u.id, { name: u.name, image: u.image }])
    );

    const savedDomainTask: Task = {
      id: pgTask.id,
      title: pgTask.title,
      description: pgTask.description || undefined,
      dueDate: pgTask.dueDate,
      dueTime: pgTask.dueTime || undefined,
      priority: pgTask.priority as Task['priority'],
      category: pgTask.category,
      completed: pgTask.completed,
      completedAt: pgTask.completedAt ? pgTask.completedAt.toISOString() : undefined,
      workspaceId: pgTask.workspaceId || undefined,
      creatorId: pgTask.creatorId || undefined,
      creatorName: pgTask.creatorId ? userDirectory.get(pgTask.creatorId)?.name : taskData.creatorName,
      assigneeId: pgTask.assigneeId || undefined,
      assigneeName: pgTask.assigneeId ? userDirectory.get(pgTask.assigneeId)?.name : undefined,
      assigneeAvatar: pgTask.assigneeId
        ? userDirectory.get(pgTask.assigneeId)?.image || undefined
        : undefined,
      reminderMinutesBefore: pgTask.reminderMinutesBefore,
      reminderTriggered: pgTask.reminderTriggered,
      reminderDismissed: pgTask.reminderDismissed,
      reminderTriggeredAt: pgTask.reminderTriggeredAt
        ? pgTask.reminderTriggeredAt.toISOString()
        : undefined,
      recurrence: pgTask.recurrence as Task['recurrence'],
      tags: pgTask.tags,
      subtasks: pgTask.subtasks,
      color: pgTask.color || undefined,
      status: normalizeTaskStatus(pgTask.status, pgTask.completed),
      createdAt: pgTask.createdAt.toISOString(),
      updatedAt: pgTask.updatedAt.toISOString(),
    };

    // Detect assignment, reassignment & completion transitions
    const transitions = detectTaskNotificationTransitions({
      previousTask: existing
        ? {
            id: existing.id,
            title: existing.title,
            dueDate: existing.dueDate,
            dueTime: existing.dueTime,
            creatorId: existing.creatorId,
            assigneeId: existing.assigneeId,
            completed: existing.completed,
            status: existing.status,
          }
        : null,
      nextTask: {
        id: pgTask.id,
        title: pgTask.title,
        dueDate: pgTask.dueDate,
        dueTime: pgTask.dueTime,
        creatorId: pgTask.creatorId,
        assigneeId: pgTask.assigneeId,
        completed: pgTask.completed,
        status: pgTask.status,
      },
      actor: { id: resolvedAuthUserId || user.id, name: user.name },
    });

    const emittedNotifications: TaskNotification[] = [];
    for (const draft of transitions) {
      try {
        await db.insert(notificationsTable).values({
          id: draft.id,
          recipientId: draft.recipientId,
          actorId: draft.actorId,
          actorName: draft.actorName,
          taskId: draft.taskId,
          taskTitle: draft.taskTitle,
          dueDate: draft.dueDate,
          dueTime: draft.dueTime || null,
          type: draft.type,
          message: draft.message,
          read: false,
          triggerTime: new Date(draft.triggerTime),
          createdAt: new Date(draft.triggerTime),
        });
      } catch (notifErr) {
        console.warn('Notification insert skipped:', notifErr);
      }

      const taskNotif = toTaskNotification(draft);
      emittedNotifications.push(taskNotif);

      realtimeHub.broadcast({
        type: draft.type === 'assigned' ? 'TASK_ASSIGNED' : 'TASK_COMPLETED',
        actor: { id: user.id, name: user.name, role: user.role },
        targetId: pgTask.id,
        targetUserId: draft.recipientId,
        message: draft.message,
        payload: {
          notification: taskNotif,
          task: savedDomainTask,
        },
      });
    }

    // Broadcast live task update (e.g., status transitions, edits, unassignments) to creator & assignee(s)
    const visibleToUserIds = Array.from(
      new Set(
        [pgTask.creatorId, pgTask.assigneeId, existing?.assigneeId].filter(
          (id): id is string => Boolean(id)
        )
      )
    );

    if (visibleToUserIds.length > 0) {
      realtimeHub.broadcast({
        type: 'TASK_UPDATED',
        actor: { id: user.id, name: user.name, role: user.role },
        targetId: pgTask.id,
        visibleToUserIds,
        message: '',
        payload: {
          task: savedDomainTask,
          previousAssigneeId: existing?.assigneeId || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      task: savedDomainTask,
      emittedNotifications,
    });
  } catch (error: any) {
    const causeDetail = error?.cause?.message || error?.detail || undefined;
    console.error('Error saving task to PostgreSQL:', error, causeDetail ? { causeDetail } : '');
    return NextResponse.json(
      { error: causeDetail || (error instanceof Error ? error.message : 'Database error') },
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
    const existing = existingRows[0];

    if (existing) {
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

    if (existing) {
      const visibleToUserIds = Array.from(
        new Set(
          [existing.creatorId, existing.assigneeId].filter((uid): uid is string => Boolean(uid))
        )
      );
      if (visibleToUserIds.length > 0) {
        realtimeHub.broadcast({
          type: 'TASK_DELETED',
          actor: { id: user.id, name: user.name, role: user.role },
          targetId: id,
          visibleToUserIds,
          message: '',
          payload: { taskId: id },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Database error' },
      { status: 500 }
    );
  }
}

