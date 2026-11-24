import type { TaskNotification } from '@/types/task';

export interface WebPushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  notificationId: string;
}

export function buildWebPushPayload(notification: TaskNotification): WebPushPayload {
  return {
    title: 'Planit — nouvelle notification',
    body: notification.message || `${notification.actionByName || 'Planit'} a mis à jour « ${notification.taskTitle} ».`,
    url: `/?notificationId=${encodeURIComponent(notification.id)}`,
    tag: `planit-${notification.id}`.slice(0, 120),
    notificationId: notification.id,
  };
}
