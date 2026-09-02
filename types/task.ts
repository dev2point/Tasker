export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // Format YYYY-MM-DD
  dueTime?: string; // Format HH:mm (24h)
  priority: Priority;
  category: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Team & Collaboration
  workspaceId?: string;
  creatorId?: string;
  creatorName?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  // Automated reminders configuration
  reminderMinutesBefore: number; // -1 for disabled, 0 for exact time, 5, 10, 15, 30, 60, 120, 1440, 2880
  reminderTriggered?: boolean;
  reminderDismissed?: boolean;
  reminderTriggeredAt?: string;
  recurrence: Recurrence;
  tags: string[];
  subtasks: Subtask[];
  color?: string;
  status?: 'todo' | 'in_progress' | 'completed';
}

export interface Category {
  id: string;
  name: string;
  color: string;
  bgLight: string;
  iconName: string;
}

export interface TaskNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  dueDate: string;
  dueTime?: string;
  triggerTime: string;
  read: boolean;
  type: 'due' | 'reminder' | 'overdue';
  snoozedUntil?: string;
}

export type ViewMode = 'list' | 'calendar' | 'kanban' | 'stats';
export type CalendarViewType = 'month' | 'week' | 'day';
export type FilterType = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'urgent';
export type GroupByType = 'none' | 'dueDate' | 'priority' | 'category' | 'status';
