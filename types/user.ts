export type UserRole = 'admin' | 'manager' | 'member' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  department?: string;
  status?: 'active' | 'away' | 'offline';
  createdAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberCount?: number;
  createdAt?: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  user?: User;
  joinedAt?: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: 'created' | 'status_changed' | 'assigned' | 'completed' | 'commented' | 'updated';
  details: string;
  createdAt: string;
}
