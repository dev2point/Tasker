import { Category, Priority, Task, TaskStatus } from '@/types/task';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'fiscalite',
    name: 'Fiscalité & Déclarations',
    color: '#10b981', // emerald-500
    bgLight: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconName: 'Receipt',
    isDefault: true,
  },
  {
    id: 'comptabilite',
    name: 'Comptabilité & Bilan',
    color: '#3b82f6', // blue-500
    bgLight: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconName: 'Calculator',
    isDefault: true,
  },
  {
    id: 'juridique',
    name: 'Juridique & Droit des Sociétés',
    color: '#8b5cf6', // purple-500
    bgLight: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconName: 'Scale',
    isDefault: true,
  },
  {
    id: 'innovation',
    name: 'Recherche & Innovation (CIR/CII)',
    color: '#06b6d4', // cyan-500
    bgLight: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    iconName: 'Lightbulb',
    isDefault: true,
  },
  {
    id: 'audit_contentieux',
    name: 'Audit & Contentieux Fiscal',
    color: '#f59e0b', // amber-500
    bgLight: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    iconName: 'ShieldAlert',
    isDefault: true,
  },
  {
    id: 'gestion_cabinet',
    name: 'Gestion Cabinet & Paie',
    color: '#14b8a6', // teal-500
    bgLight: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    iconName: 'Building2',
    isDefault: true,
  },
];

export const REMINDER_OPTIONS = [
  { value: -1, label: 'Aucun rappel' },
  { value: 0, label: 'À l’heure exacte' },
  { value: 5, label: '5 minutes avant' },
  { value: 10, label: '10 minutes avant' },
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 120, label: '2 heures avant' },
  { value: 1440, label: '1 jour avant (24h)' },
  { value: 2880, label: '2 jours avant (48h)' },
];

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; badge: string; border: string; dot: string }> = {
  urgent: {
    label: 'Urgent',
    color: '#ef4444',
    badge: 'bg-rose-950/80 text-rose-300 border border-rose-500/40',
    border: 'border-l-rose-500',
    dot: 'bg-rose-500',
  },
  high: {
    label: 'Élevée',
    color: '#10b981',
    badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: 'Moyenne',
    color: '#3b82f6',
    badge: 'bg-blue-950/80 text-blue-300 border border-blue-500/40',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  low: {
    label: 'Faible',
    color: '#64748b',
    badge: 'bg-slate-900/80 text-slate-300 border border-slate-700/50',
    border: 'border-l-slate-500',
    dot: 'bg-slate-400',
  },
};

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'completed'];

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  {
    value: TaskStatus;
    label: string;
    shortLabel: string;
    dotColor: string;
    accentBorder: string;
    textColor: string;
    selectClass: string;
    badgeClass: string;
  }
> = {
  todo: {
    value: 'todo',
    label: 'Non démarrée',
    shortLabel: 'Non démarrée',
    dotColor: 'bg-slate-400',
    accentBorder: 'border-t-slate-400/80',
    textColor: 'text-slate-300',
    selectClass: 'border-slate-500/35 bg-slate-900/80 text-slate-200',
    badgeClass: 'bg-slate-900/80 text-slate-200 border-slate-500/40',
  },
  in_progress: {
    value: 'in_progress',
    label: 'En cours',
    shortLabel: 'En cours',
    dotColor: 'bg-emerald-400',
    accentBorder: 'border-t-emerald-500/80',
    textColor: 'text-emerald-300',
    selectClass: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
  },
  waiting: {
    value: 'waiting',
    label: 'En attente',
    shortLabel: 'En attente',
    dotColor: 'bg-amber-400',
    accentBorder: 'border-t-amber-500/80',
    textColor: 'text-amber-300',
    selectClass: 'border-amber-500/40 bg-amber-950/70 text-amber-200',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
  },
  completed: {
    value: 'completed',
    label: 'Terminée',
    shortLabel: 'Terminée',
    dotColor: 'bg-teal-400',
    accentBorder: 'border-t-teal-400/80',
    textColor: 'text-teal-300',
    selectClass: 'border-teal-500/40 bg-teal-950/80 text-teal-200',
    badgeClass: 'bg-teal-500/20 text-teal-200 border-teal-400/40',
  },
};

export function normalizeTaskStatus(status?: string | null, completed?: boolean): TaskStatus {
  if (completed || status === 'completed') {
    return 'completed';
  }
  if (status === 'in_progress') {
    return 'in_progress';
  }
  if (status === 'waiting') {
    return 'waiting';
  }
  return 'todo';
}

// Default tasks are empty; tasks are fetched strictly from the database
export function getInitialSampleTasks(): Task[] {
  return [];
}

