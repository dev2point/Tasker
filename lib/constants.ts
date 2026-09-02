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

// Generates dynamic sample tasks relative to today's date
export function getInitialSampleTasks(): Task[] {
  const now = new Date();
  
  const formatDate = (offsetDays: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatDate(0);
  const tomorrowStr = formatDate(1);
  const in2DaysStr = formatDate(2);
  const in4DaysStr = formatDate(4);
  const yesterdayStr = formatDate(-1);

  return [
    {
      id: 'sample-1',
      title: 'Réunion d’équipe stratégique & revue Q3',
      description: 'Présenter les objectifs du trimestre, les indicateurs clés et planifier les sprints avec l’équipe projet.',
      dueDate: todayStr,
      dueTime: '10:00',
      priority: 'urgent',
      category: 'travail',
      completed: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 15,
      reminderTriggered: false,
      recurrence: 'weekly',
      tags: ['Stratégie', 'Revue', 'Important'],
      status: 'in_progress',
      subtasks: [
        { id: 'sub-1', title: 'Préparer les diapositives KPI', completed: true },
        { id: 'sub-2', title: 'Vérifier les disponibilités du calendrier', completed: true },
        { id: 'sub-3', title: 'Rédiger le compte-rendu post-réunion', completed: false },
      ],
    },
    {
      id: 'sample-2',
      title: 'Finaliser et envoyer la proposition client',
      description: 'Relire le devis chiffré, vérifier les mentions légales et transmettre le document signé par email.',
      dueDate: todayStr,
      dueTime: '15:30',
      priority: 'high',
      category: 'projet',
      completed: false,
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 30,
      reminderTriggered: false,
      recurrence: 'none',
      tags: ['Client', 'Devis'],
      status: 'todo',
      subtasks: [
        { id: 'sub-4', title: 'Contrôler le tableau financier', completed: true },
        { id: 'sub-5', title: 'Exporter en PDF haute qualité', completed: false },
      ],
    },
    {
      id: 'sample-3',
      title: 'Séance de sport / Cardio 45 min',
      description: 'Course à pied ou séance fractionnée pour maintenir l’énergie et la forme.',
      dueDate: todayStr,
      dueTime: '18:45',
      priority: 'medium',
      category: 'sante',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 30,
      reminderTriggered: false,
      recurrence: 'daily',
      tags: ['Sport', 'Santé'],
      status: 'todo',
      subtasks: [
        { id: 'sub-6', title: 'Échauffement articulaire 5 min', completed: false },
        { id: 'sub-7', title: 'Session principale 35 min', completed: false },
        { id: 'sub-8', title: 'Étirements & hydratation', completed: false },
      ],
    },
    {
      id: 'sample-4',
      title: 'Déclaration administrative & comptabilité mensuelle',
      description: 'Télécharger les factures du mois, rapprocher les comptes et valider les justificatifs.',
      dueDate: tomorrowStr,
      dueTime: '11:00',
      priority: 'high',
      category: 'finance',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 60,
      reminderTriggered: false,
      recurrence: 'monthly',
      tags: ['Compta', 'Admin'],
      status: 'todo',
      subtasks: [
        { id: 'sub-9', title: 'Télécharger les relevés bancaires', completed: false },
        { id: 'sub-10', title: 'Archiver les factures fournisseurs', completed: false },
      ],
    },
    {
      id: 'sample-5',
      title: 'Lire 2 chapitres du livre d’architecture logicielle',
      description: 'Approfondir les patrons de conception modernes et les microservices.',
      dueDate: in2DaysStr,
      dueTime: '20:00',
      priority: 'low',
      category: 'etudes',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 0,
      reminderTriggered: false,
      recurrence: 'none',
      tags: ['Lecture', 'Tech'],
      status: 'todo',
      subtasks: [],
    },
    {
      id: 'sample-6',
      title: 'Rendez-vous médical annuel de contrôle',
      description: 'Cabinet médical du centre-ville, apporter le carnet de santé.',
      dueDate: in4DaysStr,
      dueTime: '09:15',
      priority: 'medium',
      category: 'sante',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 1440, // 1 day before
      reminderTriggered: false,
      recurrence: 'none',
      tags: ['Médical', 'Rdv'],
      status: 'todo',
      subtasks: [],
    },
    {
      id: 'sample-7',
      title: 'Mise à jour des dépendances et sauvegardes de sécurité',
      description: 'Vérifier les alertes de vulnérabilité et tester les restaurations.',
      dueDate: yesterdayStr,
      dueTime: '17:00',
      priority: 'medium',
      category: 'travail',
      completed: true,
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date().toISOString(),
      reminderMinutesBefore: 15,
      reminderTriggered: true,
      recurrence: 'none',
      tags: ['Maintenance'],
      status: 'completed',
      subtasks: [
        { id: 'sub-11', title: 'Audit de sécurité npm', completed: true },
        { id: 'sub-12', title: 'Snapshot de sauvegarde vérifié', completed: true },
      ],
    },
  ];
}
