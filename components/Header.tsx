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
  Shield,
  GitPullRequest,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { User } from '@/types/user';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);

  const desktopToolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close desktop dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopToolsRef.current && !desktopToolsRef.current.contains(target)) {
        setIsDesktopToolsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isDesktopToolsOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktopToolsOpen, isUserMenuOpen]);

  // Primary workspace tabs with responsive labels
  const navItems: {
    id: ViewMode;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
    special?: boolean;
  }[] = [
    {
      id: 'list',
      label: 'Tâches',
      shortLabel: 'Tâches',
      icon: <CheckSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'kanban',
      label: 'Tableau',
      shortLabel: 'Tableau',
      icon: <LayoutGrid className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />,
    },
    {
      id: 'calendar',
      label: 'Calendrier',
      shortLabel: 'Agenda',
      icon: <CalendarIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />,
    },
    {
      id: 'review' as ViewMode,
      label: 'Revue Métier',
      shortLabel: 'Revue',
      icon: <GitPullRequest className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 text-emerald-400" />,
    },
    {
      id: 'stats',
      label: 'Statistiques',
      shortLabel: 'Stats',
      icon: <BarChart3 className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />,
    },
    // Include Admin in tabs if user is admin or already in admin view
    ...(currentUser?.role === 'admin' || currentView === 'admin'
      ? [
          {
            id: 'admin' as ViewMode,
            label: 'Admin',
            shortLabel: 'Admin',
            icon: <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 text-purple-600" />,
            special: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Top Application Bar - Visible only on mobile (< md), while desktop and tablet use the Left Sidebar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#061A13]/90 backdrop-blur-2xl border-b border-emerald-500/20 shadow-xl w-full max-w-full text-white">
        <DottedGlowBackground
          className="pointer-events-none absolute inset-0 opacity-30 overflow-hidden"
          gap={12}
          radius={1.2}
          color="rgba(16, 185, 129, 0.4)"
          glowColor="rgba(16, 185, 129, 0.9)"
          speedMin={0.4}
          speedMax={1.4}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 lg:gap-3 min-w-0">
            
            {/* 1. Brand Logo & Compact Live Clock */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0 font-bold">
                <CalendarIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.3]" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                  Planit
                </span>
                {/* Minimalist Live Clock Pill */}
                <div
                  title={currentDateStr}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono text-emerald-200 font-semibold shrink-0"
                >
                  <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>

            {/* 2. Desktop Primary Navigation Segment (Ergonomic, auto-fitting) */}
            <nav className="hidden md:flex items-center bg-emerald-950/60 p-0.5 lg:p-1 rounded-xl border border-emerald-500/20 shadow-xs shrink-0">
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
                    className={`flex items-center gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1 lg:py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                      active
                        ? item.special
                          ? 'bg-purple-500/20 text-purple-300 shadow-xs border border-purple-500/30 font-bold'
                          : 'bg-emerald-500/20 text-emerald-300 shadow-xs border border-emerald-500/40 font-bold'
                        : item.special
                          ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                          : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">{item.shortLabel}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          active ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-950 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 3. Right Action Tools & Controls - Unified & Non-Overflowing */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Notification Bell */}
              <div className="relative inline-flex shrink-0">
                <Button
                  id="open-notifications-btn"
                  variant="outline"
                  size="icon-sm"
                  onClick={onOpenNotifications}
                  title="Centre de rappels & alertes"
                  className="h-8.5 w-8.5 sm:h-9 sm:w-9 text-emerald-200 border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 hover:text-white shrink-0 overflow-visible rounded-xl transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-emerald-300" />
                </Button>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 z-20 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs ring-2 ring-slate-900 animate-pulse pointer-events-none whitespace-nowrap">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </div>

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
                    ? 'Assistant IA Gemini (Création intelligente & planificateur)'
                    : 'Assistant IA (Connexion requise pour utiliser Gemini)'
                }
                className="relative h-8.5 sm:h-9 px-2 sm:px-2.5 lg:px-3 text-xs gap-1.5 font-semibold transition-all shrink-0 rounded-xl border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 shadow-md backdrop-blur-md cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="hidden xl:inline">Assistant IA</span>
                <span className="inline xl:hidden font-bold">IA</span>
                {!currentUser && (
                  <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                )}
              </Button>

              {/* Universal Desktop Tools Popover */}
              <div ref={desktopToolsRef} className="relative hidden md:block">
                <Button
                  id="desktop-more-tools-btn"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDesktopToolsOpen((prev) => !prev)}
                  title="Outils, sons & export"
                  className={`h-8.5 sm:h-9 px-2 sm:px-2.5 text-xs font-semibold gap-1 rounded-xl transition-all cursor-pointer ${
                    isDesktopToolsOpen
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-emerald-500/30 bg-emerald-950/40 text-slate-200 hover:bg-emerald-500/20 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden xl:inline">Outils</span>
                  <ChevronDown
                    className={`w-3 h-3 text-slate-400 transition-transform ${
                      isDesktopToolsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>

                {isDesktopToolsOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#061A13]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100">
                    <div className="px-2.5 py-1.5 border-b border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Outils & Préférences
                    </div>
                    <div className="py-1 space-y-1 text-xs">
                      {/* Sound Toggle */}
                      <button
                        id="toggle-sound-btn"
                        type="button"
                        onClick={() => {
                          onToggleSound();
                          soundManager.playClickSound();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-500/20 transition-colors font-semibold text-slate-200 hover:text-white cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-950 text-slate-500'
                            }`}
                          >
                            {soundEnabled ? (
                              <Volume2 className="w-3.5 h-3.5" />
                            ) : (
                              <VolumeX className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span>Sons & Alertes</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {soundEnabled ? 'Activé' : 'Coupé'}
                        </span>
                      </button>

                      {/* Categories & Tags */}
                      {onOpenCategoryTagManager && (
                        <button
                          id="open-categories-modal-btn"
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenCategoryTagManager();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/20 transition-colors font-semibold text-slate-200 hover:text-white cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                            <FolderPlus className="w-3.5 h-3.5" />
                          </div>
                          <span>Catégories & Tags</span>
                        </button>
                      )}

                      {/* Export iCal */}
                      <button
                        id="open-export-btn"
                        type="button"
                        onClick={() => {
                          setIsDesktopToolsOpen(false);
                          onOpenExportModal();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/20 transition-colors font-semibold text-slate-200 hover:text-white cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
                          <Download className="w-3.5 h-3.5" />
                        </div>
                        <span>Exporter l&apos;agenda (.ics)</span>
                      </button>

                      {/* Diagnostic Postgres if applicable */}
                      {onOpenPostgresModal && currentUser?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenPostgresModal();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700"
                        >
                          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Database className="w-3.5 h-3.5" />
                          </div>
                          <span>Diagnostic Base SQL</span>
                        </button>
                      )}

                      {/* Administration link inside tools */}
                      {currentUser?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClickSound();
                            setIsDesktopToolsOpen(false);
                            onViewChange('admin');
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 transition-colors font-semibold text-purple-900 border-t border-slate-100 mt-1"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                              <Shield className="w-3.5 h-3.5" />
                            </div>
                            <span>Espace Admin</span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900 uppercase">
                            Admin
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Account / Profile Dropdown Menu */}
              {onOpenAuthModal && (
                <div ref={userMenuRef} className="relative">
                  {currentUser ? (
                    <button
                      id="open-auth-modal-btn"
                      type="button"
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      title={`Connecté : ${currentUser.name} (${currentUser.role})`}
                      className={`flex items-center gap-1.5 px-2 py-1 h-8.5 sm:h-9 rounded-xl border transition-colors shrink-0 max-w-[130px] sm:max-w-[150px] cursor-pointer ${
                        isUserMenuOpen
                          ? 'border-emerald-400 bg-emerald-500/20 text-white'
                          : 'border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 text-slate-100'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/40">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="truncate font-bold text-xs text-slate-100">
                        {currentUser.name.split(' ')[0]}
                      </span>
                      {currentUser.role === 'admin' && (
                        <span className="hidden xl:inline-flex text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase shrink-0">
                          Admin
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3 h-3 text-emerald-400 shrink-0 transition-transform ${
                          isUserMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  ) : (
                    <Button
                      id="open-auth-modal-btn"
                      variant="default"
                      size="sm"
                      onClick={onOpenAuthModal}
                      title="Se connecter ou créer un compte"
                      className="font-bold px-2.5 sm:px-3 h-8.5 sm:h-9 text-xs gap-1.5 shadow-md shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Connexion</span>
                    </Button>
                  )}

                  {/* User Profile Popover */}
                  {isUserMenuOpen && currentUser && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#061A13]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100">
                      {/* User Info Header */}
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/30 text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-500/40">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            {currentUser.name}
                          </span>
                          <span className="text-[11px] text-slate-300 truncate">
                            {currentUser.email}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                              {currentUser.department || 'Général'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold uppercase">
                              {currentUser.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="py-1 mt-1 space-y-0.5 text-xs">
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClickSound();
                              setIsUserMenuOpen(false);
                              onViewChange('admin');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 text-purple-900 font-semibold transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-purple-600" />
                              <span>Espace Administration</span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                              Ouvrir
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenAuthModal();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold transition-colors border-t border-slate-100 mt-1"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Gérer le profil / Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop New Task CTA Button */}
              <Button
                id="open-new-task-btn"
                size="sm"
                onClick={onOpenNewTaskModal}
                className="hidden md:inline-flex bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 backdrop-blur-md shadow-md h-8.5 sm:h-9 shrink-0 gap-1.5 px-2.5 lg:px-3 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden xl:inline">Nouvelle tâche</span>
                <span className="xl:hidden">Tâche</span>
              </Button>

              {/* Mobile Quick Options Menu Button (< md) */}
              <div className="relative md:hidden shrink-0">
                <Button
                  id="mobile-options-menu-btn"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  title="Options & Paramètres"
                  className={`h-8.5 w-8.5 rounded-xl transition-colors ${
                    isMobileMenuOpen
                      ? 'border-emerald-400 bg-emerald-500/20 text-white'
                      : 'border-emerald-500/30 bg-emerald-950/40 text-slate-200 hover:bg-emerald-500/20 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" />
                </Button>

                {/* Mobile Dropdown Popover */}
                {isMobileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />

                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#061A13]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-100">
                      <div className="px-2.5 py-1.5 border-b border-emerald-500/20 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          Options & Réglages
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="p-1 rounded-md text-slate-400 hover:text-white"
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
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-500/20 transition-colors text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                soundEnabled
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-emerald-950 text-slate-500'
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
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
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
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-emerald-500/20 transition-colors text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
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

                        {/* Dedicated Admin Interface Option */}
                        {currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClickSound();
                              setIsMobileMenuOpen(false);
                              onViewChange('admin');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 text-purple-900 transition-colors text-xs font-semibold border-t border-slate-100 mt-1"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                                <Shield className="w-3.5 h-3.5" />
                              </div>
                              <span>Administration</span>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 uppercase">
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
        currentUser={currentUser}
      />
    </>
  );
};

