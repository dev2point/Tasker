import { describe, it, expect } from 'vitest';
import { sanitizeTaskForPostgres, toValidDateOrNull } from '@/lib/db/task-sanitize';

describe('PostgreSQL Task Sanitization', () => {
  it('validates dates safely via toValidDateOrNull', () => {
    expect(toValidDateOrNull(undefined)).toBeNull();
    expect(toValidDateOrNull(null)).toBeNull();
    expect(toValidDateOrNull('')).toBeNull();
    expect(toValidDateOrNull('not-a-valid-date')).toBeNull();
    expect(toValidDateOrNull(new Date('invalid'))).toBeNull();

    const validIso = toValidDateOrNull('2026-12-01T10:30:00.000Z');
    expect(validIso).toBeInstanceOf(Date);
    expect(validIso?.toISOString()).toBe('2026-12-01T10:30:00.000Z');
  });

  it('bounds varchar columns, validates timestamps, and coerces subtasks/tags', () => {
    const sanitized = sanitizeTaskForPostgres(
      {
        id: 'x'.repeat(100),
        title: `  ${'A'.repeat(600)}  `,
        description: 'Note juridique',
        dueDate: '2026-12-15-extra-chars-beyond-32-limit-test',
        dueTime: '14:30:00-extra-long',
        priority: 'high',
        status: 'in_progress',
        category: 'c'.repeat(90),
        completed: true,
        completedAt: 'invalid-date',
        reminderMinutesBefore: Number.NaN,
        reminderTriggered: true,
        reminderDismissed: false,
        reminderTriggeredAt: 'invalid-triggered-at',
        recurrence: 'weekly',
        tags: ['fiscal', 42 as unknown as string],
        subtasks: [
          { id: 's1', title: 'Relecture', completed: true },
          { id: '', title: '', completed: false },
        ],
        color: '#12345678901234567890123456789012345',
        createdAt: 'invalid-created-at',
      },
      {
        workspaceId: null,
        creatorId: 'user-123',
        assigneeId: null,
      }
    );

    expect(sanitized.id.length).toBe(64);
    expect(sanitized.title.length).toBe(500);
    expect(sanitized.dueDate.length).toBe(32);
    expect(sanitized.dueTime?.length).toBe(16);
    expect(sanitized.category.length).toBe(64);
    expect(sanitized.color?.length).toBe(32);

    expect(sanitized.completed).toBe(true);
    expect(sanitized.completedAt).toBeInstanceOf(Date);
    expect(sanitized.reminderTriggeredAt).toBeNull();
    expect(sanitized.reminderMinutesBefore).toBe(15);
    expect(sanitized.createdAt).toBeInstanceOf(Date);
    expect(sanitized.updatedAt).toBeInstanceOf(Date);

    expect(sanitized.workspaceId).toBeNull();
    expect(sanitized.creatorId).toBe('user-123');
    expect(sanitized.assigneeId).toBeNull();
    expect(sanitized.tags).toEqual(['fiscal', '42']);
    expect(sanitized.subtasks).toEqual([
      { id: 's1', title: 'Relecture', completed: true },
      { id: 'sub-1', title: '', completed: false },
    ]);
  });

  it('clears completedAt when task is incomplete and preserves explicit values when valid', () => {
    const sanitized = sanitizeTaskForPostgres(
      {
        id: 'task-1',
        title: '   ',
        dueDate: '2026-12-20',
        completed: false,
        completedAt: '2026-12-19T09:00:00.000Z',
        reminderMinutesBefore: 30,
        reminderTriggeredAt: '2026-12-20T08:30:00.000Z',
      },
      {
        workspaceId: 'ws-1',
        creatorId: 'u-1',
        assigneeId: 'u-2',
      }
    );

    expect(sanitized.title).toBe('Nouvelle tâche');
    expect(sanitized.status).toBe('todo');
    expect(sanitized.completedAt).toBeNull();
    expect(sanitized.reminderMinutesBefore).toBe(30);
    expect(sanitized.reminderTriggeredAt?.toISOString()).toBe('2026-12-20T08:30:00.000Z');
  });
});
