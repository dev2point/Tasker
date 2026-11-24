import { describe, expect, it } from 'vitest';
import { buildWebPushPayload } from '@/lib/web-push/payload';
import type { TaskNotification } from '@/types/task';

const notification: TaskNotification = {
  id: 'notif-correction-1',
  taskId: 'dossier-1',
  taskTitle: 'DOS-2026-FIS-481 — Audit',
  dueDate: '2026-11-30',
  triggerTime: '2026-11-24T10:00:00.000Z',
  read: false,
  type: 'assigned',
  targetUserId: 'user-1',
  actionBy: 'user-2',
  actionByName: 'Julien Morel',
  message: 'Julien Morel a demandé des corrections sur le dossier « DOS-2026-FIS-481 ».',
};

describe('buildWebPushPayload', () => {
  it('builds a same-origin payload with a stable tag', () => {
    expect(buildWebPushPayload(notification)).toEqual({
      title: 'Planit — nouvelle notification',
      body: notification.message,
      url: '/?notificationId=notif-correction-1',
      tag: 'planit-notif-correction-1',
      notificationId: 'notif-correction-1',
    });
  });
});
