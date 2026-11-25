import { Category, Priority, Task, TaskStatus } from '@/types/task';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'fiscalite',
    name: 'Fiscalité & Déclarations',
    color: '#004266',
    bgLight:
      'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30',
    iconName: 'Receipt',
    isDefault: true,
  },
  {
    id: 'comptabilite',
    name: 'Comptabilité & Bilan',
    color: '#2563eb',
    bgLight:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    iconName: 'Calculator',
    isDefault: true,
  },
  {
    id: 'juridique',
    name: 'Juridique & Droit des Sociétés',
    color: '#6366f1',
    bgLight:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
    iconName: 'Scale',
    isDefault: true,
  },
  {
    id: 'innovation',
    name: 'Recherche & Innovation (CIR/CII)',
    color: '#0891b2',
    bgLight:
      'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30',
    iconName: 'Lightbulb',
    isDefault: true,
  },
  {
    id: 'audit_contentieux',
    name: 'Audit & Contentieux Fiscal',
    color: '#F77F00',
    bgLight:
      'bg-[#F77F00]/12 text-[#B85A00] border-[#F77F00]/30 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35',
    iconName: 'ShieldAlert',
    isDefault: true,
  },
  {
    id: 'gestion_cabinet',
    name: 'Gestion Cabinet & Paie',
    color: '#0d9488',
    bgLight:
      'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30',
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
    color: '#e11d48',
    badge:
      'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/75 dark:text-rose-300 dark:border-rose-500/40',
    border: 'border-l-rose-500',
    dot: 'bg-rose-500',
  },
  high: {
    label: 'Élevée',
    color: '#F77F00',
    badge:
      'bg-[#FFF4E6] text-[#B85A00] border border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/40',
    border: 'border-l-[#F77F00]',
    dot: 'bg-[#F77F00]',
  },
  medium: {
    label: 'Moyenne',
    color: '#004266',
    badge:
      'bg-[#004266]/10 text-[#004266] border border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/40',
    border: 'border-l-[#004266] dark:border-l-[#3895C9]',
    dot: 'bg-[#004266] dark:bg-[#3895C9]',
  },
  low: {
    label: 'Faible',
    color: '#64748b',
    badge:
      'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60',
    border: 'border-l-slate-400',
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
    accentBorder: 'border-t-slate-400',
    textColor: 'text-slate-600 dark:text-slate-300',
    selectClass:
      'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-[#103049] dark:text-slate-200',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-500/40',
  },
  in_progress: {
    value: 'in_progress',
    label: 'En cours',
    shortLabel: 'En cours',
    dotColor: 'bg-[#004266] dark:bg-[#3895C9]',
    accentBorder: 'border-t-[#004266] dark:border-t-[#3895C9]',
    textColor: 'text-[#004266] dark:text-[#7CC4EB]',
    selectClass:
      'border-[#004266]/30 bg-[#004266]/10 text-[#004266] dark:border-[#3895C9]/45 dark:bg-[#004266]/60 dark:text-[#7CC4EB]',
    badgeClass:
      'bg-[#004266]/10 text-[#004266] border-[#004266]/30 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/40',
  },
  waiting: {
    value: 'waiting',
    label: 'En attente',
    shortLabel: 'En attente',
    dotColor: 'bg-[#F77F00]',
    accentBorder: 'border-t-[#F77F00]',
    textColor: 'text-[#B85A00] dark:text-[#FFB35C]',
    selectClass:
      'border-[#F77F00]/40 bg-[#FFF4E6] text-[#B85A00] dark:border-[#F77F00]/45 dark:bg-[#F77F00]/15 dark:text-[#FFB35C]',
    badgeClass:
      'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/40',
  },
  completed: {
    value: 'completed',
    label: 'Terminée',
    shortLabel: 'Terminée',
    dotColor: 'bg-emerald-600 dark:bg-emerald-400',
    accentBorder: 'border-t-emerald-600 dark:border-t-emerald-400',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    selectClass:
      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/40',
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

