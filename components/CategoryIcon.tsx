'use client';

import React from 'react';
import {
  Briefcase,
  User,
  FolderGit2,
  HeartPulse,
  CreditCard,
  GraduationCap,
  Tag,
  Star,
  ShoppingBag,
  Flame,
  Code,
  BookOpen,
  Music,
  Home,
  Car,
  Coffee,
  Target,
  Zap,
  Smile,
  Layers,
  Globe,
  Bookmark,
  Phone,
  Shield,
  Trophy,
  Flag,
  Lightbulb,
  CheckCircle2,
  Box,
  Laptop,
  Palette,
  Dumbbell,
  Compass,
  Plane,
  Utensils,
  Tv,
  Stethoscope,
  Folder,
  Receipt,
  Calculator,
  Scale,
  Building2,
  FileText,
  ShieldAlert,
  LucideProps,
} from 'lucide-react';

export const AVAILABLE_CATEGORY_ICONS = [
  { name: 'Receipt', label: 'Fiscalité & Liasses', component: Receipt },
  { name: 'Calculator', label: 'Comptabilité & Bilan', component: Calculator },
  { name: 'Scale', label: 'Juridique & Droit', component: Scale },
  { name: 'Lightbulb', label: 'Recherche & Innovation', component: Lightbulb },
  { name: 'ShieldAlert', label: 'Audit & Contentieux', component: ShieldAlert },
  { name: 'Building2', label: 'Gestion Cabinet', component: Building2 },
  { name: 'FileText', label: 'Actes & Contrats', component: FileText },
  { name: 'Briefcase', label: 'Dossiers Clients', component: Briefcase },
  { name: 'CreditCard', label: 'Finance & Honoraires', component: CreditCard },
  { name: 'User', label: 'Personnel / Collaborateur', component: User },
  { name: 'FolderGit2', label: 'Projets & Code', component: FolderGit2 },
  { name: 'HeartPulse', label: 'Santé', component: HeartPulse },
  { name: 'GraduationCap', label: 'Formation & Veille', component: GraduationCap },
  { name: 'Star', label: 'Important / Prioritaire', component: Star },
  { name: 'Target', label: 'Objectifs', component: Target },
  { name: 'Flame', label: 'Urgent / Échéance', component: Flame },
  { name: 'Home', label: 'Cabinet / Siège', component: Home },
  { name: 'BookOpen', label: 'Veille Réglementaire', component: BookOpen },
  { name: 'Laptop', label: 'Systèmes & Outils', component: Laptop },
  { name: 'Shield', label: 'Sécurité & Conformité', component: Shield },
  { name: 'Tag', label: 'Générique / Tag', component: Tag },
  { name: 'Folder', label: 'Dossier', component: Folder },
] as const;

export const PRESET_CATEGORY_COLORS = [
  { name: 'Bleu Océan', hex: '#3b82f6', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  { name: 'Émeraude', hex: '#10b981', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { name: 'Violet Royal', hex: '#8b5cf6', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  { name: 'Rose Vif', hex: '#f43f5e', bgLight: 'bg-rose-50 text-rose-700 border-rose-200' },
  { name: 'Ambre / Or', hex: '#f59e0b', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  { name: 'Cyan Lagon', hex: '#06b6d4', bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { name: 'Abricot Planit', hex: '#EE8D4B', bgLight: 'bg-orange-50 text-orange-800 border-orange-200' },
  { name: 'Indigo Nuit', hex: '#6366f1', bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { name: 'Fuchsia', hex: '#d946ef', bgLight: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { name: 'Sarcelle', hex: '#14b8a6', bgLight: 'bg-teal-50 text-teal-700 border-teal-200' },
  { name: 'Rouge Rubis', hex: '#ef4444', bgLight: 'bg-red-50 text-red-700 border-red-200' },
  { name: 'Ardoise / Gris', hex: '#64748b', bgLight: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const PRESET_TAG_COLORS = [
  { hex: '#ef4444', name: 'Rouge' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#f59e0b', name: 'Jaune' },
  { hex: '#10b981', name: 'Vert' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Bleu' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Rose' },
  { hex: '#64748b', name: 'Gris' },
];

export function getTagColor(tagName: string, customColor?: string): { hex: string; bg: string; text: string; border: string } {
  if (customColor) {
    return {
      hex: customColor,
      bg: `${customColor}18`,
      text: customColor,
      border: `${customColor}40`,
    };
  }

  // Deterministic color hash based on tag name
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_TAG_COLORS.length;
  const color = PRESET_TAG_COLORS[index];

  return {
    hex: color.hex,
    bg: `${color.hex}18`,
    text: color.hex,
    border: `${color.hex}40`,
  };
}

interface CategoryIconProps extends LucideProps {
  name: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  const matched = AVAILABLE_CATEGORY_ICONS.find(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );

  if (matched) {
    const IconComponent = matched.component;
    return <IconComponent {...props} />;
  }

  // Fallback icon
  return <Folder {...props} />;
};
