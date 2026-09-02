'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  LayoutGrid,
  BarChart3,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Plus,
  Download,
  Clock,
  Database,
  User as UserIcon,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { User } from '@/types/user';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTaskModal: () => void;
  onOpenAIModal: () => void;
  onOpenExportModal: () => void;
  onOpenNotifications: () => void;
  onOpenPostgresModal?: () => void;
  currentUser?: User;
  unreadNotificationsCount: number;
  activeRemindersCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  pendingTasksCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenNewTaskModal,
  onOpenAIModal,
  onOpenExportModal,
  onOpenNotifications,
  onOpenPostgresModal,
  currentUser,
  unreadNotificationsCount,
  activeRemindersCount,
  soundEnabled,
  onToggleSound,
  pendingTasksCount = 0,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      const formattedDate = now.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      // Capitalize first letter of weekday
      setCurrentDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'list', label: 'Tâches', icon: <CheckSquare className="w-4 h-4" />, badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
    { id: 'calendar', label: 'Calendrier', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'kanban', label: 'Tableau', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 sm:h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Live Date */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
                <CalendarIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight">
                    Planit
                  </span>
                  <Badge variant="indigo" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 font-semibold">
                    Rappels & Agenda
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                  <span className="text-slate-700 font-semibold">{currentDateStr}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-500 flex items-center gap-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {currentTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Segment */}
            <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              {navItems.map((item) => {
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      onViewChange(item.id);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Tools & Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              
              {/* PostgreSQL & Team RBAC Button */}
              {onOpenPostgresModal && (
                <Button
                  id="open-postgres-modal-btn"
                  variant="outline"
                  size="sm"
                  onClick={onOpenPostgresModal}
                  title="Base de données PostgreSQL (Supabase) & Équipe / Rôles"
                  className="border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold px-2.5 sm:px-3 text-xs gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  {currentUser ? (
                    <span className="hidden sm:inline font-bold">
                      {currentUser.name.split(' ')[0]} ({currentUser.role})
                    </span>
                  ) : (
                    <span className="hidden sm:inline">PostgreSQL</span>
                  )}
                </Button>
              )}

              {/* PWA Install Button */}
              <PWAInstallButton size="sm" />

              {/* Sound Toggle */}
              <Button
                id="toggle-sound-btn"
                variant="outline"
                size="icon-sm"
                onClick={onToggleSound}
                title={soundEnabled ? 'Désactiver les alertes sonores' : 'Activer les alertes sonores'}
                className={`transition-colors ${
                  soundEnabled
                    ? 'border-indigo-200 bg-indigo-50/70 text-indigo-600 hover:bg-indigo-100'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </Button>

              {/* AI Assistant Quick Button */}
              <Button
                id="open-ai-assistant-btn"
                variant="outline"
                size="sm"
                onClick={onOpenAIModal}
                title="Assistant IA (Création intelligente & planificateur)"
                className="border-purple-200/90 bg-purple-50/70 hover:bg-purple-100 text-purple-700 font-semibold px-2.5 sm:px-3 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Assistant IA</span>
              </Button>

              {/* Export / iCal Button */}
              <Button
                id="open-export-btn"
                variant="outline"
                size="icon-sm"
                onClick={onOpenExportModal}
                title="Exporter vers Calendrier (.ics) ou Sauvegarde"
                className="hidden sm:inline-flex text-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>

              {/* Notification Bell */}
              <Button
                id="open-notifications-btn"
                variant="outline"
                size="icon-sm"
                onClick={onOpenNotifications}
                title="Centre de rappels & alertes"
                className="relative text-slate-700"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Button>

              {/* Desktop New Task CTA Button */}
              <Button
                id="open-new-task-btn"
                size="sm"
                onClick={onOpenNewTaskModal}
                className="hidden md:inline-flex font-bold shadow-sm shadow-indigo-200"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nouvelle tâche</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile-First Bottom Navigation Bar (Dock) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1.5 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around relative">
          
          {/* List Tab */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onViewChange('list');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              currentView === 'list'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <CheckSquare className="w-5 h-5" />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingTasksCount > 9 ? '9+' : pendingTasksCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Tâches</span>
          </button>

          {/* Calendar Tab */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onViewChange('calendar');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              currentView === 'calendar'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Calendrier</span>
          </button>

          {/* Centered Mobile Floating Action Button (FAB) */}
          <div className="relative -top-3">
            <button
              id="mobile-fab-new-task"
              type="button"
              onClick={onOpenNewTaskModal}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-400/40 active:scale-95 transition-transform"
              title="Ajouter une tâche"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Kanban Tab */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onViewChange('kanban');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              currentView === 'kanban'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Tableau</span>
          </button>

          {/* Stats Tab */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClickSound();
              onViewChange('stats');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              currentView === 'stats'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Stats</span>
          </button>
        </div>
      </div>
    </>
  );
};
