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
  Building,
  Printer,
  Sun,
  Moon,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { User } from '@/types/user';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';
import { MobileFloatingGlassMenu } from '@/components/MobileFloatingGlassMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/components/ThemeProvider';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTaskModal: () => void;
  onOpenAIModal: () => void;
  onOpenExportModal: () => void;
  onOpenNotifications: () => void;
  onOpenPostgresModal?: () => void;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  onOpenCategoryTagManager?: () => void;
  onOpenM365Modal?: () => void;
  onOpenReportModal?: () => void;
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
  onSignOut,
  onOpenCategoryTagManager,
  onOpenM365Modal,
  onOpenReportModal,
  currentUser,
  unreadNotificationsCount,
  soundEnabled,
  onToggleSound,
  pendingTasksCount = 0,
}) => {
  const { isDark, toggleTheme } = useTheme();
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
      setCurrentDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
      icon: <GitPullRequest className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 text-[#F77F00]" />,
    },
    {
      id: 'stats',
      label: 'Statistiques',
      shortLabel: 'Stats',
      icon: <BarChart3 className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />,
    },
    ...(currentUser?.role === 'admin'
      ? [
          {
            id: 'admin' as ViewMode,
            label: 'Admin',
            shortLabel: 'Admin',
            icon: <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 text-purple-600 dark:text-purple-400" />,
            special: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Top Application Bar - Visible on mobile (< md) */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-2xl border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 shadow-sm w-full max-w-full text-[#0B1F30] dark:text-white">
        <DottedGlowBackground
          className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-30 overflow-hidden"
          gap={14}
          radius={1.1}
          color="rgba(0, 66, 102, 0.25)"
          darkColor="rgba(56, 149, 201, 0.35)"
          glowColor="rgba(247, 127, 0, 0.5)"
          speedMin={0.4}
          speedMax={1.4}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 lg:gap-3 min-w-0">
            
            {/* 1. Brand Logo & Compact Live Clock */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
              <BrandLogo size="sm" />
              <div
                title={currentDateStr}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[11px] font-mono text-[#004266] dark:text-[#7CC4EB] font-semibold shrink-0 tabular-nums"
              >
                <Clock className="w-3 h-3 text-[#F77F00] shrink-0" />
                <span>{currentTime}</span>
              </div>
            </div>

            {/* 2. Desktop Primary Navigation Segment (hidden on mobile) */}
            <nav className="hidden md:flex items-center bg-[#EDF2F7] dark:bg-[#061826] p-0.5 lg:p-1 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-xs shrink-0">
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
                          ? 'bg-purple-600 text-white shadow-xs font-bold'
                          : 'bg-[#004266] text-white dark:bg-[#103049] shadow-xs font-bold'
                        : item.special
                          ? 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                          : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">{item.shortLabel}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          active ? 'bg-[#F77F00] text-white' : 'bg-white dark:bg-[#0B2438] text-[#004266] dark:text-[#7CC4EB]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 3. Right Action Tools & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Notification Bell */}
              <div className="relative inline-flex shrink-0">
                <Button
                  id="open-notifications-btn"
                  variant="outline"
                  size="icon-sm"
                  onClick={onOpenNotifications}
                  title="Centre de rappels & alertes"
                  className="h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 overflow-visible rounded-xl transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB]" />
                </Button>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 z-20 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs ring-2 ring-white dark:ring-[#0B2438] pointer-events-none whitespace-nowrap">
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
                    ? 'Assistant IA (Création intelligente & planificateur)'
                    : 'Assistant IA (Connexion requise)'
                }
                className="relative h-8.5 sm:h-9 px-2 sm:px-2.5 lg:px-3 text-xs gap-1.5 font-semibold transition-all shrink-0 rounded-xl cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB] shrink-0" />
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
                  className="h-8.5 sm:h-9 px-2 sm:px-2.5 text-xs font-semibold gap-1 rounded-xl transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
                  <span className="hidden xl:inline">Outils</span>
                  <ChevronDown
                    className={`w-3 h-3 text-[#486075] dark:text-slate-400 transition-transform ${
                      isDesktopToolsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>

                {isDesktopToolsOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#0B1F30] dark:text-slate-100">
                    <div className="px-2.5 py-1.5 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 text-[10px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                      Outils &amp; Préférences
                    </div>
                    <div className="py-1 space-y-1 text-xs">
                      <button
                        id="toggle-sound-btn"
                        type="button"
                        onClick={() => {
                          onToggleSound();
                          soundManager.playClickSound();
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors font-semibold cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                          </span>
                          <span>Sons &amp; Alertes</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#EDF2F7] dark:bg-[#061826] text-[#004266] dark:text-[#7CC4EB]">
                          {soundEnabled ? 'Activé' : 'Coupé'}
                        </span>
                      </button>

                      {onOpenCategoryTagManager && (
                        <button
                          id="open-categories-modal-btn"
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenCategoryTagManager();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors font-semibold cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                            <FolderPlus className="w-3.5 h-3.5" />
                          </span>
                          <span>Catégories &amp; Tags</span>
                        </button>
                      )}

                      <button
                        id="open-export-btn"
                        type="button"
                        onClick={() => {
                          setIsDesktopToolsOpen(false);
                          onOpenExportModal();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors font-semibold cursor-pointer"
                      >
                        <span className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                          <Download className="w-3.5 h-3.5" />
                        </span>
                        <span>Exporter l&apos;agenda (.ics)</span>
                      </button>

                      {onOpenReportModal && (
                        <button
                          id="open-report-btn"
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenReportModal();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                              <Printer className="w-3.5 h-3.5" />
                            </span>
                            <span>Rapport &amp; Synthèse Comité</span>
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB]">
                            PDF
                          </span>
                        </button>
                      )}

                      {onOpenM365Modal && (
                        <button
                          id="open-m365-btn"
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenM365Modal();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-900/60 text-[#004266] dark:text-sky-300 flex items-center justify-center">
                              <Building className="w-3.5 h-3.5" />
                            </span>
                            <span>Microsoft 365</span>
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-900/60 text-[#004266] dark:text-sky-200">
                            M365
                          </span>
                        </button>
                      )}

                      {onOpenPostgresModal && currentUser?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDesktopToolsOpen(false);
                            onOpenPostgresModal();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors font-semibold cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-900/60 text-[#004266] dark:text-sky-300 flex items-center justify-center">
                            <Database className="w-3.5 h-3.5" />
                          </span>
                          <span>Diagnostic Base SQL</span>
                        </button>
                      )}

                      {currentUser?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playClickSound();
                            setIsDesktopToolsOpen(false);
                            onViewChange('admin');
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors font-semibold text-purple-700 dark:text-purple-200 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 mt-1 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                              <Shield className="w-3.5 h-3.5" />
                            </span>
                            <span>Espace Admin</span>
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 uppercase">
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
                      className="flex items-center gap-1.5 px-2 py-1 h-8.5 sm:h-9 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#061826]/70 hover:border-[#004266]/40 dark:hover:border-[#3895C9]/50 transition-colors shrink-0 max-w-[130px] sm:max-w-[150px] cursor-pointer"
                    >
                      <span className="w-6 h-6 rounded-lg bg-[#004266] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                      <span className="truncate font-bold text-xs text-[#0B1F30] dark:text-slate-100">
                        {currentUser.name.split(' ')[0]}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-[#486075] dark:text-slate-400 shrink-0 transition-transform ${
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
                      className="font-bold px-2.5 sm:px-3 h-8.5 sm:h-9 text-xs gap-1.5 shrink-0 rounded-xl cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Connexion</span>
                    </Button>
                  )}

                  {/* User Profile Popover */}
                  {isUserMenuOpen && currentUser && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#0B1F30] dark:text-slate-100">
                      <div className="p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#004266] text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#0B1F30] dark:text-white truncate">
                            {currentUser.name}
                          </span>
                          <span className="text-[11px] text-[#486075] dark:text-slate-300 truncate">
                            {currentUser.email}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] font-semibold">
                              {currentUser.department || 'Général'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-bold uppercase">
                              {currentUser.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-1 mt-1 space-y-0.5 text-xs">
                        {currentUser.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClickSound();
                              setIsUserMenuOpen(false);
                              onViewChange('admin');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-200 font-semibold transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Espace Administration</span>
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200">
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
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] font-semibold transition-colors cursor-pointer"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                          <span>Gérer le profil</span>
                        </button>

                        <button
                          id="header-signout-btn"
                          type="button"
                          onClick={() => {
                            soundManager.playClickSound();
                            setIsUserMenuOpen(false);
                            if (onSignOut) {
                              onSignOut();
                            } else {
                              onOpenAuthModal();
                            }
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold transition-colors border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 mt-1 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Se déconnecter</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop New Task CTA Button */}
              <Button
                id="open-new-task-btn"
                variant="accent"
                size="sm"
                onClick={onOpenNewTaskModal}
                className="hidden md:inline-flex font-bold h-8.5 sm:h-9 shrink-0 gap-1.5 px-2.5 lg:px-3 rounded-xl transition-all cursor-pointer"
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
                  className="h-8.5 w-8.5 rounded-xl transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
                </Button>

                {isMobileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />

                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#0B1F30] dark:text-slate-100">
                      <div className="px-2.5 py-1.5 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                          Options &amp; Réglages
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="p-1 rounded-md text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="py-1 space-y-1">
                        {/* Theme Switch Toggle (Mobile) */}
                        <button
                          id="mobile-toggle-theme-btn"
                          type="button"
                          onClick={(e) => {
                            soundManager.playClickSound();
                            toggleTheme(e);
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#004266]/10 dark:bg-[#F77F00]/20 flex items-center justify-center">
                              {isDark ? (
                                <Sun className="w-3.5 h-3.5 text-[#F77F00]" />
                              ) : (
                                <Moon className="w-3.5 h-3.5 text-[#004266]" />
                              )}
                            </span>
                            <span>Apparence</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isDark
                                ? 'bg-[#F77F00]/20 text-[#FFB35C] border border-[#F77F00]/40'
                                : 'bg-[#004266]/10 text-[#004266] border border-[#004266]/25'
                            }`}
                          >
                            {isDark ? 'Sombre' : 'Clair'}
                          </span>
                        </button>

                        {/* Sound Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            onToggleSound();
                            soundManager.playClickSound();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                              {soundEnabled ? (
                                <Volume2 className="w-3.5 h-3.5" />
                              ) : (
                                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </span>
                            <span>Alertes sonores</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF2F7] dark:bg-[#061826] text-[#004266] dark:text-[#7CC4EB]">
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
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors text-xs font-semibold cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                                <FolderPlus className="w-3.5 h-3.5" />
                              </span>
                              <span>Catégories &amp; Tags</span>
                            </span>
                            <span className="text-[10px] text-[#486075] dark:text-slate-400 font-bold">Gérer</span>
                          </button>
                        )}

                        {/* Export iCal */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            onOpenExportModal();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors text-xs font-semibold cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                              <Download className="w-3.5 h-3.5" />
                            </span>
                            <span>Export iCal (.ics)</span>
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            Agenda
                          </Badge>
                        </button>

                        {/* Executive Report PDF */}
                        {onOpenReportModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              onOpenReportModal();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors text-xs font-semibold text-[#004266] dark:text-[#7CC4EB] cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 flex items-center justify-center">
                                <Printer className="w-3.5 h-3.5" />
                              </span>
                              <span>Rapport &amp; Synthèse Comité</span>
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB]">
                              PDF
                            </span>
                          </button>
                        )}

                        {/* Microsoft 365 Hub */}
                        {onOpenM365Modal && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              onOpenM365Modal();
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors text-xs font-semibold cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-900/60 text-[#004266] dark:text-sky-300 flex items-center justify-center">
                                <Building className="w-3.5 h-3.5" />
                              </span>
                              <span>Microsoft 365</span>
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/60 text-[#004266] dark:text-sky-200">
                              M365
                            </span>
                          </button>
                        )}

                        {/* Dedicated Admin Interface Option */}
                        {currentUser?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playClickSound();
                              setIsMobileMenuOpen(false);
                              onViewChange('admin');
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-200 transition-colors text-xs font-semibold border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 mt-1 cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                                <Shield className="w-3.5 h-3.5" />
                              </span>
                              <span>Administration</span>
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 uppercase">
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

      {/* Mobile Floating Glass Speed-Dial Menu */}
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
