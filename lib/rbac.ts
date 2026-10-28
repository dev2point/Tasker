import { Task, TaskNotification } from '@/types/task';
import { User } from '@/types/user';

/**
 * Checks if a user has permission to view a specific task.
 * 
 * Rules:
 * - Unauthenticated: cannot view.
 * - Admin: can view 100% of all tasks across the organization.
 * - Standard user (member/guest, with or without department):
 *   Can ONLY view tasks they created or that are assigned to them.
 */
export function canUserViewTask(task: Task, user: User | null): boolean {
  if (!user) return false;

  // 1. Administrators have global visibility
  if (user.role === 'admin') {
    return true;
  }

  // 2. Creator of the task has full visibility
  if (task.creatorId && task.creatorId === user.id) {
    return true;
  }

  // 3. Assignee of the task has visibility
  if (task.assigneeId && task.assigneeId === user.id) {
    return true;
  }

  // 4. Fallback for legacy tasks or email/name matching
  if (task.assigneeName) {
    const cleanAssignee = task.assigneeName.trim().toLowerCase();
    if (
      cleanAssignee === user.name?.trim().toLowerCase() ||
      (user.email && cleanAssignee === user.email.trim().toLowerCase())
    ) {
      return true;
    }
  }

  // 5. If creatorName matches for legacy tasks without creatorId
  if (!task.creatorId && task.creatorName) {
    const cleanCreator = task.creatorName.trim().toLowerCase();
    if (
      cleanCreator === user.name?.trim().toLowerCase() ||
      (user.email && cleanCreator === user.email.trim().toLowerCase())
    ) {
      return true;
    }
  }

  // Otherwise, user without department or standard member is isolated
  return false;
}

/**
 * Checks if a user has permission to toggle completion or change status of a task.
 * 
 * Rules:
 * - Admin: can complete any task.
 * - Assignee: can complete tasks assigned to them.
 * - Creator: can complete tasks they created.
 * - Others: forbidden.
 */
export function canUserCompleteTask(task: Task, user: User | null): boolean {
  if (!user) return false;

  // 1. Admin full powers
  if (user.role === 'admin') return true;

  // 2. Assignee can mark as completed
  if (task.assigneeId && task.assigneeId === user.id) return true;

  if (task.assigneeName) {
    const cleanAssignee = task.assigneeName.trim().toLowerCase();
    if (
      cleanAssignee === user.name?.trim().toLowerCase() ||
      (user.email && cleanAssignee === user.email.trim().toLowerCase())
    ) {
      return true;
    }
  }

  // 3. Creator can mark as completed
  if (task.creatorId && task.creatorId === user.id) return true;

  if (!task.creatorId && task.creatorName) {
    const cleanCreator = task.creatorName.trim().toLowerCase();
    if (
      cleanCreator === user.name?.trim().toLowerCase() ||
      (user.email && cleanCreator === user.email.trim().toLowerCase())
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a user has permission to edit task details (title, dates, priority, etc.).
 * 
 * Rules:
 * - Admin: can edit any task.
 * - Creator: can edit their own tasks.
 * - Assignee: can edit subtasks / progress of their assigned tasks.
 * - Others: forbidden.
 */
export function canUserEditTask(task: Task, user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (task.creatorId && task.creatorId === user.id) return true;
  if (task.assigneeId && task.assigneeId === user.id) return true;

  if (task.assigneeName && task.assigneeName.trim().toLowerCase() === user.name?.trim().toLowerCase()) {
    return true;
  }
  if (!task.creatorId && task.creatorName && task.creatorName.trim().toLowerCase() === user.name?.trim().toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Checks if a user has permission to DELETE a task.
 * 
 * Rules:
 * - Admin: can delete ANY task.
 * - Creator: can delete tasks they created.
 * - Assignee: CANNOT delete tasks created by others (they can only complete or report).
 * - Standard members: CANNOT delete tasks belonging to others.
 */
export function canUserDeleteTask(task: Task, user: User | null): boolean {
  if (!user) return false;

  // 1. Admin has global deletion authority
  if (user.role === 'admin') return true;

  // 2. Creator can delete their own task
  if (task.creatorId && task.creatorId === user.id) return true;

  if (!task.creatorId && task.creatorName) {
    const cleanCreator = task.creatorName.trim().toLowerCase();
    if (
      cleanCreator === user.name?.trim().toLowerCase() ||
      (user.email && cleanCreator === user.email.trim().toLowerCase())
    ) {
      return true;
    }
  }

  // 3. Strict: Even an assignee cannot delete someone else's task!
  return false;
}

/**
 * Filters a list of tasks for the current user according to RBAC scoping rules.
 */
export function filterTasksForUser(tasks: Task[], user: User | null): Task[] {
  if (!user) return [];
  if (user.role === 'admin') return tasks;
  return tasks.filter((t) => canUserViewTask(t, user));
}

/**
 * Filters notifications for the current user.
 * Displays:
 * - Targeted notifications specifically for user.id
 * - Legacy notifications matching tasks the user is allowed to view
 */
export function filterNotificationsForUser(
  notifications: TaskNotification[],
  user: User | null,
  visibleTaskIds: Set<string>
): TaskNotification[] {
  if (!user) return [];

  return notifications.filter((notif) => {
    // 1. Direct targeted notification
    if (notif.targetUserId) {
      return notif.targetUserId === user.id;
    }
    // 2. Notification tied to a visible task
    if (notif.taskId && visibleTaskIds.has(notif.taskId)) {
      return true;
    }
    // 3. Admin can view all audit/admin notifications
    if (user.role === 'admin') {
      return true;
    }
    return false;
  });
}

/**
 * Helper to build an automated notification when an admin updates or deletes a user's task.
 */
export function buildAdminActionNotification(
  actionType: 'admin_update' | 'admin_completed' | 'admin_delete',
  task: { id: string; title: string; dueDate?: string; dueTime?: string },
  adminUser: User,
  targetUserId: string,
  customDetails?: string
): TaskNotification {
  const nowIso = new Date().toISOString();
  let defaultMessage = '';

  switch (actionType) {
    case 'admin_completed':
      defaultMessage = `L'administrateur ${adminUser.name} a marqué votre tâche « ${task.title} » comme terminée.`;
      break;
    case 'admin_delete':
      defaultMessage = `L'administrateur ${adminUser.name} a supprimé la tâche « ${task.title} ».`;
      break;
    case 'admin_update':
    default:
      defaultMessage = customDetails || `L'administrateur ${adminUser.name} a modifié les détails de votre tâche « ${task.title} ».`;
      break;
  }

  return {
    id: `notif-admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    taskId: task.id,
    taskTitle: task.title,
    dueDate: task.dueDate || nowIso.split('T')[0],
    dueTime: task.dueTime,
    triggerTime: nowIso,
    read: false,
    type: actionType,
    targetUserId,
    actionBy: adminUser.id,
    actionByName: adminUser.name,
    message: defaultMessage,
  };
}
