import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { tasks, users, workspaces } from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';
import { Task } from '@/types/task';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeTaskForPostgres } from '@/lib/db/task-sanitize';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier pour synchroniser vos tâches.' },
      { status: 401 }
    );
  }

  // SEC-08: Rate limiting (60 sync requests per minute per user)
  const rateLimitKey = `sync:${user.id}`;
  const rateCheck = checkRateLimit(rateLimitKey, { windowMs: 60000, max: 60 });
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes de synchronisation. Veuillez patienter un instant.' },
      { status: 429 }
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

    const isAdmin = user.role === 'admin' || user.role === 'manager';

    if (Array.isArray(clientTasks) && clientTasks.length > 0) {
      for (const t of clientTasks) {
        // SEC-01 RBAC check: Non-admins cannot overwrite or hijack tasks owned by someone else
        const existingRows = await db.select().from(tasks).where(eq(tasks.id, t.id)).limit(1);
        const existing = existingRows[0];

        if (existing && !isAdmin) {
          const isCreator = existing.creatorId === user.id || (resolvedAuthUserId && existing.creatorId === resolvedAuthUserId);
          const isAssignee = existing.assigneeId === user.id || (resolvedAuthUserId && existing.assigneeId === resolvedAuthUserId);
          if (!isCreator && !isAssignee) {
            // Skip unauthorized task modification
            continue;
          }
        }

        let validCreatorId: string | null = existing
          ? existing.creatorId
          : (isAdmin && t.creatorId ? t.creatorId : (resolvedAuthUserId || user.id));
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

        let validAssigneeId: string | null = t.assigneeId || null;
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

        let validWorkspaceId: string | null = t.workspaceId || null;
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

        const pgTask = sanitizeTaskForPostgres(t, {
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
      }
    }

    // SEC-01: Retrieve RBAC-filtered synced dataset (Admins see all; regular members only see their own tasks)
    let serverRows;
    if (isAdmin) {
      serverRows = await db.select().from(tasks);
    } else {
      serverRows = await db
        .select()
        .from(tasks)
        .where(or(eq(tasks.creatorId, user.id), eq(tasks.assigneeId, user.id)));
    }
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
