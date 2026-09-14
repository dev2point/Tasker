'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  FolderPlus,
  ChevronDown,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { User } from '@/types/user';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileFloatingGlassMenu } from '@/components/MobileFloatingGlassMenu';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTaskModal: () => void;
  onOpenAIModal: () => void;
  onOpenExportModal: () => void;
  onOpenNotifications: () => void;
  onOpenPostgresModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenCategoryTagManager?: () => void;
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
  onOpenCategoryTagManager,
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
  const [isDesktopToolsOpen, setIsDesktopToolsOpen] = useState<boolean>(false);
  const desktopToolsRef = useRef<HTMLDivElement>(null);

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

  // Close desktop tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopToolsRef.current && !desktopToolsRef.current.contains(e.target as Node)) {
        setIsDesktopToolsOpen(false);
      }
    };
    if (isDesktopToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktopToolsOpen]);

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'list', label: 'Tâches', icon: <CheckSquare className="w-4 h-4 shrink-0" />, badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
    { id: 'calendar', label: 'Calendrier', icon: <CalendarIcon className="w-4 h-4 shrink-0" /> },
    { id: 'kanban', label: 'Tableau', icon: <LayoutGrid className="w-4 h-4 shrink-0" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <>
      {/* Top Application Bar - Designed for fluid desktop responsiveness without overflow */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2 lg:gap-4 min-w-0">
            
            {/* 1. Brand Logo & Live Clock */}
            <div className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 shrink-0 min-w-0">
              <div className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] flex items-center justify-center text-[#422006] shadow-xs shadow-[#F7C59F]/50 shrink-0 font-bold">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                    Planit
                  </span>
                  <Badge variant="apricot" className="hidden xl:inline-flex text-[10px] py-0 px-1.5 font-bold shrink-0">
                    Rappels & Agenda
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap mt-0.5 min-w-0">
                  <span className="hidden lg:inline text-slate-700 font-semibold truncate">{currentDateStr}</span>
                  <span className="hidden lg:inline text-slate-300">•</span>
                  <span className="font-mono text-slate-600 flex items-center gap-0.5">
                    <Clock className="w-3 h-3 text-[#BA5316] shrink-0" />
                    {currentTime}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Desktop Navigation Segment */}
            <nav className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
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
                    className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#933F15] shadow-xs border border-[#F7C59F]/60 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.label}</span>
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

            {/* 3. Right Action Tools & Buttons - Non-overflowing responsive priority */}
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
              
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
                      ? 'border-[#F7C59F] bg-white hover:bg-[#F7C59F]/15 text-[#7c2d12] font-semibold px-2 sm:px-2.5 h-8.5 sm:h-9 text-xs gap-1 sm:gap-1.5 shrink-0 max-w-[110px] sm:max-w-[140px]'
                      : 'font-bold px-2 sm:px-3 h-8.5 sm:h-9 text-xs gap-1 sm:gap-1.5 shadow-xs shrink-0'
                  }
                >
                  <UserIcon className="w-3.5 h-3.5 shrink-0" />
                  {currentUser ? (
                    <span className="truncate font-bold text-xs">
                      {currentUser.name.split(' ')[0]}
                    </span>
                  ) : (
                    <span className="truncate">Connexion</span>
                  )}
                  {currentUser && (
                    <span className="hidden 2xl:inline text-[9px] px-1 py-0.2 rounded bg-[#F7C59F]/40 text-[#7c2d12] font-bold uppercase shrink-0">
                      {currentUser.role}
                    </span>
                  )}
                </Button>
              )}

              {/* AI Assistant Button */}
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
                className={`relative h-8.5 sm:h-9 px-2 sm:px-2.5 lg:px-3 text-xs gap-1 sm:gap-1.5 font-semibold transition-all shrink-0 ${
                  currentUser
                    ? 'border-orange-200/90 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 text-orange-800 shadow-2xs'
                    : 'border-[#F7C59F]/70 bg-[#F7C59F]/15 hover:bg-[#F7C59F]/30 text-[#BA5316]'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#BA5316] shrink-0" />
                <span className="hidden lg:inline">Assistant IA</span>
                <span className="hidden sm:inline lg:hidden">IA</span>
                {!currentUser && (
                  <span
                    title="Connexion requise"
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-700 text-white flex items-center justify-center sm:static sm:w-auto sm:h-auto sm:bg-transparent sm:text-slate-400 shrink-0"
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
                className="relative h-8.5 w-8.5 sm:h-9 sm:w-9 text-slate-700 shrink-0"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Button>

              {/* Desktop Direct Action Icons (Visible on xl+ screens where ample horizontal room exists) */}
              <div className="hidden xl:flex items-center gap-1.5">
                {/* Sound Toggle */}
                <Button
                  id="toggle-sound-btn"
                  variant="outline"
                  size="icon-sm"
                  onClick={onToggleSound}
                  title={soundEnabled ? 'Désactiver les alertes sonores' : 'Activer les alertes sonores'}
                  className={`h-9 w-9 transition-colors ${
                    soundEnabled
                      ? 'border-[#F7C59F] bg-[#F7C59F]/30 text-[#7c2d12] hover:bg-[#F7C59F]/50'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </Button>

                {/* Category & Tag Manager Button */}
                {onOpenCategoryTagManager && (
                  <Button
                    id="open-categories-modal-btn"
                    variant="outline"
                    size="icon-sm"
                    onClick={onOpenCategoryTagManager}
                    title="Gérer les Catégories et Étiquettes"
                    className="h-9 w-9 text-slate-700 hover:text-[#59240A] hover:bg-[#F7C59F]/20"
                  >
                    <FolderPlus className="w-4 h-4 text-[#BA5316]" />
                  </Button>
                )}

                {/* Export / iCal Button */}
                <Button
                  id="open-export-btn"
                  variant="outline"
                  size="icon-sm"
                  onClick={onOpenExportModal}
                  title="Exporter vers Calendrier (.ics) ou Sauvegarde"
                  className="h-9 w-9 text-slate-600"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>

              </div>

              {/* Desktop Adaptive Tools Dropdown Popover (For md to xl screens to prevent header overflow) */}
              <div ref={desktopToolsRef} className="relative hidden md:block xl:hidden">
                <Button
                  id="desktop-more-tools-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDesktopToolsOpen((prev) => !prev)}
                  title="Outils & Réglages supplémentaires"
                  className={`h-9 px-2.5 text-xs font-semibold gap-1 transition-all ${
                    isDesktopToolsOpen
                      ? 'border-[#F7C59F] bg-[#F7C59F]/20 text-[#59240A]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#BA5316]" />
                  <span className="hidden lg:inline">Outils</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDesktopToolsOpen ? 'rotate-180' : ''}`} />
                </Button>

                {isDesktopToolsOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2 py-1 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Outils & Configuration
                    </div>
                    <div className="py-1 space-y-0.5 text-xs">
                      {/* Sound Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          onToggleSound();
                          soundManager.playClickSound();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${soundEnabled ? 'bg-[#F7C59F]/40 text-[#59240A]' : 'bg-slate-100 text-slate-400'}`}>
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                          </div>
                          <span>Sons & Alertes</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${soundEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                          {soundEnabled ? 'Activé' : 'Coupé'}
                        </span>
                      </button>

                      {/* Categories & Tags */}
                      {onOpenCategoryTagManager && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenCategoryTagManager();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#F7C59F]/15 transition-colors font-semibold text-slate-700"
                        >
                          <div className="w-6 h-6 rounded-lg bg-[#F7C59F]/30 text-[#BA5316] flex items-center justify-center">
                            <FolderPlus className="w-3.5 h-3.5" />
                          </div>
                          <span>Catégories & Tags</span>
                        </button>
                      )}

                      {/* Export iCal */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsDesktopToolsOpen(false);
                          onOpenExportModal();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                        <span>Exporter (.ics)</span>
                      </button>

                    </div>
                  </div>
                )}
              </div>

              {/* Desktop New Task CTA Button */}
              <Button
                id="open-new-task-btn"
                size="sm"
                onClick={onOpenNewTaskModal}
                className="hidden md:inline-flex font-bold shadow-sm shadow-[#F7C59F]/40 h-9 shrink-0 gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden lg:inline">Nouvelle tâche</span>
                <span className="lg:hidden">Tâche</span>
              </Button>

              {/* Mobile Quick Options Menu Button (< md) */}
              <div className="relative md:hidden shrink-0">
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
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />

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

                        {/* Categories & Tags Management */}
                        {onOpenCategoryTagManager && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              onOpenCategoryTagManager();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F7C59F]/15 transition-colors text-xs font-semibold text-slate-700"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#F7C59F]/30 text-[#BA5316] flex items-center justify-center">
                                <FolderPlus className="w-3.5 h-3.5" />
                              </div>
                              <span>Catégories & Tags</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">Gérer</span>
                          </button>
                        )}

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

      {/* Mobile Floating Glass Speed-Dial Menu (Inspired by Amanga Store & Supabase) */}
      <MobileFloatingGlassMenu
        currentView={currentView}
        onViewChange={onViewChange}
        onOpenNewTaskModal={onOpenNewTaskModal}
        pendingTasksCount={pendingTasksCount}
      />
    </>
  );
};
