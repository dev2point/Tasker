import { describe, it, expect } from 'vitest';
import { generateICalendar } from '@/lib/ical';
import { Task } from '@/types/task';

describe('iCalendar RFC 5545 Generation', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task-cal-1',
      title: 'Clôture semestrielle bilan',
      description: 'Audit des comptes et lettrage général',
      completed: false,
      dueDate: '2026-09-30',
      dueTime: '17:00',
      priority: 'urgent',
      category: 'Comptabilité',
      reminderMinutesBefore: 60,
      recurrence: 'none',
      tags: ['Clôture'],
      subtasks: [
        { id: 'sub-1', title: 'Rapprochement bancaire', completed: true },
        { id: 'sub-2', title: 'Inventaire des stocks', completed: false },
      ],
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'task-cal-2',
      title: 'Validation rapport RSE',
      completed: true,
      dueDate: '2026-10-05',
      priority: 'medium',
      category: 'Juridique',
      reminderMinutesBefore: -1, // No reminder
      recurrence: 'none',
      tags: [],
      subtasks: [],
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ];

  it('generates valid RFC 5545 headers and calendar structure', () => {
    const ics = generateICalendar(sampleTasks);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Planit//Task Manager with Reminders//FR');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('contains VEVENT for each task with correct UID and summary', () => {
    const ics = generateICalendar(sampleTasks);

    expect(ics).toContain('UID:task-task-cal-1@planit.app');
    expect(ics).toContain('SUMMARY:Clôture semestrielle bilan');
    expect(ics).toContain('UID:task-task-cal-2@planit.app');
    expect(ics).toContain('SUMMARY:Validation rapport RSE');
  });

  it('formats subtasks and priority accurately in description', () => {
    const ics = generateICalendar(sampleTasks);

    expect(ics).toContain('[X] Rapprochement bancaire');
    expect(ics).toContain('[ ] Inventaire des stocks');
    expect(ics).toContain('PRIORITY:1'); // Urgent mapped to 1
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('STATUS:COMPLETED');
  });

  it('includes VALARM reminder for tasks with reminder configured', () => {
    const ics = generateICalendar(sampleTasks);

    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('ACTION:DISPLAY');
    expect(ics).toContain('TRIGGER:-PT60M');
    expect(ics).toContain('END:VALARM');
  });

  it('does not include VALARM when reminder is disabled (-1)', () => {
    const taskNoReminder: Task[] = [sampleTasks[1]];
    const ics = generateICalendar(taskNoReminder);

    expect(ics).not.toContain('BEGIN:VALARM');
  });
});
