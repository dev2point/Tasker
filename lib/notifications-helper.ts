import { TaskNotification, TaskStatus } from '@/types/task';

export interface TaskSnapshotForNotifications {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string | null;
  creatorId?: string | null;
  assigneeId?: string | null;
  completed?: boolean;
  status?: TaskStatus | string | null;
}

export interface NotificationActor {
  id: string;
  name: string;
}

export interface NotificationDraft {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  dueTime?: string;
  type: 'assigned' | 'task_completed';
  message: string;
  triggerTime: string;
  read: boolean;
}

/**
 * Detects assignment, reassignment, and completion transitions between previous and next task states
 * and builds server-authoritative notification records.
 *
 * Rules:
 * - Assignment / Reassignment: When `nextTask.assigneeId` is set, changed compared to `previousTask.assigneeId`,
 *   and differs from `actor.id`, notify the new assignee (`type: 'assigned'`).
 * - Completion: When task transitions from non-completed to completed (`completed === true` or `status === 'completed'`),
 *   and `creatorId` is present and differs from `actor.id`, notify the creator (`type: 'task_completed'`).
 */
export function detectTaskNotificationTransitions(params: {
  previousTask?: TaskSnapshotForNotifications | null;
  nextTask: TaskSnapshotForNotifications;
  actor: NotificationActor;
  nowIso?: string;
}): NotificationDraft[] {
  const { previousTask, nextTask, actor, nowIso = new Date().toISOString() } = params;
  const drafts: NotificationDraft[] = [];

  const prevAssigneeId = previousTask?.assigneeId || null;
  const nextAssigneeId = nextTask.assigneeId || null;

  // 1. Assignment or Reassignment notification to the new assignee
  if (nextAssigneeId && nextAssigneeId !== prevAssigneeId && nextAssigneeId !== actor.id) {
    const isReassignment = Boolean(prevAssigneeId);
    const message = isReassignment
      ? `${actor.name} vous a réassigné la tâche « ${nextTask.title} ».`
      : `${actor.name} vous a assigné la tâche « ${nextTask.title} ».`;

    drafts.push({
      id: `notif-assign-${nextTask.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId: nextAssigneeId,
      actorId: actor.id,
      actorName: actor.name,
      taskId: nextTask.id,
      taskTitle: nextTask.title,
      dueDate: nextTask.dueDate,
      dueTime: nextTask.dueTime || undefined,
      type: 'assigned',
      message,
      triggerTime: nowIso,
      read: false,
    });
  }

  // 2. Completion notification back to the creator
  const wasCompleted = Boolean(previousTask?.completed || previousTask?.status === 'completed');
  const isNowCompleted = Boolean(nextTask.completed || nextTask.status === 'completed');
  const creatorId = previousTask?.creatorId || nextTask.creatorId || null;

  if (!wasCompleted && isNowCompleted && creatorId && creatorId !== actor.id) {
    drafts.push({
      id: `notif-complete-${nextTask.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientId: creatorId,
      actorId: actor.id,
      actorName: actor.name,
      taskId: nextTask.id,
      taskTitle: nextTask.title,
      dueDate: nextTask.dueDate,
      dueTime: nextTask.dueTime || undefined,
      type: 'task_completed',
      message: `${actor.name} a marqué la tâche « ${nextTask.title} » comme terminée.`,
      triggerTime: nowIso,
      read: false,
    });
  }

  return drafts;
}

export function toTaskNotification(draft: NotificationDraft): TaskNotification {
  return {
    id: draft.id,
    taskId: draft.taskId,
    taskTitle: draft.taskTitle,
    dueDate: draft.dueDate,
    dueTime: draft.dueTime,
    triggerTime: draft.triggerTime,
    read: draft.read,
    type: draft.type,
    targetUserId: draft.recipientId,
    actionBy: draft.actorId,
    actionByName: draft.actorName,
    message: draft.message,
  };
}

/**
 * Merges incoming notifications (server/SSE/local) without duplicates, preserving newest triggerTime.
 */
export function mergeNotificationsById(
  existing: TaskNotification[],
  incoming: TaskNotification[]
): TaskNotification[] {
  const byId = new Map<string, TaskNotification>();

  for (const item of existing) {
    if (item && item.id) {
      byId.set(item.id, item);
    }
  }

  for (const item of incoming) {
    if (!item || !item.id) continue;
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
    } else {
      byId.set(item.id, {
        ...prev,
        ...item,
        read: Boolean(prev.read || item.read),
      });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime()
  );
}
