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
  Bot,
  Plus,
  Download,
  Clock,
  Database,
  User as UserIcon,
  Lock,
  SlidersHorizontal,
  X,
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
  onOpenAuthModal?: () => void;
  currentUser?: User | null;
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
  onOpenAuthModal,
  currentUser,
  unreadNotificationsCount,
  activeRemindersCount,
  soundEnabled,
  onToggleSound,
  pendingTasksCount = 0,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Live Date (Guaranteed non-truncating on mobile with shrink-0) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] flex items-center justify-center text-[#422006] shadow-xs shadow-[#F7C59F]/50 shrink-0 font-bold">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                    Planit
                  </span>
                  <Badge variant="apricot" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 font-bold">
                    Rappels & Agenda
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap mt-0.5">
                  <span className="text-slate-700 font-semibold">{currentDateStr}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-600 flex items-center gap-0.5">
                    <Clock className="w-3 h-3 text-[#BA5316]" />
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
                        ? 'bg-white text-[#933F15] shadow-xs border border-[#F7C59F]/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        active ? 'bg-[#F7C59F] text-[#422006]' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Action Tools & Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Better Auth User / Login Button */}
              {onOpenAuthModal && (
                <Button
                  id="open-auth-modal-btn"
                  variant={currentUser ? 'outline' : 'default'}
                  size="sm"
                  onClick={onOpenAuthModal}
                  title={
                    currentUser
                      ? `Connecté en tant que ${currentUser.name} (${currentUser.role})`
                      : 'Se connecter ou créer un compte'
                  }
                  className={
                    currentUser
                      ? 'border-[#F7C59F] bg-white hover:bg-[#F7C59F]/15 text-[#7c2d12] font-semibold px-2 sm:px-2.5 h-8.5 sm:h-9 text-xs gap-1.5'
                      : 'font-bold px-2.5 sm:px-3 h-8.5 sm:h-9 text-xs gap-1.5 shadow-xs'
                  }
                >
                  <UserIcon className="w-3.5 h-3.5 shrink-0" />
                  {currentUser ? (
                    <span className="max-w-[70px] sm:max-w-[120px] truncate font-bold">
                      {currentUser.name.split(' ')[0]}
                    </span>
                  ) : (
                    <span className="truncate">Connexion</span>
                  )}
                  {currentUser && (
                    <span className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-[#F7C59F]/40 text-[#7c2d12] font-bold uppercase">
                      {currentUser.role}
                    </span>
                  )}
                </Button>
              )}

              {/* AI Assistant Quick Button */}
              <Button
                id="open-ai-assistant-btn"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!currentUser) {
                    if (onOpenAuthModal) onOpenAuthModal();
                    else onOpenAIModal();
                  } else {
                    onOpenAIModal();
                  }
                }}
                title={
                  currentUser
                    ? 'Assistant IA (Création intelligente & planificateur Gemini)'
                    : 'Assistant IA (Connexion requise pour utiliser Gemini)'
                }
                className={`relative h-8.5 sm:h-9 px-2 sm:px-3 text-xs gap-1.5 font-semibold transition-all ${
                  currentUser
                    ? 'border-orange-200/90 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 text-orange-800 shadow-2xs'
                    : 'border-[#F7C59F]/70 bg-[#F7C59F]/15 hover:bg-[#F7C59F]/30 text-[#BA5316]'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#BA5316] shrink-0" />
                <span className="hidden sm:inline">Assistant IA</span>
                {!currentUser && (
                  <span
                    title="Connexion requise"
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-700 text-white flex items-center justify-center sm:static sm:w-auto sm:h-auto sm:bg-transparent sm:text-slate-400"
                  >
                    <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                  </span>
                )}
              </Button>

              {/* Notification Bell */}
              <Button
                id="open-notifications-btn"
                variant="outline"
                size="icon-sm"
                onClick={onOpenNotifications}
                title="Centre de rappels & alertes"
                className="relative h-8.5 w-8.5 sm:h-9 sm:w-9 text-slate-700"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Button>

              {/* Sound Toggle (Desktop sm+) */}
              <Button
                id="toggle-sound-btn"
                variant="outline"
                size="icon-sm"
                onClick={onToggleSound}
                title={soundEnabled ? 'Désactiver les alertes sonores' : 'Activer les alertes sonores'}
                className={`hidden sm:inline-flex h-9 w-9 transition-colors ${
                  soundEnabled
                    ? 'border-[#F7C59F] bg-[#F7C59F]/30 text-[#7c2d12] hover:bg-[#F7C59F]/50'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </Button>

              {/* Export / iCal Button (Desktop sm+) */}
              <Button
                id="open-export-btn"
                variant="outline"
                size="icon-sm"
                onClick={onOpenExportModal}
                title="Exporter vers Calendrier (.ics) ou Sauvegarde"
                className="hidden sm:inline-flex h-9 w-9 text-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>

              {/* PostgreSQL Status Button (Desktop sm+ Admin only) */}
              {onOpenPostgresModal && currentUser?.role === 'admin' && (
                <Button
                  id="open-postgres-modal-btn"
                  variant="outline"
                  size="sm"
                  onClick={onOpenPostgresModal}
                  title="Administration PostgreSQL & Rôles (Réservé Admin)"
                  className="hidden sm:inline-flex h-9 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold px-2 sm:px-2.5 text-xs gap-1 shadow-2xs"
                >
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  <span>BDD</span>
                  <span className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold uppercase">
                    Admin
                  </span>
                </Button>
              )}

              {/* PWA Install Button (Desktop sm+) */}
              <div className="hidden sm:block">
                <PWAInstallButton size="sm" />
              </div>

              {/* Desktop New Task CTA Button (Desktop md+) */}
              <Button
                id="open-new-task-btn"
                size="sm"
                onClick={onOpenNewTaskModal}
                className="hidden md:inline-flex font-bold shadow-sm shadow-[#F7C59F]/40 h-9"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nouvelle tâche</span>
              </Button>

              {/* Mobile Quick Options Menu (Visible on mobile md:hidden) */}
              <div className="relative md:hidden">
                <Button
                  id="mobile-options-menu-btn"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  title="Options & Paramètres"
                  className={`h-8.5 w-8.5 transition-colors ${
                    isMobileMenuOpen
                      ? 'border-[#F7C59F] bg-[#F7C59F]/20 text-[#59240A]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </Button>

                {/* Mobile Dropdown Popover */}
                {isMobileMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Menu Card */}
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Options & Réglages
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="py-1 space-y-1">
                        {/* Sound Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            onToggleSound();
                            soundManager.playClickSound();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                soundEnabled
                                  ? 'bg-[#F7C59F]/40 text-[#59240A]'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {soundEnabled ? (
                                <Volume2 className="w-3.5 h-3.5" />
                              ) : (
                                <VolumeX className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span>Alertes sonores</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              soundEnabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {soundEnabled ? 'Activé' : 'Coupé'}
                          </span>
                        </button>

                        {/* Export iCal */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onOpenExportModal();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                              <Download className="w-3.5 h-3.5" />
                            </div>
                            <span>Export iCal (.ics)</span>
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            Agenda
                          </Badge>
                        </button>

                        {/* PWA Install */}
                        <div className="pt-0.5">
                          <PWAInstallButton
                            className="w-full justify-start text-xs font-semibold rounded-xl"
                            showText={true}
                          />
                        </div>

                        {/* PostgreSQL Admin Option */}
                        {onOpenPostgresModal && currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              onOpenPostgresModal();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-50 text-amber-900 transition-colors text-xs font-semibold"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                                <Database className="w-3.5 h-3.5" />
                              </div>
                              <span>Administration BDD</span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                              Admin
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                ? 'text-[#933F15] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <CheckSquare className="w-5 h-5" />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#F7C59F] text-[#422006] rounded-full text-[9px] flex items-center justify-center font-bold">
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
                ? 'text-[#933F15] font-bold'
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
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] flex items-center justify-center shadow-md shadow-[#F7C59F]/60 active:scale-95 transition-transform"
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
                ? 'text-[#933F15] font-bold'
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
                ? 'text-[#933F15] font-bold'
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
