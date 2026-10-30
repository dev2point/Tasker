import { describe, it, expect } from 'vitest';
import { Task, TaskNotification } from '@/types/task';
import { User } from '@/types/user';
import {
  canUserViewTask,
  canUserCompleteTask,
  canUserEditTask,
  canUserDeleteTask,
  filterTasksForUser,
  filterNotificationsForUser,
  buildAdminActionNotification,
} from '@/lib/rbac';

describe('RBAC & Task Visibility Scoping Logic', () => {
  const adminUser: User = {
    id: 'user-admin',
    name: 'Maître Admin',
    email: 'admin@cabinet.fr',
    role: 'admin',
    department: 'Direction',
  };

  const memberAlice: User = {
    id: 'user-alice',
    name: 'Alice Juriste',
    email: 'alice@cabinet.fr',
    role: 'member',
    department: 'Droit des Affaires',
  };

  // User without department / team (as reported by user)
  const memberNoDept: User = {
    id: 'user-bob-no-dept',
    name: 'Bob Collaborateur',
    email: 'bob@cabinet.fr',
    role: 'member',
    department: undefined,
  };

  const sampleTasks: Task[] = [
    // 1. Task created by Admin, assigned to Alice
    {
      id: 'task-admin-to-alice',
      title: 'Audit fiscal holding',
      dueDate: '2026-11-01',
      priority: 'high',
      category: 'fiscalite',
      completed: false,
      creatorId: 'user-admin',
      creatorName: 'Maître Admin',
      assigneeId: 'user-alice',
      assigneeName: 'Alice Juriste',
      reminderMinutesBefore: 15,
      recurrence: 'none',
      tags: [],
      subtasks: [],
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    },
    // 2. Task created by Bob (no dept), assigned to himself
    {
      id: 'task-bob-personal',
      title: 'Recherche jurisprudence TVA',
      dueDate: '2026-11-05',
      priority: 'medium',
      category: 'fiscalite',
      completed: false,
      creatorId: 'user-bob-no-dept',
      creatorName: 'Bob Collaborateur',
      assigneeId: 'user-bob-no-dept',
      assigneeName: 'Bob Collaborateur',
      reminderMinutesBefore: 30,
      recurrence: 'none',
      tags: [],
      subtasks: [],
      createdAt: '2026-10-02T10:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
    },
    // 3. Task created by Admin, assigned to Bob
    {
      id: 'task-admin-to-bob',
      title: 'Dossier constitution SARL',
      dueDate: '2026-11-10',
      priority: 'urgent',
      category: 'societes',
      completed: false,
      creatorId: 'user-admin',
      creatorName: 'Maître Admin',
      assigneeId: 'user-bob-no-dept',
      assigneeName: 'Bob Collaborateur',
      reminderMinutesBefore: 15,
      recurrence: 'none',
      tags: [],
      subtasks: [],
      createdAt: '2026-10-03T10:00:00Z',
      updatedAt: '2026-10-03T10:00:00Z',
    },
    // 4. Confidential task created by Admin, assigned to another lawyer (Charlie)
    {
      id: 'task-admin-confidential',
      title: 'Contentieux commercial confidentiel',
      dueDate: '2026-11-15',
      priority: 'urgent',
      category: 'contentieux',
      completed: false,
      creatorId: 'user-admin',
      creatorName: 'Maître Admin',
      assigneeId: 'user-charlie',
      assigneeName: 'Charlie Avocat',
      reminderMinutesBefore: 0,
      recurrence: 'none',
      tags: [],
      subtasks: [],
      createdAt: '2026-10-04T10:00:00Z',
      updatedAt: '2026-10-04T10:00:00Z',
    },
  ];

  describe('1. Visibility & Scoping', () => {
    it('isolates a user without department strictly to their created or assigned tasks', () => {
      const bobVisible = filterTasksForUser(sampleTasks, memberNoDept);
      const bobTaskIds = bobVisible.map((t) => t.id);

      // Bob MUST see his own personal task
      expect(bobTaskIds).toContain('task-bob-personal');
      // Bob MUST see the task assigned to him by admin
      expect(bobTaskIds).toContain('task-admin-to-bob');
      // Bob MUST NOT see task assigned to Alice
      expect(bobTaskIds).not.toContain('task-admin-to-alice');
      // Bob MUST NOT see confidential task assigned to Charlie
      expect(bobTaskIds).not.toContain('task-admin-confidential');
      expect(bobVisible).toHaveLength(2);
    });

    it('gives the administrator full access to all tasks across the company', () => {
      const adminVisible = filterTasksForUser(sampleTasks, adminUser);
      expect(adminVisible).toHaveLength(sampleTasks.length);
      expect(adminVisible.map((t) => t.id)).toEqual(
        expect.arrayContaining([
          'task-admin-to-alice',
          'task-bob-personal',
          'task-admin-to-bob',
          'task-admin-confidential',
        ])
      );
    });

    it('prevents unauthenticated access', () => {
      const anonymousVisible = filterTasksForUser(sampleTasks, null);
      expect(anonymousVisible).toHaveLength(0);
    });
  });

  describe('2. Completion Permissions', () => {
    it('allows assignee to mark their assigned task as completed', () => {
      const bobTask = sampleTasks.find((t) => t.id === 'task-admin-to-bob')!;
      expect(canUserCompleteTask(bobTask, memberNoDept)).toBe(true);
    });

    it('allows creator to mark their created task as completed', () => {
      const bobPersonalTask = sampleTasks.find((t) => t.id === 'task-bob-personal')!;
      expect(canUserCompleteTask(bobPersonalTask, memberNoDept)).toBe(true);
    });

    it('allows admin to mark ANY task as completed (full power)', () => {
      sampleTasks.forEach((task) => {
        expect(canUserCompleteTask(task, adminUser)).toBe(true);
      });
    });

    it('forbids standard user from marking someone elses task as completed', () => {
      const aliceTask = sampleTasks.find((t) => t.id === 'task-admin-to-alice')!;
      expect(canUserCompleteTask(aliceTask, memberNoDept)).toBe(false);
    });
  });

  describe('3. Deletion Permissions (Critical Security)', () => {
    it('prevents an assignee from deleting a task created by an administrator', () => {
      const adminTaskForBob = sampleTasks.find((t) => t.id === 'task-admin-to-bob')!;
      // Even though Bob is the assignee, he didn't create it and is not admin!
      expect(canUserDeleteTask(adminTaskForBob, memberNoDept)).toBe(false);
    });

    it('allows a creator to delete their own created task', () => {
      const bobPersonalTask = sampleTasks.find((t) => t.id === 'task-bob-personal')!;
      expect(canUserDeleteTask(bobPersonalTask, memberNoDept)).toBe(true);
    });

    it('allows the administrator to delete ANY task (full power)', () => {
      sampleTasks.forEach((task) => {
        expect(canUserDeleteTask(task, adminUser)).toBe(true);
      });
    });

    it('strictly forbids standard users from deleting tasks belonging to others', () => {
      const aliceTask = sampleTasks.find((t) => t.id === 'task-admin-to-alice')!;
      expect(canUserDeleteTask(aliceTask, memberNoDept)).toBe(false);
    });
  });

  describe('4. Admin Action Notifications', () => {
    it('generates a notification when admin updates a task belonging to a user', () => {
      const bobTask = sampleTasks.find((t) => t.id === 'task-admin-to-bob')!;
      const notif = buildAdminActionNotification(
        'admin_update',
        bobTask,
        adminUser,
        memberNoDept.id,
        "L'administrateur a reporté votre échéance au 2026-11-20."
      );

      expect(notif.targetUserId).toBe(memberNoDept.id);
      expect(notif.actionBy).toBe(adminUser.id);
      expect(notif.type).toBe('admin_update');
      expect(notif.message).toContain("L'administrateur a reporté votre échéance");
    });

    it('generates a completion notification when admin validates a user task', () => {
      const bobTask = sampleTasks.find((t) => t.id === 'task-admin-to-bob')!;
      const notif = buildAdminActionNotification(
        'admin_completed',
        bobTask,
        adminUser,
        memberNoDept.id
      );

      expect(notif.type).toBe('admin_completed');
      expect(notif.message).toContain('Maître Admin a marqué votre tâche « Dossier constitution SARL » comme terminée');
    });

    it('generates a deletion notification when admin deletes a user task', () => {
      const bobPersonalTask = sampleTasks.find((t) => t.id === 'task-bob-personal')!;
      const notif = buildAdminActionNotification(
        'admin_delete',
        bobPersonalTask,
        adminUser,
        memberNoDept.id
      );

      expect(notif.type).toBe('admin_delete');
      expect(notif.message).toContain('Maître Admin a supprimé la tâche « Recherche jurisprudence TVA »');
    });

    it('filters notifications so that users only see notifications targeted to them or their visible tasks', () => {
      const notifications: TaskNotification[] = [
        {
          id: 'n-1',
          taskId: 'task-admin-to-bob',
          taskTitle: 'Dossier constitution SARL',
          dueDate: '2026-11-10',
          triggerTime: '2026-10-21T10:00:00Z',
          read: false,
          type: 'admin_update',
          targetUserId: 'user-bob-no-dept',
          message: 'Admin updated your task',
        },
        {
          id: 'n-2',
          taskId: 'task-admin-to-alice',
          taskTitle: 'Audit fiscal holding',
          dueDate: '2026-11-01',
          triggerTime: '2026-10-21T10:00:00Z',
          read: false,
          type: 'admin_update',
          targetUserId: 'user-alice',
          message: 'Admin updated Alice task',
        },
      ];

      const visibleTaskIdsForBob = new Set(['task-admin-to-bob', 'task-bob-personal']);
      const bobNotifications = filterNotificationsForUser(notifications, memberNoDept, visibleTaskIdsForBob);

      expect(bobNotifications).toHaveLength(1);
      expect(bobNotifications[0].id).toBe('n-1');
      expect(bobNotifications[0].targetUserId).toBe('user-bob-no-dept');
    });
  });

  describe('Rate Limiter (SEC-08)', () => {
    it('allows requests within threshold and blocks requests exceeding limit', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const testKey = `test-user-${Date.now()}`;

      // Max 3 requests in window
      const res1 = checkRateLimit(testKey, { windowMs: 10000, max: 3 });
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = checkRateLimit(testKey, { windowMs: 10000, max: 3 });
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = checkRateLimit(testKey, { windowMs: 10000, max: 3 });
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);

      // 4th request must be blocked
      const res4 = checkRateLimit(testKey, { windowMs: 10000, max: 3 });
      expect(res4.success).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.resetMs).toBeGreaterThan(0);
    });
  });
});
