import { Task } from '@/types/task';
import { normalizeTaskStatus } from '@/lib/constants';

export function toValidDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function sanitizeTaskForPostgres(
  taskData: Partial<Task>,
  ids: {
    workspaceId: string | null;
    creatorId: string | null;
    assigneeId: string | null;
  }
) {
  const now = new Date();
  const todayFallback = now.toISOString().split('T')[0];
  const safeStatus = normalizeTaskStatus(taskData.status, Boolean(taskData.completed));
  const completed = safeStatus === 'completed';
  const completedAt = completed ? toValidDateOrNull(taskData.completedAt) ?? now : null;
  const reminderTriggered = Boolean(taskData.reminderTriggered);
  const reminderTriggeredAt = toValidDateOrNull(taskData.reminderTriggeredAt);
  const reminderMinutes = Number(taskData.reminderMinutesBefore);

  const safeId = String(taskData.id || `task-${Date.now()}`).slice(0, 64);
  const safeTitle = String(taskData.title || 'Nouvelle tâche').trim().slice(0, 500) || 'Nouvelle tâche';
  const safeDueDate = String(taskData.dueDate || todayFallback).slice(0, 32);
  const safeDueTime = taskData.dueTime ? String(taskData.dueTime).slice(0, 16) : null;
  const safePriority = String(taskData.priority || 'medium').slice(0, 32);
  const safeCategory = String(taskData.category || 'work').slice(0, 64);
  const safeRecurrence = String(taskData.recurrence || 'none').slice(0, 32);
  const safeColor = taskData.color ? String(taskData.color).slice(0, 32) : null;

  return {
    id: safeId,
    title: safeTitle,
    description: taskData.description ? String(taskData.description) : null,
    dueDate: safeDueDate,
    dueTime: safeDueTime,
    priority: safePriority,
    status: safeStatus,
    category: safeCategory,
    completed,
    completedAt,
    workspaceId: ids.workspaceId,
    creatorId: ids.creatorId,
    assigneeId: ids.assigneeId,
    reminderMinutesBefore: Number.isFinite(reminderMinutes) ? reminderMinutes : 15,
    reminderTriggered,
    reminderDismissed: Boolean(taskData.reminderDismissed),
    reminderTriggeredAt,
    recurrence: safeRecurrence,
    tags: Array.isArray(taskData.tags) ? taskData.tags.map(String) : [],
    subtasks: Array.isArray(taskData.subtasks)
      ? taskData.subtasks.map((st, idx) => ({
          id: String(st?.id || `sub-${idx}`),
          title: String(st?.title || ''),
          completed: Boolean(st?.completed),
        }))
      : [],
    color: safeColor,
    createdAt: toValidDateOrNull(taskData.createdAt) ?? now,
    updatedAt: now,
  };
}
