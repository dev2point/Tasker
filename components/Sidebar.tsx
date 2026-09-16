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
  Sparkles,
  SlidersHorizontal,
  LogOut,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { User } from '@/types/user';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePWAInstall } from '@/components/pwa/usePWAInstall';

export interface SidebarProps {
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  // Support either controlled or local collapse state
  const [localCollapsed, setLocalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : localCollapsed;

  // Hover expansion state for collapsed sidebar ("animation limpide" on hover)
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // The sidebar is visually collapsed only when it is collapsed AND not hovered
  const isVisuallyCollapsed = isCollapsed && !isHovered;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (isCollapsed) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (isCollapsed) {
      // Small graceful buffer (150ms) to ensure smooth user experience
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const toggleCollapse = () => {
    soundManager.playClickSound();
    setIsHovered(false);
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
  const { isCompatible, isInstalled, install } = usePWAInstall();

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
      icon: <GitPullRequest className="w-4 h-4 shrink-0 text-[#EE8D4B]" />,
    },
    {
      id: 'stats',
      label: 'Statistiques',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    },
    ...(currentUser?.role === 'admin' || currentView === 'admin'
      ? [
          {
            id: 'admin' as ViewMode,
            label: 'Administration',
            icon: <Shield className="w-4 h-4 shrink-0 text-purple-600" />,
            special: true,
          },
        ]
      : []),
  ];

  return (
    <aside
      id="main-desktop-sidebar"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 bg-[#061A13]/85 backdrop-blur-2xl border-r border-emerald-500/20 text-slate-100 select-none transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-x-hidden ${
        isVisuallyCollapsed ? 'w-20 shadow-xl shadow-black/50' : 'w-64 shadow-2xl shadow-emerald-950/40'
      } ${
        isCollapsed && isHovered
          ? 'z-50 shadow-2xl shadow-emerald-950/60 ring-1 ring-emerald-500/40'
          : 'z-40 shadow-xl'
      }`}
    >
      {/* 1. Header: Brand Logo & Collapse Toggle */}
      <div className="h-16 px-3.5 flex items-center justify-between border-b border-emerald-500/20 shrink-0">
        {isVisuallyCollapsed ? (
          <div className="w-full flex items-center justify-between">
            <div
              className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-lg font-bold cursor-pointer shrink-0 transition-transform active:scale-95"
              onClick={toggleCollapse}
              title="Agrandir la barre latérale"
            >
              <CalendarIcon className="w-4.5 h-4.5 stroke-[2.3]" />
            </div>
            <button
              id="expand-sidebar-btn"
              type="button"
              onClick={toggleCollapse}
              title="Déplier la barre latérale"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-500/20 active:scale-95 transition-all shrink-0 border border-emerald-500/30 hover:border-emerald-400"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-lg shrink-0 font-bold">
                <CalendarIcon className="w-4.5 h-4.5 stroke-[2.3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-black tracking-tight text-white leading-none whitespace-nowrap">
                  Planit
                </span>
                <span className="text-[11px] font-medium text-emerald-300/70 truncate mt-0.5 whitespace-nowrap">
                  Productivité & Agenda
                </span>
              </div>
            </div>

            {/* Collapse / Pin Toggle Button */}
            {isCollapsed ? (
              <button
                id="pin-sidebar-btn"
                type="button"
                onClick={toggleCollapse}
                title="Verrouiller la barre latérale dépliée"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="whitespace-nowrap">Fixer</span>
              </button>
            ) : (
              <button
                id="collapse-sidebar-btn"
                type="button"
                onClick={toggleCollapse}
                title="Réduire la barre latérale"
                className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 transition-colors shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Top Banner / Live Clock (Expanded Only) */}
      {!isVisuallyCollapsed && (
        <div className="px-4 py-2.5 bg-emerald-950/30 border-b border-emerald-500/15 flex items-center justify-between text-xs text-emerald-200/80 font-mono whitespace-nowrap animate-in fade-in duration-200">
          <span className="truncate text-slate-300 font-medium">{currentDateStr}</span>
          <div className="flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
            <Clock className="w-3 h-3" />
            <span>{currentTime}</span>
          </div>
        </div>
      )}

      {/* 3. Primary CTA: + Nouvelle tâche */}
      <div className="p-3 shrink-0">
        {!isVisuallyCollapsed ? (
          <Button
            id="open-new-task-btn"
            onClick={onOpenNewTaskModal}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md h-10 rounded-xl flex items-center justify-center gap-2 border border-emerald-400/50 transition-all active:scale-[0.98] whitespace-nowrap animate-in fade-in duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouvelle tâche</span>
          </Button>
        ) : (
          <Button
            id="open-new-task-btn"
            onClick={onOpenNewTaskModal}
            title="Nouvelle tâche"
            size="icon"
            className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-md flex items-center justify-center border border-emerald-400/50 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </Button>
        )}
      </div>

      {/* 4. Scrollable Middle Section: Navigation & Tools */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 custom-scrollbar">
        
        {/* Navigation Group */}
        <div>
          {!isVisuallyCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 whitespace-nowrap animate-in fade-in duration-200">
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                    active
                      ? item.special
                        ? 'bg-purple-900/40 text-purple-200 border border-purple-500/40 font-bold shadow-lg shadow-purple-950/40 backdrop-blur-md'
                        : 'bg-emerald-500/20 text-white border border-emerald-500/40 font-bold shadow-lg shadow-emerald-950/50 backdrop-blur-md'
                      : item.special
                        ? 'text-purple-300 hover:text-white hover:bg-purple-900/25'
                        : 'text-slate-300 hover:text-white hover:bg-emerald-500/15'
                  } ${isVisuallyCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <div
                    className={`transition-colors shrink-0 ${
                      active
                        ? item.special
                          ? 'text-purple-300'
                          : 'text-emerald-400'
                        : 'text-slate-400 group-hover:text-emerald-300'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {!isVisuallyCollapsed && (
                    <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">{item.label}</span>
                  )}

                  {!isVisuallyCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 animate-in fade-in duration-200 ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30 group-hover:bg-emerald-900'
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
            <div className="p-3 rounded-2xl bg-[#0a231b]/80 border border-emerald-500/30 shadow-xl backdrop-blur-xl animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-white whitespace-nowrap">Assistant IA</span>
                <Sparkles className="w-3 h-3 text-amber-400 ml-auto animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mb-2.5">
                Planification intelligente & création de tâches par Gemini.
              </p>
              <Button
                id="open-ai-assistant-btn"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!currentUser && onOpenAuthModal) {
                    onOpenAuthModal();
                  } else {
                    onOpenAIModal();
                  }
                }}
                className="w-full h-8 text-xs font-bold border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 rounded-lg shadow-sm gap-1.5 whitespace-nowrap"
              >
                <span>Ouvrir l&apos;assistant</span>
                {!currentUser && <Lock className="w-2.5 h-2.5 text-slate-400" />}
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
              title="Assistant IA Gemini"
              className="w-full h-10 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-colors"
            >
              <Bot className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>

        {/* Organisation & Tools */}
        <div>
          {!isVisuallyCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 whitespace-nowrap animate-in fade-in duration-200">
              Organisation & Outils
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-emerald-500/15 transition-colors group ${
                  isVisuallyCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <FolderPlus className="w-4 h-4 text-slate-400 group-hover:text-emerald-300 shrink-0" />
                {!isVisuallyCollapsed && <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Catégories & Tags</span>}
              </button>
            )}

            {/* Export iCal */}
            <button
              id="open-export-btn"
              type="button"
              onClick={onOpenExportModal}
              title={isVisuallyCollapsed ? 'Exporter (.ics)' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-emerald-500/15 transition-colors group ${
                isVisuallyCollapsed ? 'justify-center px-2' : ''
              }`}
            >
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-200 shrink-0" />
              {!isVisuallyCollapsed && <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Exporter (.ics)</span>}
            </button>

            {/* Sound Toggle */}
            <button
              id="toggle-sound-btn"
              type="button"
              onClick={() => {
                onToggleSound();
                soundManager.playClickSound();
              }}
              title={isVisuallyCollapsed ? (soundEnabled ? 'Alertes sonores activées' : 'Alertes sonores coupées') : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-emerald-500/15 transition-colors group ${
                isVisuallyCollapsed ? 'justify-center px-2' : ''
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              {!isVisuallyCollapsed && (
                <>
                  <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Alertes sonores</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap animate-in fade-in duration-200 ${
                      soundEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
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
                  await install();
                }}
                title={isVisuallyCollapsed ? "Installer l'application PlanIt" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-amber-200 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 transition-colors group ${
                  isVisuallyCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <Download className="w-4 h-4 text-amber-400 shrink-0" />
                {!isVisuallyCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left font-bold whitespace-nowrap animate-in fade-in duration-200">Installer l&apos;app</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 whitespace-nowrap animate-in fade-in duration-200">
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition-colors group ${
                  isVisuallyCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <Database className="w-4 h-4 text-sky-400 shrink-0" />
                {!isVisuallyCollapsed && <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Diagnostic Base SQL</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Notifications & User Profile */}
      <div className="p-3 border-t border-emerald-500/20 bg-emerald-950/40 backdrop-blur-md shrink-0 space-y-2">
        
        {/* Notifications Bar */}
        <button
          id="open-notifications-btn"
          type="button"
          onClick={onOpenNotifications}
          title="Centre de notifications et rappels"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-emerald-500/20 hover:text-white border border-transparent hover:border-emerald-500/30 transition-all ${
            isVisuallyCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <div className="relative shrink-0">
            <Bell className="w-4 h-4 text-slate-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-1 ring-slate-900 animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </div>

          {!isVisuallyCollapsed && (
            <>
              <span className="truncate flex-1 text-left whitespace-nowrap animate-in fade-in duration-200">Notifications</span>
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold animate-in fade-in duration-200">
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
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl bg-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer transition-colors ${
                  isVisuallyCollapsed ? 'justify-center p-1.5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>

                {!isVisuallyCollapsed && (
                  <>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate whitespace-nowrap animate-in fade-in duration-200">
                        {currentUser.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-300/80 truncate whitespace-nowrap">
                          {currentUser.role}
                        </span>
                        {currentUser.role === 'admin' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-500/40 font-bold uppercase whitespace-nowrap">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
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
                className={`w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-9 rounded-xl text-xs gap-1.5 shadow-lg shadow-emerald-950/50 ${
                  isVisuallyCollapsed ? 'px-0' : ''
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                {!isVisuallyCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-200">Connexion</span>}
              </Button>
            )}

            {/* Profile Popover Menu */}
            {isUserMenuOpen && currentUser && (
              <div className="absolute left-full bottom-0 ml-2 w-64 bg-[#081F17]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150 text-white">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/20 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-sm flex items-center justify-center shrink-0">
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
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 font-semibold">
                        {currentUser.department || 'Général'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-500/40 font-bold uppercase">
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
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-purple-900/40 text-purple-200 font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>Espace Administration</span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30">
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
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-500/20 text-slate-200 font-semibold transition-colors border-t border-emerald-500/20 mt-1"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Gérer le profil / Déconnexion</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expand toggle at the very bottom when collapsed and not hovered */}
        {isVisuallyCollapsed && (
          <button
            id="bottom-expand-sidebar-btn"
            type="button"
            onClick={toggleCollapse}
            title="Déplier la barre latérale"
            className="w-full py-1.5 flex items-center justify-center rounded-lg text-emerald-300/70 hover:text-white hover:bg-emerald-500/20 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
