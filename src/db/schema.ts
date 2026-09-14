import { pgTable, pgEnum, varchar, text, timestamp, boolean, integer, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// PostgreSQL Enum for User Roles (provides strict validation & native dropdowns in Supabase Studio)
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'member', 'guest']);

// 1. Users Table (with RLS policies)
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('member'),
  department: varchar('department', { length: 128 }),
  status: varchar('status', { length: 32 }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, () => [
  pgPolicy('users_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('users_insert_policy', {
    for: 'insert',
    to: 'public',
    withCheck: sql`true`,
  }),
  pgPolicy('users_update_policy', {
    for: 'update',
    to: 'public',
    using: sql`true`,
    withCheck: sql`true`,
  }),
  pgPolicy('users_delete_policy', {
    for: 'delete',
    to: 'public',
    using: sql`true`,
  }),
]).enableRLS();

// 2. Workspaces / Organizations Table (with RLS policies)
export const workspaces = pgTable('workspaces', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: varchar('owner_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, () => [
  pgPolicy('workspaces_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('workspaces_insert_policy', {
    for: 'insert',
    to: 'public',
    withCheck: sql`true`,
  }),
  pgPolicy('workspaces_update_policy', {
    for: 'update',
    to: 'public',
    using: sql`true`,
    withCheck: sql`true`,
  }),
  pgPolicy('workspaces_delete_policy', {
    for: 'delete',
    to: 'public',
    using: sql`true`,
  }),
]).enableRLS();

// 3. Workspace Members (with granular workspace-level roles & RLS policies)
export const workspaceMembers = pgTable('workspace_members', {
  id: varchar('id', { length: 64 }).primaryKey(),
  workspaceId: varchar('workspace_id', { length: 64 })
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, () => [
  pgPolicy('workspace_members_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('workspace_members_insert_policy', {
    for: 'insert',
    to: 'public',
    withCheck: sql`true`,
  }),
  pgPolicy('workspace_members_update_policy', {
    for: 'update',
    to: 'public',
    using: sql`true`,
    withCheck: sql`true`,
  }),
  pgPolicy('workspace_members_delete_policy', {
    for: 'delete',
    to: 'public',
    using: sql`true`,
  }),
]).enableRLS();

// 4. Categories Table (with RLS policies)
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
}, () => [
  pgPolicy('categories_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('categories_insert_policy', {
    for: 'insert',
    to: 'public',
    withCheck: sql`true`,
  }),
  pgPolicy('categories_update_policy', {
    for: 'update',
    to: 'public',
    using: sql`true`,
    withCheck: sql`true`,
  }),
  pgPolicy('categories_delete_policy', {
    for: 'delete',
    to: 'public',
    using: sql`true`,
  }),
]).enableRLS();

// 5. Tasks Table (with RLS policies)
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
}, () => [
  pgPolicy('tasks_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('tasks_insert_policy', {
    for: 'insert',
    to: 'public',
    withCheck: sql`true`,
  }),
  pgPolicy('tasks_update_policy', {
    for: 'update',
    to: 'public',
    using: sql`true`,
    withCheck: sql`true`,
  }),
  pgPolicy('tasks_delete_policy', {
    for: 'delete',
    to: 'public',
    using: sql`true`,
  }),
]).enableRLS();

// 6. Activity & Audit Logs Table (with RLS policies)
export const activityLogs = pgTable('activity_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  taskId: varchar('task_id', { length: 64 }).references(() => tasks.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'set null' }),
  userName: varchar('user_name', { length: 255 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(), // 'created' | 'status_changed' | 'assigned' | 'completed' | 'commented' | 'updated'
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, () => [
  pgPolicy('activity_logs_select_policy', {
    for: 'select',
    to: 'public',
    using: sql`true`,
  }),
  pgPolicy('activity_logs_insert_policy', {
    for: 'insert',
    to: 'public',
    withCheck: sql`true`,
  }),
  pgPolicy('activity_logs_update_policy', {
    for: 'update',
    to: 'public',
    using: sql`true`,
    withCheck: sql`true`,
  }),
  pgPolicy('activity_logs_delete_policy', {
    for: 'delete',
    to: 'public',
    using: sql`true`,
  }),
]).enableRLS();

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

// ==========================================
// BETTER AUTH TABLES (Authentication & Sessions)
// ==========================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  role: userRoleEnum('role').default('member'),
  department: text('department'),
  status: text('status').default('active'),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

