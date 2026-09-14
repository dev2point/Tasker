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

export const DEFAULT_TEAM_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'Alexandre Dupont',
    email: 'alexandre.dupont@planit.io',
    role: 'admin',
    department: 'Direction & Produit',
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_manager_1',
    name: 'Sophie Martin',
    email: 'sophie.martin@planit.io',
    role: 'manager',
    department: 'Ingénierie',
    status: 'active',
    createdAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'usr_member_1',
    name: 'Thomas Bernard',
    email: 'thomas.bernard@planit.io',
    role: 'member',
    department: 'Design',
    status: 'active',
    createdAt: '2025-01-03T00:00:00.000Z',
  },
  {
    id: 'usr_member_2',
    name: 'Camille Leroy',
    email: 'camille.leroy@planit.io',
    role: 'member',
    department: 'Marketing',
    status: 'away',
    createdAt: '2025-01-04T00:00:00.000Z',
  },
];

