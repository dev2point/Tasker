import { Category, Priority, Task } from '@/types/task';

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
    badge: 'bg-red-100 text-red-700 border-red-200',
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
  high: {
    label: 'Élevée',
    color: '#10b981',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
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
