import { describe, it, expect } from 'vitest';
import { Task } from '@/types/task';

describe('Task Filtering, Search, Sorting & Analytics Logic', () => {
  const tasks: Task[] = [
    {
      id: 't-1',
      title: 'Bilan comptable annuel',
      description: 'Collecter pièces comptables et justificatifs',
      completed: false,
      dueDate: '2026-09-20',
      dueTime: '18:00',
      priority: 'high',
      category: 'Comptabilité',
      tags: ['Bilan', '2025'],
      reminderMinutesBefore: 30,
      subtasks: [
        { id: 's-1', title: 'Lettrage', completed: true },
        { id: 's-2', title: 'Amortissements', completed: true },
        { id: 's-3', title: 'Contrôle TVA', completed: false },
      ],
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 't-2',
      title: 'Dépôt déclaration CIR',
      description: 'Formulaire 2069-A-SD et note technique',
      completed: true,
      dueDate: '2026-09-10',
      priority: 'urgent',
      category: 'Fiscalité',
      tags: ['CIR', 'Urgent'],
      reminderMinutesBefore: -1,
      createdAt: '2026-09-02T08:00:00.000Z',
      updatedAt: '2026-09-10T14:00:00.000Z',
    },
    {
      id: 't-3',
      title: 'Rédaction pacte d’actionnaires',
      description: 'Clause de sortie conjointe et inaliénabilité',
      completed: false,
      dueDate: '2026-10-01',
      priority: 'medium',
      category: 'Juridique',
      tags: ['Corporate'],
      reminderMinutesBefore: 60,
      createdAt: '2026-09-05T08:00:00.000Z',
      updatedAt: '2026-09-05T08:00:00.000Z',
    },
  ];

  it('filters tasks by category', () => {
    const comptaTasks = tasks.filter((t) => t.category === 'Comptabilité');
    expect(comptaTasks).toHaveLength(1);
    expect(comptaTasks[0].id).toBe('t-1');
  });

  it('filters tasks by completion status', () => {
    const pendingTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);

    expect(pendingTasks).toHaveLength(2);
    expect(completedTasks).toHaveLength(1);
  });

  it('filters tasks by full-text search query (case-insensitive)', () => {
    const query = 'cir';
    const matches = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase())
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('t-2');
  });

  it('filters tasks by tags', () => {
    const tagMatches = tasks.filter((t) => t.tags?.includes('Bilan'));
    expect(tagMatches).toHaveLength(1);
    expect(tagMatches[0].id).toBe('t-1');
  });

  it('sorts tasks by priority (urgent > high > medium > low)', () => {
    const priorityWeights: Record<Task['priority'], number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const sorted = [...tasks].sort(
      (a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]
    );

    expect(sorted[0].priority).toBe('urgent');
    expect(sorted[1].priority).toBe('high');
    expect(sorted[2].priority).toBe('medium');
  });

  it('calculates subtasks progress ratio correctly', () => {
    const task = tasks[0];
    const subtasks = task.subtasks || [];
    const completedCount = subtasks.filter((s) => s.completed).length;
    const progressPercent = Math.round((completedCount / subtasks.length) * 100);

    expect(completedCount).toBe(2);
    expect(subtasks.length).toBe(3);
    expect(progressPercent).toBe(67);
  });
});
