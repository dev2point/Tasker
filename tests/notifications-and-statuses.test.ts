import { describe, it, expect } from 'vitest';
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_CONFIG,
  normalizeTaskStatus,
} from '@/lib/constants';
import { sanitizeTaskForPostgres } from '@/lib/db/task-sanitize';
import {
  detectTaskNotificationTransitions,
  toTaskNotification,
  mergeNotificationsById,
} from '@/lib/notifications-helper';
import {
  canReceiveRealtimeEvent,
  formatRealtimeAlertType,
} from '@/lib/realtime-hub';
import { filterNotificationsForUser } from '@/lib/rbac';
import type { User } from '@/types/user';

describe('Task Lifecycle Statuses & Assignment/Completion Notifications', () => {
  it('defines the 4 French lifecycle statuses and normalizes states consistently', () => {
    expect(TASK_STATUS_ORDER).toEqual(['todo', 'in_progress', 'waiting', 'completed']);
    expect(TASK_STATUS_CONFIG.todo.label).toBe('Non démarrée');
    expect(TASK_STATUS_CONFIG.in_progress.label).toBe('En cours');
    expect(TASK_STATUS_CONFIG.waiting.label).toBe('En attente');
    expect(TASK_STATUS_CONFIG.completed.label).toBe('Terminée');

    expect(normalizeTaskStatus(undefined, false)).toBe('todo');
    expect(normalizeTaskStatus('in_progress', false)).toBe('in_progress');
    expect(normalizeTaskStatus('waiting', false)).toBe('waiting');
    expect(normalizeTaskStatus('completed', false)).toBe('completed');
    expect(normalizeTaskStatus('in_progress', true)).toBe('completed');
    expect(normalizeTaskStatus('unknown_status', false)).toBe('todo');
  });

  it('sanitizes waiting and completed statuses cleanly for PostgreSQL persistence', () => {
    const waitingSanitized = sanitizeTaskForPostgres(
      {
        id: 'task-wait-1',
        title: 'Attendre justificatif client',
        status: 'waiting',
        completed: false,
        dueDate: '2026-11-25',
      },
      { workspaceId: 'ws-default', creatorId: 'usr-creator-1', assigneeId: null }
    );

    expect(waitingSanitized.status).toBe('waiting');
    expect(waitingSanitized.completed).toBe(false);
    expect(waitingSanitized.completedAt).toBeNull();

    const completedFromStatus = sanitizeTaskForPostgres(
      {
        id: 'task-done-1',
        title: 'Clôturer déclaration TVA',
        status: 'completed',
        completed: false,
        dueDate: '2026-11-25',
      },
      { workspaceId: 'ws-default', creatorId: 'usr-creator-1', assigneeId: null }
    );

    expect(completedFromStatus.status).toBe('completed');
    expect(completedFromStatus.completed).toBe(true);
    expect(completedFromStatus.completedAt).toBeInstanceOf(Date);
  });

  it('emits assignment and reassignment notifications to the assignee (unless self-assigned)', () => {
    const creator = { id: 'usr-creator', name: 'Claire Delacroix' };

    const assignedDrafts = detectTaskNotificationTransitions({
      previousTask: null,
      nextTask: {
        id: 't-101',
        title: 'Audit Liasse 2026',
        dueDate: '2026-11-30',
        dueTime: '14:00',
        creatorId: creator.id,
        assigneeId: 'usr-assignee-a',
        status: 'todo',
        completed: false,
      },
      actor: creator,
      nowIso: '2026-11-17T10:00:00.000Z',
    });

    expect(assignedDrafts).toHaveLength(1);
    expect(assignedDrafts[0].type).toBe('assigned');
    expect(assignedDrafts[0].recipientId).toBe('usr-assignee-a');
    expect(assignedDrafts[0].message).toContain('assigné');

    const reassignedDrafts = detectTaskNotificationTransitions({
      previousTask: {
        id: 't-101',
        title: 'Audit Liasse 2026',
        dueDate: '2026-11-30',
        creatorId: creator.id,
        assigneeId: 'usr-assignee-a',
        status: 'in_progress',
        completed: false,
      },
      nextTask: {
        id: 't-101',
        title: 'Audit Liasse 2026',
        dueDate: '2026-11-30',
        creatorId: creator.id,
        assigneeId: 'usr-assignee-b',
        status: 'in_progress',
        completed: false,
      },
      actor: creator,
    });

    expect(reassignedDrafts).toHaveLength(1);
    expect(reassignedDrafts[0].type).toBe('assigned');
    expect(reassignedDrafts[0].recipientId).toBe('usr-assignee-b');
    expect(reassignedDrafts[0].message).toContain('réassigné');

    const selfAssignedDrafts = detectTaskNotificationTransitions({
      previousTask: null,
      nextTask: {
        id: 't-102',
        title: 'Note interne',
        dueDate: '2026-11-30',
        creatorId: creator.id,
        assigneeId: creator.id,
        status: 'todo',
        completed: false,
      },
      actor: creator,
    });

    expect(selfAssignedDrafts).toHaveLength(0);
  });

  it('notifies the task creator when the assignee marks the task completed (and skips non-terminal statuses)', () => {
    const assignee = { id: 'usr-assignee', name: 'Marc Dupuis' };

    const waitingTransition = detectTaskNotificationTransitions({
      previousTask: {
        id: 't-200',
        title: 'Préparer dossier Paie',
        dueDate: '2026-11-28',
        creatorId: 'usr-creator',
        assigneeId: assignee.id,
        status: 'in_progress',
        completed: false,
      },
      nextTask: {
        id: 't-200',
        title: 'Préparer dossier Paie',
        dueDate: '2026-11-28',
        creatorId: 'usr-creator',
        assigneeId: assignee.id,
        status: 'waiting',
        completed: false,
      },
      actor: assignee,
    });

    expect(waitingTransition).toHaveLength(0);

    const completionTransition = detectTaskNotificationTransitions({
      previousTask: {
        id: 't-200',
        title: 'Préparer dossier Paie',
        dueDate: '2026-11-28',
        creatorId: 'usr-creator',
        assigneeId: assignee.id,
        status: 'waiting',
        completed: false,
      },
      nextTask: {
        id: 't-200',
        title: 'Préparer dossier Paie',
        dueDate: '2026-11-28',
        creatorId: 'usr-creator',
        assigneeId: assignee.id,
        status: 'completed',
        completed: true,
      },
      actor: assignee,
    });

    expect(completionTransition).toHaveLength(1);
    expect(completionTransition[0].type).toBe('task_completed');
    expect(completionTransition[0].recipientId).toBe('usr-creator');
    expect(completionTransition[0].actorId).toBe(assignee.id);
    expect(completionTransition[0].message).toContain('terminée');

    // Creator marking their own task completed must not self-notify
    const selfCompleted = detectTaskNotificationTransitions({
      previousTask: {
        id: 't-201',
        title: 'Ma propre tâche',
        dueDate: '2026-11-28',
        creatorId: 'usr-creator',
        assigneeId: assignee.id,
        status: 'in_progress',
        completed: false,
      },
      nextTask: {
        id: 't-201',
        title: 'Ma propre tâche',
        dueDate: '2026-11-28',
        creatorId: 'usr-creator',
        assigneeId: assignee.id,
        status: 'completed',
        completed: true,
      },
      actor: { id: 'usr-creator', name: 'Claire Delacroix' },
    });

    expect(selfCompleted).toHaveLength(0);
  });

  it('merges notifications cleanly without duplicates and respects SSE recipient scoping', () => {
    const draft = detectTaskNotificationTransitions({
      previousTask: null,
      nextTask: {
        id: 't-300',
        title: 'Revue bilan',
        dueDate: '2026-11-29',
        creatorId: 'usr-creator',
        assigneeId: 'usr-assignee',
        status: 'todo',
      },
      actor: { id: 'usr-creator', name: 'Claire Delacroix' },
      nowIso: '2026-11-17T11:00:00.000Z',
    })[0];

    const domainNotif = toTaskNotification(draft);
    const merged = mergeNotificationsById(
      [{ ...domainNotif, read: true }],
      [{ ...domainNotif, read: false }]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].read).toBe(true);

    // Targeted SSE filtering
    expect(
      canReceiveRealtimeEvent(
        { type: 'TASK_ASSIGNED', targetUserId: 'usr-assignee' },
        { id: 'usr-assignee', role: 'member' }
      )
    ).toBe(true);
    expect(
      canReceiveRealtimeEvent(
        { type: 'TASK_ASSIGNED', targetUserId: 'usr-assignee' },
        { id: 'usr-other', role: 'admin' }
      )
    ).toBe(false);
    expect(
      canReceiveRealtimeEvent(
        { type: 'TASK_UPDATED', visibleToUserIds: ['usr-creator', 'usr-assignee'] },
        { id: 'usr-outsider', role: 'member' }
      )
    ).toBe(false);
    expect(
      canReceiveRealtimeEvent(
        { type: 'TASK_UPDATED', visibleToUserIds: ['usr-creator', 'usr-assignee'] },
        { id: 'usr-admin', role: 'admin' }
      )
    ).toBe(true);

    expect(formatRealtimeAlertType('TASK_ASSIGNED')).toBe('TÂCHE ASSIGNÉE');
    expect(formatRealtimeAlertType('TASK_COMPLETED')).toBe('TÂCHE TERMINÉE');

    // RBAC notification visibility filter
    const assigneeUser: User = {
      id: 'usr-assignee',
      name: 'Marc Dupuis',
      email: 'marc@cabinet.fr',
      role: 'member',
      createdAt: '2026-01-01',
    };
    const creatorUser: User = {
      id: 'usr-creator',
      name: 'Claire Delacroix',
      email: 'claire@cabinet.fr',
      role: 'member',
      createdAt: '2026-01-01',
    };
    expect(
      filterNotificationsForUser([domainNotif], assigneeUser, new Set(['t-300']))
    ).toHaveLength(1);
    expect(
      filterNotificationsForUser([domainNotif], creatorUser, new Set(['t-300']))
    ).toHaveLength(0);
  });
});
