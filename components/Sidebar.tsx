'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  FolderPlus,
  Shield,
  GitPullRequest,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Lock,
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
import { usePWAInstall } from '@/components/pwa/usePWAInstall';
import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/components/ThemeProvider';
import {
  SIDEBAR_HOVER_DELAY_MS,
  computeSidebarVisualState,
} from '@/lib/sidebar-layout';

export interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  activeModal?: 'report' | 'categories' | 'm365' | 'ai' | 'export' | 'postgres' | null;
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  activeModal = null,
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
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const { isDark, toggleTheme } = useTheme();

  // Support either controlled or local collapse state
  const [localCollapsed, setLocalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : localCollapsed;

  // Hover-intent floating drawer state (200ms debounce to avoid accidental flicker)
  const [isHoverExpanded, setIsHoverExpanded] = useState<boolean>(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerInsideRef = useRef<boolean>(false);

  const clearHoverTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const { isVisuallyCollapsed, isFloatingHoverDrawer } = computeSidebarVisualState(
    isCollapsed,
    isHoverExpanded
  );

  const toggleCollapse = () => {
    soundManager.playClickSound();
    clearHoverTimers();
    setIsHoverExpanded(false);
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { isCompatible, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const handleMouseEnter = () => {
    isPointerInsideRef.current = true;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!isCollapsed || isHoverExpanded) return;
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null;
      setIsHoverExpanded(true);
    }, SIDEBAR_HOVER_DELAY_MS);
  };

  const handleMouseLeave = () => {
    isPointerInsideRef.current = false;
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!isCollapsed || !isHoverExpanded || isUserMenuOpen) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsHoverExpanded(false);
    }, SIDEBAR_HOVER_DELAY_MS);
  };

  // Close hover drawer cleanly once user profile popover closes while pointer is outside
  useEffect(() => {
    if (isUserMenuOpen || isPointerInsideRef.current || !isCollapsed || !isHoverExpanded) return;
    const timer = setTimeout(() => {
      if (!isPointerInsideRef.current) {
        setIsHoverExpanded(false);
      }
    }, SIDEBAR_HOVER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isUserMenuOpen, isCollapsed, isHoverExpanded]);

  // Live time & date
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

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const navItems: {
    id: ViewMode;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    special?: boolean;
  }[] = [
    {
      id: 'list',
      label: 'Tâches',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'kanban',
      label: 'Tableau Kanban',
      icon: <LayoutGrid className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'calendar',
      label: 'Calendrier',
      icon: <CalendarIcon className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'review' as ViewMode,
      label: 'Revue Métier',
      icon: <GitPullRequest className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'stats',
      label: 'Statistiques',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    ...(currentUser?.role === 'admin'
      ? [
          {
            id: 'admin' as ViewMode,
            label: 'Administration',
            icon: <Shield className="w-4 h-4 shrink-0" />,
            special: true,
          },
        ]
      : []),
  ];

  return (
    <aside
      id="main-desktop-sidebar"
      className={`hidden md:block shrink-0 select-none transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFloatingHoverDrawer ? 'z-40' : 'z-30'
      } ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`md:fixed md:top-0 md:bottom-0 md:left-0 md:h-dvh flex flex-col bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-2xl border-r border-[#D8E2EC] dark:border-[#94B8D6]/18 text-[#0B1F30] dark:text-slate-100 transition-[width,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFloatingHoverDrawer
            ? 'z-40 w-64 shadow-[24px_0_60px_-15px_rgba(0,66,102,0.18)] dark:shadow-[24px_0_60px_-15px_rgba(0,0,0,0.85)] border-[#004266]/25 dark:border-[#3895C9]/40'
            : isVisuallyCollapsed
              ? 'z-30 w-20 shadow-md shadow-[#004266]/5 dark:shadow-black/50'
              : 'z-30 w-64 shadow-lg shadow-[#004266]/5 dark:shadow-black/40'
        }`}
      >
      {/* 1. Header: Official Brand Logo & Discreet Collapse Toggle */}
      <div className="min-h-16 px-3.5 py-2.5 flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 shrink-0">
        {isVisuallyCollapsed ? (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={toggleCollapse}
              title="Agrandir la barre latérale — La Maison de la Fiscalité"
              aria-label="Agrandir la barre latérale"
              className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <BrandLogo compact size="md" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full min-w-0 gap-2">
            <div className="flex flex-col min-w-0">
              <BrandLogo size="sm" />
              <span className="text-[10px] font-semibold text-[#486075] dark:text-[#9FB3C8] truncate mt-1 whitespace-nowrap tracking-tight">
                La Maison de la Fiscalité
              </span>
            </div>

            {/* Discreet Collapse / Pin Toggle Button */}
            {isCollapsed ? (
              <button
                id="pin-sidebar-btn"
                type="button"
                onClick={toggleCollapse}
                title="Maintenir la barre latérale ouverte"
                aria-label="Maintenir la barre latérale ouverte"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#004266] dark:text-[#7CC4EB] hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors active:scale-95 shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Fixer</span>
              </button>
            ) : (
              <button
                id="collapse-sidebar-btn"
                type="button"
                onClick={toggleCollapse}
                title="Réduire la barre latérale"
                aria-label="Réduire la barre latérale"
                className="p-1.5 rounded-lg text-[#486075] dark:text-slate-400 hover:text-[#004266] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Top Banner / Live Clock (Expanded Only) */}
      {!isVisuallyCollapsed && (
        <div className="px-4 py-2 bg-[#F4F7FA] dark:bg-[#061826]/60 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 flex items-center justify-between text-xs font-mono whitespace-nowrap shrink-0 animate-in fade-in duration-200">
          <span className="truncate text-[#486075] dark:text-slate-300 font-medium">{currentDateStr}</span>
          <div className="flex items-center gap-1 font-semibold text-[#004266] dark:text-[#7CC4EB] shrink-0 tabular-nums">
            <Clock className="w-3 h-3 text-[#F77F00]" />
            <span>{currentTime}</span>
          </div>
        </div>
      )}

      {/* 3. Primary CTA: + Nouvelle tâche (Official Accent Orange #F77F00) */}
      <div className="p-3 shrink-0">
        {!isVisuallyCollapsed ? (
          <Button
            id="open-new-task-btn"
            variant="accent"
            onClick={onOpenNewTaskModal}
            className="w-full font-bold shadow-md shadow-[#F77F00]/20 h-10 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] whitespace-nowrap animate-in fade-in duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouvelle tâche</span>
          </Button>
        ) : (
          <Button
            id="open-new-task-btn"
            variant="accent"
            onClick={onOpenNewTaskModal}
            title="Nouvelle tâche"
            size="icon"
            className="w-full h-10 rounded-xl shadow-md shadow-[#F77F00]/20 flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </Button>
        )}
      </div>

      {/* 4. Scrollable Middle Section: Navigation & Tools */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-6 custom-scrollbar">
        
        {/* Navigation Group */}
        <div>
          {!isVisuallyCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#486075] dark:text-[#7CC4EB]/80 whitespace-nowrap animate-in fade-in duration-200">
              Espace de travail
            </div>
          )}
          <nav className="space-y-1">
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
                  title={isVisuallyCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                    active
                      ? 'bg-[#004266] text-white dark:bg-[#103049] dark:text-white border border-[#004266] dark:border-[#3895C9]/50 font-bold shadow-sm'
                      : item.special
                        ? 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/25 border border-transparent hover:border-purple-200 dark:hover:border-purple-500/30'
                        : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 border border-transparent'
                  } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <span
                    className={`transition-colors shrink-0 ${
                      active
                        ? 'text-[#F77F00]'
                        : item.special
                          ? 'text-purple-600 dark:text-purple-400'
                          : item.id === 'review'
                            ? 'text-[#F77F00]'
                            : 'text-[#486075] dark:text-slate-400 group-hover:text-[#004266] dark:group-hover:text-[#7CC4EB]'
                    }`}
                  >
                    {item.icon}
                  </span>

                  {!isVisuallyCollapsed && (
                    <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">{item.label}</span>
                  )}

                  {!isVisuallyCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums shrink-0 animate-in fade-in duration-200 ${
                        active
                          ? 'bg-[#F77F00] text-white font-black shadow-xs'
                          : 'bg-[#EDF2F7] dark:bg-[#061826] text-[#004266] dark:text-[#7CC4EB] border border-[#D8E2EC] dark:border-[#3895C9]/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* AI Assistant Banner / Button */}
        <div>
          {!isVisuallyCollapsed ? (
            <div className={`p-3 rounded-2xl shadow-sm animate-in fade-in duration-200 transition-all ${
              activeModal === 'ai'
                ? 'bg-[#004266]/8 dark:bg-[#103049] border-2 border-[#F77F00]'
                : 'bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/20'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center border border-[#004266]/20 dark:border-[#3895C9]/30">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[#0B1F30] dark:text-white whitespace-nowrap">Assistant IA</span>
              </div>
              <p className="text-[11px] text-[#486075] dark:text-slate-300 leading-tight mb-2.5">
                Planification intelligente &amp; structuration des tâches.
              </p>
              <Button
                id="open-ai-assistant-btn"
                variant={activeModal === 'ai' ? 'accent' : 'default'}
                size="sm"
                onClick={() => {
                  if (!currentUser && onOpenAuthModal) {
                    onOpenAuthModal();
                  } else {
                    onOpenAIModal();
                  }
                }}
                className="w-full h-8 text-xs font-bold rounded-lg shadow-xs gap-1.5 whitespace-nowrap cursor-pointer transition-all"
              >
                <span>Ouvrir l&apos;assistant</span>
                {!currentUser && <Lock className="w-2.5 h-2.5 opacity-80" />}
              </Button>
            </div>
          ) : (
            <button
              id="open-ai-assistant-btn"
              type="button"
              onClick={() => {
                if (!currentUser && onOpenAuthModal) {
                  onOpenAuthModal();
                } else {
                  onOpenAIModal();
                }
              }}
              title="Assistant IA"
              className={`w-full h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeModal === 'ai'
                  ? 'bg-[#F77F00] text-white border border-[#F77F00] shadow-md'
                  : 'bg-[#004266]/10 dark:bg-[#103049] hover:bg-[#004266] hover:text-white text-[#004266] dark:text-[#7CC4EB] border border-[#D8E2EC] dark:border-[#3895C9]/30'
              }`}
            >
              <Bot className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Organisation & Tools */}
        <div>
          {!isVisuallyCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#486075] dark:text-[#7CC4EB]/80 whitespace-nowrap animate-in fade-in duration-200">
              Organisation &amp; Préférences
            </div>
          )}
          <div className="space-y-1">
            {/* Category & Tag Manager */}
            {onOpenCategoryTagManager && (
              <button
                id="open-categories-modal-btn"
                type="button"
                onClick={onOpenCategoryTagManager}
                title={isVisuallyCollapsed ? 'Catégories & Tags' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  activeModal === 'categories'
                    ? 'bg-[#004266] text-white dark:bg-[#103049] border border-[#004266] dark:border-[#3895C9]/50 font-bold shadow-sm'
                    : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 border border-transparent'
                } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
              >
                <FolderPlus className={`w-4 h-4 shrink-0 transition-colors ${
                  activeModal === 'categories' ? 'text-[#F77F00]' : 'text-[#486075] dark:text-slate-400 group-hover:text-[#004266] dark:group-hover:text-[#7CC4EB]'
                }`} />
                {!isVisuallyCollapsed && <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Catégories &amp; Tags</span>}
              </button>
            )}

            {/* Export iCal */}
            <button
              id="open-export-btn"
              type="button"
              onClick={onOpenExportModal}
              title={isVisuallyCollapsed ? 'Exporter (.ics)' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                activeModal === 'export'
                  ? 'bg-[#004266] text-white dark:bg-[#103049] border border-[#004266] dark:border-[#3895C9]/50 font-bold shadow-sm'
                  : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 border border-transparent'
              } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
            >
              <Download className={`w-4 h-4 shrink-0 transition-colors ${
                activeModal === 'export' ? 'text-[#F77F00]' : 'text-[#486075] dark:text-slate-400 group-hover:text-[#004266] dark:group-hover:text-[#7CC4EB]'
              }`} />
              {!isVisuallyCollapsed && <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Exporter (.ics)</span>}
            </button>

            {/* Executive Report & PDF Button */}
            {onOpenReportModal && (
              <button
                id="open-report-sidebar-btn"
                type="button"
                onClick={() => {
                  soundManager.playClickSound();
                  onOpenReportModal();
                }}
                title={isVisuallyCollapsed ? 'Rapport & Synthèse Comité (PDF)' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  activeModal === 'report'
                    ? 'bg-[#004266] text-white dark:bg-[#103049] border border-[#004266] dark:border-[#3895C9]/50 font-bold shadow-sm'
                    : 'text-[#004266] dark:text-[#7CC4EB] hover:bg-[#004266]/8 dark:hover:bg-[#103049]/60 border border-transparent'
                } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Printer className={`w-4 h-4 shrink-0 transition-colors ${
                  activeModal === 'report' ? 'text-[#F77F00]' : 'text-[#004266] dark:text-[#3895C9]'
                }`} />
                {!isVisuallyCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">
                      Rapport &amp; Synthèse
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border transition-colors ${
                      activeModal === 'report'
                        ? 'bg-[#F77F00] text-white border-[#F77F00] font-black'
                        : 'bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border-[#004266]/25 dark:border-[#3895C9]/40'
                    }`}>
                      PDF
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Microsoft 365 Hub */}
            {onOpenM365Modal && (
              <button
                id="open-m365-sidebar-btn"
                type="button"
                onClick={onOpenM365Modal}
                title={isVisuallyCollapsed ? 'Microsoft 365 (Office, Outlook)' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  activeModal === 'm365'
                    ? 'bg-[#004266] text-white dark:bg-[#103049] border border-[#004266] dark:border-[#3895C9]/50 font-bold shadow-sm'
                    : 'text-[#486075] dark:text-slate-300 hover:text-[#004266] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 border border-transparent'
                } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Building className={`w-4 h-4 shrink-0 transition-colors ${
                  activeModal === 'm365' ? 'text-[#F77F00]' : 'text-[#004266] dark:text-[#3895C9]'
                }`} />
                {!isVisuallyCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Microsoft 365</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border transition-colors ${
                      activeModal === 'm365'
                        ? 'bg-[#F77F00] text-white border-[#F77F00] font-black'
                        : 'bg-sky-50 dark:bg-sky-900/50 text-[#004266] dark:text-sky-200 border-sky-200 dark:border-sky-500/40'
                    }`}>
                      M365
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Sound Toggle */}
            <button
              id="toggle-sound-btn"
              type="button"
              onClick={() => {
                onToggleSound();
                soundManager.playClickSound();
              }}
              title={isVisuallyCollapsed ? (soundEnabled ? 'Alertes sonores activées' : 'Alertes sonores coupées') : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 transition-colors group cursor-pointer ${
                isVisuallyCollapsed ? 'justify-center px-2' : ''
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#004266] dark:text-[#3895C9] shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              {!isVisuallyCollapsed && (
                <>
                  <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Alertes sonores</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap animate-in fade-in duration-200 ${
                      soundEnabled
                        ? 'bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/25 dark:border-[#3895C9]/40'
                        : 'bg-[#EDF2F7] dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {soundEnabled ? 'Activé' : 'Coupé'}
                  </span>
                </>
              )}
            </button>

            {/* PWA Install Button */}
            {isCompatible && !isInstalled && (
              <button
                id="sidebar-pwa-install-btn"
                type="button"
                onClick={async () => {
                  soundManager.playClickSound();
                  if (isIOS) {
                    window.dispatchEvent(new CustomEvent('planit:pwa-manual-install'));
                    return;
                  }
                  const outcome = await promptInstall();
                  if (outcome === 'unavailable') {
                    window.dispatchEvent(new CustomEvent('planit:pwa-manual-install'));
                  }
                }}
                title={isVisuallyCollapsed ? "Installer l'application La Maison de la Fiscalité" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#C26200] dark:text-[#FFB35C] bg-[#F77F00]/10 hover:bg-[#F77F00]/20 border border-[#F77F00]/35 transition-colors group cursor-pointer ${
                  isVisuallyCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <Download className="w-4 h-4 text-[#F77F00] shrink-0" />
                {!isVisuallyCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left font-bold whitespace-nowrap animate-in fade-in duration-200">Installer l&apos;app</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#F77F00] text-white whitespace-nowrap animate-in fade-in duration-200">
                      PWA
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Database Diagnostic for Admin */}
            {onOpenPostgresModal && currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={onOpenPostgresModal}
                title={isVisuallyCollapsed ? 'Diagnostic Base SQL' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  activeModal === 'postgres'
                    ? 'bg-[#004266] text-white dark:bg-[#103049] border border-[#004266] dark:border-[#3895C9]/50 font-bold shadow-sm'
                    : 'text-[#004266] dark:text-[#7CC4EB] hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 border border-[#D8E2EC] dark:border-[#3895C9]/20'
                } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Database className={`w-4 h-4 shrink-0 transition-colors ${
                  activeModal === 'postgres' ? 'text-[#F77F00]' : 'text-[#004266] dark:text-[#3895C9]'
                }`} />
                {!isVisuallyCollapsed && <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Diagnostic Base SQL</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Notifications & User Profile */}
      <div className="p-3 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 bg-[#F4F7FA]/80 dark:bg-[#061826]/70 backdrop-blur-md shrink-0 space-y-2">
        
        {/* Notifications Bar */}
        <button
          id="open-notifications-btn"
          type="button"
          onClick={onOpenNotifications}
          title="Centre de notifications et rappels"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#486075] dark:text-slate-300 hover:bg-white dark:hover:bg-[#103049] hover:text-[#0B1F30] dark:hover:text-white border border-transparent hover:border-[#D8E2EC] dark:hover:border-[#94B8D6]/25 transition-all cursor-pointer ${
            isVisuallyCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <span className="relative inline-flex shrink-0">
            <Bell className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-1 ring-white dark:ring-[#061826]">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </span>

          {!isVisuallyCollapsed && (
            <>
              <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Notifications</span>
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold tabular-nums animate-in fade-in duration-200">
                  {unreadNotificationsCount}
                </Badge>
              )}
            </>
          )}
        </button>

        {/* User Profile Card */}
        {onOpenAuthModal && (
          <div ref={userMenuRef} className="relative">
            {currentUser ? (
              <div
                id="open-auth-modal-btn"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                title={`Connecté : ${currentUser.name} (${currentUser.role})`}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 hover:border-[#004266]/45 dark:hover:border-[#3895C9]/60 cursor-pointer transition-colors shadow-2xs ${
                  isVisuallyCollapsed ? 'justify-center p-1.5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#004266] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>

                {!isVisuallyCollapsed && (
                  <>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-[#0B1F30] dark:text-white truncate whitespace-nowrap animate-in fade-in duration-200">
                        {currentUser.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] truncate whitespace-nowrap ${
                          currentUser.role === 'admin'
                            ? 'text-purple-700 dark:text-purple-300 font-semibold'
                            : 'text-[#486075] dark:text-slate-400 font-medium'
                        }`}>
                          {currentUser.role === 'admin' ? 'Administrateur' : currentUser.role}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#486075] dark:text-slate-400 shrink-0 transition-transform ${
                        isUserMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </>
                )}
              </div>
            ) : (
              <Button
                id="open-auth-modal-btn"
                variant="default"
                size="sm"
                onClick={onOpenAuthModal}
                title="Se connecter"
                className={`w-full font-bold h-9 rounded-xl text-xs gap-1.5 ${
                  isVisuallyCollapsed ? 'px-0' : ''
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                {!isVisuallyCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-200">Connexion</span>}
              </Button>
            )}

            {/* Profile Popover Menu */}
            {isUserMenuOpen && currentUser && (
              <div
                className={`absolute z-50 bg-white dark:bg-[#0B2438] backdrop-blur-3xl rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 p-2 text-[#0B1F30] dark:text-white animate-in fade-in duration-150 ${
                  isVisuallyCollapsed
                    ? 'left-full bottom-0 ml-2.5 w-64 slide-in-from-left-2'
                    : 'bottom-full left-0 right-0 mb-2 w-full slide-in-from-bottom-2'
                }`}
              >
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
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 font-semibold">
                        {currentUser.department || 'Général'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-500/40 font-bold uppercase">
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
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-200 font-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Espace Administration</span>
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-500/30">
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
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] text-[#0B1F30] dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                    <span>Gérer le profil</span>
                  </button>

                  {/* Quick Light / Dark Theme Toggle */}
                  <button
                    id="toggle-theme-btn"
                    type="button"
                    onClick={(e) => {
                      soundManager.playClickSound();
                      toggleTheme(e);
                    }}
                    aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] text-[#0B1F30] dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {isDark ? (
                        <Sun className="w-3.5 h-3.5 text-[#F77F00]" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-[#004266]" />
                      )}
                      <span>Apparence</span>
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                        isDark
                          ? 'bg-[#F77F00]/20 text-[#FFB35C] border border-[#F77F00]/40'
                          : 'bg-[#004266]/10 text-[#004266] border border-[#004266]/25'
                      }`}
                    >
                      {isDark ? 'Sombre' : 'Clair'}
                    </span>
                  </button>

                  <button
                    id="sidebar-signout-btn"
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

        {/* Discreet expand toggle at the very bottom when collapsed and not hovered */}
        {isVisuallyCollapsed && (
          <button
            id="bottom-expand-sidebar-btn"
            type="button"
            onClick={toggleCollapse}
            title="Déplier la barre latérale"
            aria-label="Déplier la barre latérale"
            className="w-7 h-7 mx-auto flex items-center justify-center rounded-lg text-[#486075] dark:text-slate-400 hover:text-[#004266] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      </div>
    </aside>
  );
};
