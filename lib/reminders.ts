import { Task, TaskNotification } from '@/types/task';

// Parse task due timestamp (Date object)
export function getTaskDueDateTime(task: Task): Date {
  const [year, month, day] = task.dueDate.split('-').map(Number);
  let hours = 23;
  let minutes = 59;
  
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      hours = h;
      minutes = m;
    }
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

// Calculate when the reminder should trigger
export function getReminderTriggerTime(task: Task): Date | null {
  if (task.reminderMinutesBefore < 0) return null; // Disabled
  const dueDateTime = getTaskDueDateTime(task);
  const triggerMs = dueDateTime.getTime() - task.reminderMinutesBefore * 60 * 1000;
  return new Date(triggerMs);
}

// Check whether a task is overdue
export function isTaskOverdue(task: Task): boolean {
  if (task.completed) return false;
  const now = new Date();
  const dueDateTime = getTaskDueDateTime(task);
  return dueDateTime.getTime() < now.getTime();
}

// Format relative date and time in French
export function formatDueDateFrench(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let dateFormatted = '';
  if (diffDays === 0) {
    dateFormatted = "Aujourd'hui";
  } else if (diffDays === 1) {
    dateFormatted = 'Demain';
  } else if (diffDays === -1) {
    dateFormatted = 'Hier';
  } else if (diffDays > 1 && diffDays < 7) {
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    dateFormatted = dayNames[target.getDay()];
  } else {
    dateFormatted = target.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  if (timeStr) {
    return `${dateFormatted} à ${timeStr}`;
  }
  return dateFormatted;
}

// Request native browser notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// Send browser notification
export function sendBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch {}
  }
}

// Compute next recurrence date
export function getNextRecurrenceDate(dateStr: string, recurrence: Task['recurrence']): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekdays': {
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sun and Sat
      break;
    }
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return dateStr;
  }

  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  const newD = String(date.getDate()).padStart(2, '0');
  return `${newY}-${newM}-${newD}`;
}

// Check which tasks need reminder triggers right now
export function evaluateReminders(
  tasks: Task[],
  nowMs: number = Date.now()
): { triggeredTasks: Task[]; newNotifications: TaskNotification[] } {
  const triggeredTasks: Task[] = [];
  const newNotifications: TaskNotification[] = [];

  for (const task of tasks) {
    if (task.completed || task.reminderMinutesBefore < 0 || task.reminderTriggered) {
      continue;
    }

    const triggerTime = getReminderTriggerTime(task);
    if (!triggerTime) continue;

    // If trigger time has been reached or passed within reasonable window (past 24h)
    const triggerMs = triggerTime.getTime();
    if (nowMs >= triggerMs && nowMs <= triggerMs + 24 * 60 * 60 * 1000) {
      triggeredTasks.push({
        ...task,
        reminderTriggered: true,
        reminderTriggeredAt: new Date(nowMs).toISOString(),
      });

      const dueDateTime = getTaskDueDateTime(task);
      const isDueNow = Math.abs(nowMs - dueDateTime.getTime()) < 5 * 60 * 1000;
      const isOverdueNow = nowMs > dueDateTime.getTime();

      newNotifications.push({
        id: 'notif-' + task.id + '-' + nowMs,
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        triggerTime: new Date(nowMs).toISOString(),
        read: false,
        type: isOverdueNow ? 'overdue' : isDueNow ? 'due' : 'reminder',
      });
    }
  }

  return { triggeredTasks, newNotifications };
}
