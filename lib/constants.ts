import { Category, Priority, Task } from '@/types/task';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'travail',
    name: 'Travail',
    color: '#3b82f6', // blue-500
    bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
    iconName: 'Briefcase',
  },
  {
    id: 'personnel',
    name: 'Personnel',
    color: '#10b981', // emerald-500
    bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconName: 'User',
  },
  {
    id: 'projet',
    name: 'Projet',
    color: '#8b5cf6', // purple-500
    bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
    iconName: 'FolderGit2',
  },
  {
    id: 'sante',
    name: 'Santé & Bien-être',
    color: '#f43f5e', // rose-500
    bgLight: 'bg-rose-50 text-rose-700 border-rose-200',
    iconName: 'HeartPulse',
  },
  {
    id: 'finance',
    name: 'Finance & Admin',
    color: '#f59e0b', // amber-500
    bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
    iconName: 'CreditCard',
  },
  {
    id: 'etudes',
    name: 'Formation & Lecture',
    color: '#06b6d4', // cyan-500
    bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    iconName: 'GraduationCap',
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
    badge: 'bg-red-100 text-red-700 border-red-200',
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
  high: {
    label: 'Élevée',
    color: '#f97316',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    border: 'border-l-orange-500',
    dot: 'bg-orange-500',
  },
  medium: {
    label: 'Moyenne',
    color: '#3b82f6',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  low: {
    label: 'Faible',
    color: '#64748b',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    border: 'border-l-slate-400',
    dot: 'bg-slate-400',
  },
};

// Default tasks are empty; tasks are fetched strictly from the database
export function getInitialSampleTasks(): Task[] {
  return [];
}
