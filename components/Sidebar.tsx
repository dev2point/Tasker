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
  const toggleCollapse = () => {
    soundManager.playClickSound();
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
      className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-40 bg-white/95 backdrop-blur-md border-r border-slate-200/90 shadow-sm transition-all duration-200 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* 1. Header: Brand Logo & Collapse Toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100/90 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] flex items-center justify-center text-[#422006] shadow-xs shadow-[#F7C59F]/50 shrink-0 font-bold">
              <CalendarIcon className="w-4.5 h-4.5 stroke-[2.3]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                Planit
              </span>
              <span className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                Productivité & Agenda
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] flex items-center justify-center text-[#422006] shadow-xs shadow-[#F7C59F]/50 font-bold cursor-pointer"
              onClick={toggleCollapse}
              title="Agrandir la barre latérale"
            >
              <CalendarIcon className="w-4.5 h-4.5 stroke-[2.3]" />
            </div>
          </div>
        )}

        {/* Collapse / Expand Button */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Réduire la barre latérale"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Top Banner / Live Clock (Expanded Only) */}
      {!isCollapsed && (
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
          <span className="truncate text-slate-500 font-medium">{currentDateStr}</span>
          <div className="flex items-center gap-1 font-semibold text-[#BA5316] shrink-0">
            <Clock className="w-3 h-3" />
            <span>{currentTime}</span>
          </div>
        </div>
      )}

      {/* 3. Primary CTA: + Nouvelle tâche */}
      <div className="p-3 shrink-0">
        {!isCollapsed ? (
          <Button
            id="open-new-task-btn"
            onClick={onOpenNewTaskModal}
            className="w-full bg-[#EE8D4B] hover:bg-[#BA5316] text-white font-bold shadow-sm shadow-[#EE8D4B]/30 h-10 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
            className="w-full h-10 bg-[#EE8D4B] hover:bg-[#BA5316] text-white rounded-xl shadow-sm shadow-[#EE8D4B]/30 flex items-center justify-center transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </Button>
        )}
      </div>

      {/* 4. Scrollable Middle Section: Navigation & Tools */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        
        {/* Navigation Group */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                    active
                      ? item.special
                        ? 'bg-purple-50 text-purple-900 border border-purple-200 font-bold shadow-2xs'
                        : 'bg-[#F7C59F]/30 text-[#8c3507] border border-[#F7C59F]/60 font-bold shadow-2xs'
                      : item.special
                        ? 'text-purple-700 hover:text-purple-900 hover:bg-purple-50/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <div
                    className={`transition-colors shrink-0 ${
                      active
                        ? item.special
                          ? 'text-purple-700'
                          : 'text-[#BA5316]'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                        active
                          ? 'bg-[#EE8D4B] text-white'
                          : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300'
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
          {!isCollapsed ? (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-white border border-orange-200/70 shadow-2xs">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#EE8D4B]/20 text-[#BA5316] flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-orange-950">Assistant IA</span>
                <Sparkles className="w-3 h-3 text-amber-500 ml-auto" />
              </div>
              <p className="text-[11px] text-slate-600 leading-tight mb-2.5">
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
                className="w-full h-8 text-xs font-bold border-orange-200 bg-white hover:bg-orange-100/50 text-orange-900 rounded-lg shadow-2xs gap-1.5"
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
              className="w-full h-10 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 flex items-center justify-center transition-colors"
            >
              <Bot className="w-4 h-4 text-[#BA5316]" />
            </button>
          )}
        </div>

        {/* Organisation & Tools */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                title={isCollapsed ? 'Catégories & Tags' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors group ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <FolderPlus className="w-4 h-4 text-slate-400 group-hover:text-[#BA5316] shrink-0" />
                {!isCollapsed && <span className="truncate flex-1 text-left">Catégories & Tags</span>}
              </button>
            )}

            {/* Export iCal */}
            <button
              id="open-export-btn"
              type="button"
              onClick={onOpenExportModal}
              title={isCollapsed ? 'Exporter (.ics)' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors group ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
            >
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
              {!isCollapsed && <span className="truncate flex-1 text-left">Exporter (.ics)</span>}
            </button>

            {/* Sound Toggle */}
            <button
              id="toggle-sound-btn"
              type="button"
              onClick={() => {
                onToggleSound();
                soundManager.playClickSound();
              }}
              title={isCollapsed ? (soundEnabled ? 'Alertes sonores activées' : 'Alertes sonores coupées') : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors group ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">Alertes sonores</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      soundEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
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
                title={isCollapsed ? "Installer l'application PlanIt" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#59240A] bg-[#F7C59F]/20 hover:bg-[#F7C59F]/35 border border-[#F7C59F]/50 transition-colors group ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <Download className="w-4 h-4 text-[#BA5316] shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left font-bold">Installer l&apos;app</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#BA5316] text-white">
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
                title={isCollapsed ? 'Diagnostic Base SQL' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors group ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
              >
                <Database className="w-4 h-4 text-blue-500 shrink-0" />
                {!isCollapsed && <span className="truncate flex-1 text-left">Diagnostic Base SQL</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Notifications & User Profile */}
      <div className="p-3 border-t border-slate-100/90 bg-slate-50/50 shrink-0 space-y-2">
        
        {/* Notifications Bar */}
        <button
          id="open-notifications-btn"
          type="button"
          onClick={onOpenNotifications}
          title="Centre de notifications et rappels"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-2xs border border-transparent hover:border-slate-200/80 transition-all ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
        >
          <div className="relative shrink-0">
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-10 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-2xs ring-1.5 ring-white animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </div>

          {!isCollapsed && (
            <>
              <span className="truncate flex-1 text-left">Notifications</span>
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">
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
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors ${
                  isCollapsed ? 'justify-center p-1.5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#EE8D4B]/20 text-[#BA5316] font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>

                {!isCollapsed && (
                  <>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 truncate">
                          {currentUser.role}
                        </span>
                        {currentUser.role === 'admin' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 font-bold uppercase">
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
                className={`w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-9 rounded-xl text-xs gap-1.5 shadow-2xs ${
                  isCollapsed ? 'px-0' : ''
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Connexion</span>}
              </Button>
            )}

            {/* Profile Popover Menu */}
            {isUserMenuOpen && currentUser && (
              <div className="absolute left-full bottom-0 ml-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EE8D4B]/20 text-[#BA5316] font-bold text-sm flex items-center justify-center shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
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

        {/* Expand toggle at the very bottom when collapsed */}
        {isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            title="Agrandir la barre latérale"
            className="w-full py-1.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
