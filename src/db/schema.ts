import { pgTable, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 32 }).notNull().default('member'), // 'admin' | 'manager' | 'member' | 'guest'
  department: varchar('department', { length: 128 }),
  status: varchar('status', { length: 32 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Workspaces / Organizations Table
export const workspaces = pgTable('workspaces', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: varchar('owner_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Workspace Members (with granular workspace-level roles)
export const workspaceMembers = pgTable('workspace_members', {
  id: varchar('id', { length: 64 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 64 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 32 }).notNull().default('member'), // 'admin' | 'manager' | 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// 4. Categories Table
export const categories = pgTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  color: varchar('color', { length: 32 }).notNull(),
  bgLight: varchar('bg_light', { length: 32 }).notNull(),
  iconName: varchar('icon_name', { length: 64 }).notNull(),
  workspaceId: varchar('workspace_id', { length: 64 }).references(() => workspaces.id, {
    onDelete: 'cascade',
  }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Tasks Table
export const tasks = pgTable('tasks', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  dueDate: varchar('due_date', { length: 32 }).notNull(),
  dueTime: varchar('due_time', { length: 16 }),
  priority: varchar('priority', { length: 32 }).notNull().default('medium'), // 'low' | 'medium' | 'high' | 'urgent'
  status: varchar('status', { length: 32 }).notNull().default('todo'), // 'todo' | 'in_progress' | 'completed'
  category: varchar('category', { length: 64 }).notNull().default('work'),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  
  // Collaboration & Roles
  workspaceId: varchar('workspace_id', { length: 64 }).references(() => workspaces.id, {
    onDelete: 'cascade',
  }),
  creatorId: varchar('creator_id', { length: 64 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  assigneeId: varchar('assignee_id', { length: 64 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  
  // Reminders & Recurrence
  reminderMinutesBefore: integer('reminder_minutes_before').default(15).notNull(),
  reminderTriggered: boolean('reminder_triggered').default(false),
  reminderDismissed: boolean('reminder_dismissed').default(false),
  reminderTriggeredAt: timestamp('reminder_triggered_at'),
  recurrence: varchar('recurrence', { length: 32 }).default('none').notNull(),
  
  // Tags & Subtasks (JSON structures)
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  subtasks: jsonb('subtasks')
    .$type<Array<{ id: string; title: string; completed: boolean }>>()
    .default([])
    .notNull(),
  color: varchar('color', { length: 32 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Activity & Audit Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  taskId: varchar('task_id', { length: 64 }).references(() => tasks.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
  userName: varchar('user_name', { length: 255 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(), // 'created' | 'status_changed' | 'assigned' | 'completed' | 'commented' | 'updated'
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relational Definitions
export const usersRelations = relations(users, ({ many }) => ({
  createdTasks: many(tasks, { relationName: 'creator' }),
  assignedTasks: many(tasks, { relationName: 'assignee' }),
  memberships: many(workspaceMembers),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(users, {
    fields: [tasks.creatorId],
    references: [users.id],
    relationName: 'creator',
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  activityLogs: many(activityLogs),
}));
