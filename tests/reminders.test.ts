import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTaskDueDateTime,
  getReminderTriggerTime,
  isTaskOverdue,
  formatDueDateFrench,
  getNextRecurrenceDate,
  evaluateReminders,
} from '@/lib/reminders';
import { Task } from '@/types/task';

describe('Reminders & Recurrence Engine', () => {
  const sampleTask: Task = {
    id: 'task-test-1',
    title: 'Déclaration TVA trimestrielle',
    description: 'Vérifier les factures fournisseurs et clients',
    completed: false,
    dueDate: '2026-09-20',
    dueTime: '14:30',
    priority: 'high',
    category: 'Finance',
    reminderMinutesBefore: 30,
    tags: ['TVA', 'Fiscal'],
    subtasks: [
      { id: 'sub-1', title: 'Export balance', completed: true },
      { id: 'sub-2', title: 'Calcul prorata déduction', completed: false },
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  };

  describe('getTaskDueDateTime', () => {
    it('correctly parses date and time into a Date object', () => {
      const dt = getTaskDueDateTime(sampleTask);
      expect(dt.getFullYear()).toBe(2026);
      expect(dt.getMonth()).toBe(8); // September is 8 (0-indexed)
      expect(dt.getDate()).toBe(20);
      expect(dt.getHours()).toBe(14);
      expect(dt.getMinutes()).toBe(30);
    });

    it('defaults to 23:59 when no dueTime is provided', () => {
      const taskWithoutTime: Task = { ...sampleTask, dueTime: undefined };
      const dt = getTaskDueDateTime(taskWithoutTime);
      expect(dt.getHours()).toBe(23);
      expect(dt.getMinutes()).toBe(59);
    });
  });

  describe('getReminderTriggerTime', () => {
    it('returns null when reminder is disabled (-1)', () => {
      const taskNoReminder: Task = { ...sampleTask, reminderMinutesBefore: -1 };
      expect(getReminderTriggerTime(taskNoReminder)).toBeNull();
    });

    it('computes exact trigger timestamp subtracting reminder minutes', () => {
      const triggerTime = getReminderTriggerTime(sampleTask);
      expect(triggerTime).not.toBeNull();
      const dueTime = getTaskDueDateTime(sampleTask);
      const expectedDiffMs = 30 * 60 * 1000;
      expect(dueTime.getTime() - triggerTime!.getTime()).toBe(expectedDiffMs);
    });

    it('handles 1 day (1440 minutes) before reminder', () => {
      const taskDayBefore: Task = { ...sampleTask, reminderMinutesBefore: 1440 };
      const triggerTime = getReminderTriggerTime(taskDayBefore);
      const dueTime = getTaskDueDateTime(taskDayBefore);
      expect(dueTime.getTime() - triggerTime!.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('isTaskOverdue', () => {
    it('returns false for completed tasks even if due in the past', () => {
      const pastCompleted: Task = {
        ...sampleTask,
        dueDate: '2020-01-01',
        dueTime: '10:00',
        completed: true,
      };
      expect(isTaskOverdue(pastCompleted)).toBe(false);
    });

    it('returns true when current time is past due date and task is uncompleted', () => {
      const pastPending: Task = {
        ...sampleTask,
        dueDate: '2020-01-01',
        dueTime: '10:00',
        completed: false,
      };
      expect(isTaskOverdue(pastPending)).toBe(true);
    });

    it('returns false when task is due in the future', () => {
      const futureTask: Task = {
        ...sampleTask,
        dueDate: '2099-12-31',
        dueTime: '23:59',
        completed: false,
      };
      expect(isTaskOverdue(futureTask)).toBe(false);
    });
  });

  describe('formatDueDateFrench', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-15T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats today as "Aujourd\'hui"', () => {
      const res = formatDueDateFrench('2026-09-15', '14:00');
      expect(res).toBe("Aujourd'hui à 14:00");
    });

    it('formats tomorrow as "Demain"', () => {
      const res = formatDueDateFrench('2026-09-16');
      expect(res).toBe('Demain');
    });

    it('formats yesterday as "Hier"', () => {
      const res = formatDueDateFrench('2026-09-14');
      expect(res).toBe('Hier');
    });

    it('returns empty string if no date string provided', () => {
      expect(formatDueDateFrench('')).toBe('');
    });
  });

  describe('getNextRecurrenceDate', () => {
    it('adds 1 day for daily recurrence', () => {
      const next = getNextRecurrenceDate('2026-09-15', 'daily');
      expect(next).toBe('2026-09-16');
    });

    it('skips weekends for weekdays recurrence', () => {
      // 2026-09-18 is a Friday
      const friday = '2026-09-18';
      const next = getNextRecurrenceDate(friday, 'weekdays');
      // Should skip Saturday (19) and Sunday (20) to Monday (21)
      expect(next).toBe('2026-09-21');
    });

    it('adds 7 days for weekly recurrence', () => {
      const next = getNextRecurrenceDate('2026-09-15', 'weekly');
      expect(next).toBe('2026-09-22');
    });

    it('increments month for monthly recurrence', () => {
      const next = getNextRecurrenceDate('2026-09-15', 'monthly');
      expect(next).toBe('2026-10-15');
    });

    it('increments year for yearly recurrence', () => {
      const next = getNextRecurrenceDate('2026-09-15', 'yearly');
      expect(next).toBe('2027-09-15');
    });

    it('returns same date if recurrence is undefined or none', () => {
      const next = getNextRecurrenceDate('2026-09-15', undefined);
      expect(next).toBe('2026-09-15');
    });
  });

  describe('evaluateReminders', () => {
    it('triggers notification when time reaches trigger threshold', () => {
      const dueDate = '2026-09-15';
      const dueTime = '12:00';
      const dueDateTime = new Date(2026, 8, 15, 12, 0, 0, 0).getTime();
      const reminderOffset = 15; // 15 minutes before
      const triggerTimeMs = dueDateTime - reminderOffset * 60 * 1000;

      const task: Task = {
        ...sampleTask,
        dueDate,
        dueTime,
        reminderMinutesBefore: reminderOffset,
        reminderTriggered: false,
      };

      // Test before trigger time -> no notification
      const beforeEval = evaluateReminders([task], triggerTimeMs - 1000);
      expect(beforeEval.triggeredTasks).toHaveLength(0);
      expect(beforeEval.newNotifications).toHaveLength(0);

      // Test at trigger time -> triggered!
      const triggerEval = evaluateReminders([task], triggerTimeMs);
      expect(triggerEval.triggeredTasks).toHaveLength(1);
      expect(triggerEval.triggeredTasks[0].reminderTriggered).toBe(true);
      expect(triggerEval.newNotifications).toHaveLength(1);
      expect(triggerEval.newNotifications[0].taskTitle).toBe(task.title);
      expect(triggerEval.newNotifications[0].read).toBe(false);
    });

    it('ignores completed tasks and already triggered tasks', () => {
      const completedTask: Task = { ...sampleTask, completed: true, reminderTriggered: false };
      const alreadyTriggeredTask: Task = { ...sampleTask, reminderTriggered: true };

      const evalRes = evaluateReminders([completedTask, alreadyTriggeredTask], Date.now());
      expect(evalRes.triggeredTasks).toHaveLength(0);
      expect(evalRes.newNotifications).toHaveLength(0);
    });
  });
});
