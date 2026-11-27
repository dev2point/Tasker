'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Shield,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  Filter,
  LayoutDashboard,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { User, UserRole } from '@/types/user';
import { Task, Category } from '@/types/task';
import { soundManager } from '@/lib/sound';
import { CategoryIcon } from '@/components/CategoryIcon';

interface AdminViewProps {
  currentUser: User | null;
  tasks: Task[];
  categories: Category[];
  teamUsers: User[];
  onRefreshUsers: () => Promise<void>;
  onSelectUser: (user: User) => void;
  onTasksSynced?: (tasks: Task[]) => void;
  onOpenAuthModal?: () => void;
  onOpenCategoryTagManager?: () => void;
  onSaveCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string, fallbackCategoryId?: string) => void;
  onResetDefaultCategories?: () => void;
}

type AdminSection = 'overview' | 'users' | 'tasks' | 'security' | 'categories';

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  tasks,
  categories,
  teamUsers,
  onRefreshUsers,
  onSelectUser,
  onTasksSynced,
  onOpenAuthModal,
  onOpenCategoryTagManager,
  onResetDefaultCategories,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newUserDept, setNewUserDept] = useState('Fiscalité');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [pendingResetCategories, setPendingResetCategories] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const handleSyncTasks = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
      const data = await res.json();
      if (data.synced) {
        setSyncFeedback(`Synchronisation réussie : ${data.count} tâches enregistrées.`);
        if (onTasksSynced && data.tasks) {
          onTasksSynced(data.tasks);
        }
      } else {
        setSyncFeedback('Enregistrement local actif.');
      }
    } catch {
      setSyncFeedback('Erreur de connexion lors de la synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setIsSubmittingUser(true);
    setUserActionMessage(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          department: newUserDept,
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        soundManager.playClickSound();
        await onRefreshUsers();
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setUserActionMessage({ type: 'success', text: `Membre ${data.user.name} créé avec succès.` });
      } else {
        setUserActionMessage({ type: 'error', text: data.error || 'Impossible de créer le membre.' });
      }
    } catch (err) {
      setUserActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erreur de communication avec le serveur.',
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    setUpdatingRoleId(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        soundManager.playClickSound();
        await onRefreshUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRoleId(null);
      setEditingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (currentUser?.id === userId) {
      setUserActionMessage({ type: 'error', text: 'Vous ne pouvez pas supprimer votre propre compte actif.' });
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        soundManager.playClickSound();
        setPendingDeleteUserId(null);
        await onRefreshUsers();
        setUserActionMessage({ type: 'success', text: `Utilisateur ${userName} retiré de l’équipe.` });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    teamUsers.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [teamUsers]);

  const filteredUsers = useMemo(() => {
    return teamUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesDept = departmentFilter === 'all' || u.department === departmentFilter;

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [teamUsers, searchQuery, roleFilter, departmentFilter]);

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const urgentTasks = tasks.filter((t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high')).length;
    const assignedTasks = tasks.filter((t) => t.assigneeId).length;
    const adminsCount = teamUsers.filter((u) => u.role === 'admin').length;
    const managersCount = teamUsers.filter((u) => u.role === 'manager').length;
    const membersCount = teamUsers.filter((u) => u.role === 'member').length;

    return {
      totalTasks,
      completedTasks,
      urgentTasks,
      assignedTasks,
      adminsCount,
      managersCount,
      membersCount,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [tasks, teamUsers]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8 stroke-[1.8]" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1F30] dark:text-[#F1F5F9]">Accès Administrateur Restreint</h2>
        <p className="text-xs text-[#486075] dark:text-[#9FB3C8] leading-relaxed">
          Cette interface d’administration est exclusivement réservée aux utilisateurs disposant du rôle <strong className="text-[#0B1F30] dark:text-white">Admin</strong>. Les rôles et privilèges sont strictement gérés par un administrateur système.
        </p>
        <div className="pt-3 flex items-center justify-center gap-3">
          {onOpenAuthModal && (
            <Button variant="outline" onClick={onOpenAuthModal} className="font-semibold text-xs">
              Se connecter avec un compte administrateur
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-[#004266] dark:bg-[#0B2438] rounded-2xl border border-[#00314D] dark:border-[#94B8D6]/25 p-5 sm:p-6 shadow-md relative overflow-hidden text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-[#FFB35C] border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Console d’Administration
                </h1>
                <Badge className="bg-white/15 text-white border border-white/25 text-xs font-bold gap-1 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FFB35C]" />
                  Espace Sécurisé
                </Badge>
                <Badge className="bg-[#F77F00]/20 text-[#FFB35C] border border-[#F77F00]/40 text-xs font-bold py-0.5">
                  {currentUser.name} (Admin)
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-white/80 mt-1">
                Supervision globale du cabinet, des droits d’accès et des tâches de l’équipe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowAddUserModal(true)}
              className="gap-1.5 text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nouveau membre</span>
            </Button>
          </div>
        </div>

        {userActionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 ${
              userActionMessage.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-100'
                : 'bg-rose-500/20 border-rose-300/40 text-rose-100'
            }`}
          >
            <span>{userActionMessage.text}</span>
            <button
              type="button"
              onClick={() => setUserActionMessage(null)}
              className="text-xs underline hover:opacity-80 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#486075] dark:text-[#9FB3C8] text-xs font-medium">
            <span>Membres Actifs</span>
            <Users className="w-4 h-4 text-[#F77F00]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl font-bold text-[#0B1F30] dark:text-[#F1F5F9]">{teamUsers.length}</span>
            <span className="text-xs text-[#486075] dark:text-[#9FB3C8]">
              ({stats.adminsCount} admin{stats.adminsCount > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#486075] dark:text-[#9FB3C8] text-xs font-medium">
            <span>Tâches Totales</span>
            <FolderOpen className="w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl font-bold text-[#0B1F30] dark:text-[#F1F5F9]">{stats.totalTasks}</span>
            <span className="text-xs text-[#004266] dark:text-[#7CC4EB] font-semibold">
              {stats.completionRate}% terminées
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#486075] dark:text-[#9FB3C8] text-xs font-medium">
            <span>Tâches Assignées</span>
            <CheckCircle2 className="w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2 tabular-nums">
            <span className="text-2xl font-bold text-[#0B1F30] dark:text-[#F1F5F9]">{stats.assignedTasks}</span>
            <span className="text-xs text-[#486075] dark:text-[#9FB3C8]">sur {stats.totalTasks}</span>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-xl max-w-full overflow-x-auto custom-scrollbar shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSection('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'overview'
              ? 'bg-[#004266] text-white shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
              : 'text-[#486075] hover:text-[#0B1F30] hover:bg-[#EDF2F7] dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#103049]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Vue d’ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'users'
              ? 'bg-[#004266] text-white shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
              : 'text-[#486075] hover:text-[#0B1F30] hover:bg-[#EDF2F7] dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#103049]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Gestion des Utilisateurs ({teamUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'security'
              ? 'bg-[#004266] text-white shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
              : 'text-[#486075] hover:text-[#0B1F30] hover:bg-[#EDF2F7] dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#103049]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Droits &amp; Permissions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'categories'
              ? 'bg-[#004266] text-white shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
              : 'text-[#486075] hover:text-[#0B1F30] hover:bg-[#EDF2F7] dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#103049]'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Pôles du Cabinet ({categories.length})</span>
        </button>
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1F30] dark:text-[#F1F5F9] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#F77F00]" />
                  Répartition des Rôles dans l’Équipe
                </h3>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setActiveSection('users')}
                  className="text-xs text-[#004266] dark:text-[#7CC4EB] font-semibold gap-1"
                >
                  Voir tous les membres <ArrowRight className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Administrateurs</div>
                  <div className="text-2xl font-black mt-1 text-purple-800 dark:text-purple-300 tabular-nums">{stats.adminsCount}</div>
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Accès absolu</div>
                </div>

                <div className="p-3 rounded-xl bg-[#004266]/8 dark:bg-[#3895C9]/15 border border-[#004266]/20 dark:border-[#3895C9]/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">Managers</div>
                  <div className="text-2xl font-black mt-1 text-[#004266] dark:text-[#7CC4EB] tabular-nums">{stats.managersCount}</div>
                  <div className="text-[10px] text-[#486075] dark:text-[#9FB3C8] mt-0.5">Gestion d’équipe</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Membres</div>
                  <div className="text-2xl font-black mt-1 text-emerald-800 dark:text-emerald-300 tabular-nums">{stats.membersCount}</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Exécution de tâches</div>
                </div>

                <div className="p-3 rounded-xl bg-[#FFF4E6] dark:bg-[#F77F00]/15 border border-[#F77F00]/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#B85A00] dark:text-[#FFB35C]">Invités</div>
                  <div className="text-2xl font-black mt-1 text-[#B85A00] dark:text-[#FFB35C] tabular-nums">
                    {teamUsers.filter((u) => u.role === 'guest').length}
                  </div>
                  <div className="text-[10px] text-[#B85A00]/80 dark:text-[#FFB35C]/80 mt-0.5">Lecture seule</div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/20">
                <div className="text-xs font-bold text-[#486075] dark:text-[#9FB3C8] mb-2.5">Derniers membres enregistrés</div>
                <div className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15">
                  {teamUsers.slice(0, 4).map((u) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#004266] dark:bg-[#3895C9] text-white dark:text-[#061826] font-black text-xs flex items-center justify-center uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#0B1F30] dark:text-[#F1F5F9] flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {currentUser?.id === u.id && (
                              <Badge variant="apricot" className="text-[9px] py-0 px-1">
                                Vous
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                              : u.role === 'manager'
                              ? 'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8] font-medium tabular-nums">
                          {tasks.filter((t) => t.assigneeId === u.id).length} tâches
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#0B1F30] dark:text-[#F1F5F9]">Raccourcis Administrateur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="p-3.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#103049] hover:border-[#004266]/50 dark:hover:border-[#3895C9]/50 text-left transition-colors flex flex-col justify-between cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] flex items-center justify-center mb-2 border border-[#004266]/20 dark:border-[#3895C9]/30">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0B1F30] dark:text-[#F1F5F9]">Inviter un membre</div>
                    <div className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">Ajouter à l’annuaire d’équipe</div>
                  </div>
                </button>

                {onOpenCategoryTagManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryTagManager}
                    className="p-3.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#103049] hover:border-[#F77F00]/50 text-left transition-colors flex flex-col justify-between cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F77F00]/15 text-[#B85A00] dark:bg-[#F77F00]/20 dark:text-[#FFB35C] flex items-center justify-center mb-2 border border-[#F77F00]/30">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0B1F30] dark:text-[#F1F5F9]">Catégories &amp; Tags</div>
                      <div className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">{categories.length} pôles configurés</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#0B1F30] dark:text-[#F1F5F9] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#F77F00]" />
                Sécurité &amp; Sauvegarde
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9]">Contrôle d’Accès</span>
                    <Badge variant="success" className="text-[10px]">
                      Actif (4 profils)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                    Les règles de permissions restreignent la modification et la suppression de tâches.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9]">Sauvegarde &amp; Export</span>
                    <Badge variant="apricot" className="text-[10px]">
                      Calendrier &amp; Fichier
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                    Exportation complète disponible à tout moment via le centre d’export.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncTasks}
                  disabled={isSyncing}
                  className="w-full gap-2 text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Synchroniser les données maintenant</span>
                </Button>
                {syncFeedback && (
                  <p className="text-[11px] text-center text-[#004266] dark:text-[#7CC4EB] mt-2 font-medium">
                    {syncFeedback}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USERS MANAGEMENT */}
      {activeSection === 'users' && (
        <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F4F7FA] dark:bg-[#103049]/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#64748B] dark:text-[#9FB3C8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email ou département..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#9FB3C8]/70 focus:outline-hidden focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl px-2.5 py-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filtrer par rôle"
                  className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] focus:outline-hidden"
                >
                  <option value="all" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Tous les rôles</option>
                  <option value="admin" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Administrateurs</option>
                  <option value="manager" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Managers</option>
                  <option value="member" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Membres</option>
                  <option value="guest" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Invités</option>
                </select>
              </div>

              {departments.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl px-2.5 py-1 text-xs">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    aria-label="Filtrer par département"
                    className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] focus:outline-hidden"
                  >
                    <option value="all" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Tous départements</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                variant="accent"
                size="sm"
                onClick={() => setShowAddUserModal(true)}
                className="gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ajouter</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EDF2F7] dark:bg-[#103049] text-[#004266] dark:text-[#7CC4EB] font-bold border-b border-[#D8E2EC] dark:border-[#94B8D6]/20">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Département</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4 text-center">Tâches assignées</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15 text-[#0B1F30] dark:text-[#F1F5F9]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#486075] dark:text-[#9FB3C8]">
                      <Users className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                      <p className="font-semibold text-[#0B1F30] dark:text-[#F1F5F9]">Aucun utilisateur correspondant trouvé</p>
                      <p className="text-[11px] mt-1">
                        Modifiez vos critères de recherche ou ajoutez un nouveau membre.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isCurrent = currentUser?.id === user.id;
                    const assignedTasksCount = tasks.filter((t) => t.assigneeId === user.id).length;
                    const isEditingRole = editingUserId === user.id;
                    const isUpdating = updatingRoleId === user.id;
                    const isPendingDelete = pendingDeleteUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#004266] dark:bg-[#3895C9] text-white dark:text-[#061826] font-black text-xs flex items-center justify-center uppercase shrink-0 shadow-xs">
                              {user.name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-[#0B1F30] dark:text-[#F1F5F9] flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isCurrent && (
                                  <Badge variant="apricot" className="text-[9px] py-0 px-1 font-bold">
                                    Vous
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[#486075] dark:text-[#9FB3C8]">
                          {user.department || <span className="italic opacity-70">Non spécifié</span>}
                        </td>

                        <td className="py-3 px-4">
                          {isEditingRole ? (
                            <div className="flex items-center gap-1.5">
                              <select
                                defaultValue={user.role}
                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value as UserRole)}
                                disabled={isUpdating}
                                aria-label="Modifier le rôle"
                                className="px-2 py-1 rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/30 bg-white dark:bg-[#0B2438] text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9]"
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="member">Member</option>
                                <option value="guest">Guest</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="text-[10px] text-[#486075] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white px-1 cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingUserId(user.id)}
                              title="Cliquer pour changer le rôle"
                              className={`group inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition-all border cursor-pointer ${
                                user.role === 'admin'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                                  : user.role === 'manager'
                                  ? 'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30'
                                  : user.role === 'guest'
                                  ? 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/30'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                              }`}
                            >
                              <span>{user.role.toUpperCase()}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[9px] underline">
                                modifier
                              </span>
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums ${
                              assignedTasksCount > 0
                                ? 'bg-[#004266]/10 text-[#004266] border border-[#004266]/20 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {assignedTasksCount}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                            Actif
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCurrent && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => onSelectUser(user)}
                                title="Tester l’application sous l’identité de ce membre"
                                className="text-[11px] font-semibold gap-1 cursor-pointer"
                              >
                                <span>Incarner</span>
                              </Button>
                            )}

                            {!isCurrent && (
                              isPendingDelete ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="destructive"
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    className="text-[10px] h-6 px-2 cursor-pointer"
                                  >
                                    Confirmer
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => setPendingDeleteUserId(null)}
                                    className="text-[10px] h-6 px-2 cursor-pointer"
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteUserId(user.id)}
                                  title="Supprimer ce membre"
                                  className="p-1.5 rounded-lg text-[#486075] hover:text-rose-600 hover:bg-rose-50 dark:text-[#9FB3C8] dark:hover:text-rose-400 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: SECURITY & RBAC */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B1F30] dark:text-[#F1F5F9] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#F77F00]" />
                  Droits &amp; Permissions par Profil
                </h3>
                <p className="text-xs text-[#486075] dark:text-[#9FB3C8] mt-1">
                  Tableau comparatif des privilèges accordés selon le rôle attribué à chaque compte.
                </p>
              </div>
              <Badge variant="default" className="text-xs font-bold">
                Sécurité Stricte
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EDF2F7] dark:bg-[#103049] text-[#0B1F30] dark:text-[#F1F5F9] font-bold border-b border-[#D8E2EC] dark:border-[#94B8D6]/20">
                  <tr>
                    <th className="py-3 px-4">Fonctionnalité / Ressource</th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-purple-700 dark:text-purple-400">Admin</div>
                      <div className="text-[10px] font-normal text-[#486075] dark:text-[#9FB3C8]">Contrôle absolu</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-[#004266] dark:text-[#7CC4EB]">Manager</div>
                      <div className="text-[10px] font-normal text-[#486075] dark:text-[#9FB3C8]">Responsable</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">Member</div>
                      <div className="text-[10px] font-normal text-[#486075] dark:text-[#9FB3C8]">Opérationnel</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-[#B85A00] dark:text-[#FFB35C]">Guest</div>
                      <div className="text-[10px] font-normal text-[#486075] dark:text-[#9FB3C8]">Consultation</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15 text-[#0B1F30] dark:text-[#F1F5F9]">
                  <tr>
                    <td className="py-3 px-4 font-semibold">Créer, éditer et planifier des tâches</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Lecture seule</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Assigner des tâches à d’autres collaborateurs</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Tous</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Tous</td>
                    <td className="py-3 px-4 text-center text-[#B85A00] dark:text-[#FFB35C] font-bold">Auto-assignation</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Supprimer des tâches du projet</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Toutes</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Toutes</td>
                    <td className="py-3 px-4 text-center text-[#B85A00] dark:text-[#FFB35C] font-bold">Ses tâches créées</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Accès à l’interface d’administration</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Modifier les rôles et droits des utilisateurs</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">Gérer les catégories &amp; étiquettes globales</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">✕ Non</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CABINET CATEGORIES */}
      {activeSection === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8E2EC] dark:border-[#94B8D6]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F30] dark:text-[#F1F5F9]">Catégories Métiers &amp; Pôles du Cabinet</h3>
                  <p className="text-xs text-[#486075] dark:text-[#9FB3C8]">
                    Pôles standards : <span className="text-[#004266] dark:text-[#7CC4EB] font-semibold">Fiscalité</span>, <span className="text-[#004266] dark:text-[#7CC4EB] font-semibold">Comptabilité</span>, <span className="text-[#004266] dark:text-[#7CC4EB] font-semibold">Juridique</span> et <span className="text-[#004266] dark:text-[#7CC4EB] font-semibold">Recherche &amp; Innovation</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onResetDefaultCategories && (
                  pendingResetCategories ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          onResetDefaultCategories();
                          soundManager.playClickSound();
                          setPendingResetCategories(false);
                        }}
                        className="text-xs cursor-pointer"
                      >
                        Confirmer réinitialisation
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingResetCategories(false)}
                        className="text-xs cursor-pointer"
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingResetCategories(true)}
                      className="text-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#004266] dark:text-[#3895C9]" />
                      Réinitialiser les Pôles
                    </Button>
                  )
                )}

                {onOpenCategoryTagManager && (
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={onOpenCategoryTagManager}
                    className="font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1 stroke-[2.5]" />
                    Gérer les Catégories &amp; Tags
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#004266]/6 dark:bg-[#3895C9]/10 border border-[#004266]/20 dark:border-[#3895C9]/25 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#004266] dark:text-[#7CC4EB] shrink-0" />
              <div className="text-xs text-[#486075] dark:text-[#9FB3C8]">
                <strong className="text-[#0B1F30] dark:text-white">Synchronisation partagée active :</strong> Toute modification effectuée par l’administrateur est enregistrée immédiatement et s’applique instantanément à tous les utilisateurs.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {categories.map((cat) => {
                const taskCount = tasks.filter((t) => t.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#103049] hover:border-[#004266]/45 dark:hover:border-[#3895C9]/45 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${cat.color}18`,
                          borderColor: `${cat.color}40`,
                          color: cat.color,
                        }}
                      >
                        <CategoryIcon name={cat.iconName} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#0B1F30] dark:text-[#F1F5F9] truncate flex items-center gap-1.5">
                          <span>{cat.name}</span>
                          {cat.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#004266]/10 text-[#004266] border border-[#004266]/20 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30 font-semibold">
                              Standard
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#486075] dark:text-[#9FB3C8] mt-0.5 tabular-nums">
                          {taskCount} {taskCount > 1 ? 'dossiers / tâches associés' : 'dossier / tâche associé'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onOpenCategoryTagManager && (
                        <button
                          type="button"
                          onClick={onOpenCategoryTagManager}
                          title="Modifier la catégorie"
                          className="p-2 rounded-lg text-[#486075] hover:text-[#004266] hover:bg-[#004266]/10 dark:text-[#9FB3C8] dark:hover:text-[#7CC4EB] dark:hover:bg-[#3895C9]/20 transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Member */}
      {showAddUserModal && (
        <ModalPortal>
          <div
            onClick={() => setShowAddUserModal(false)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061826]/70 backdrop-blur-md p-4 animate-in fade-in duration-150 cursor-pointer"
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#0B2438] rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 overflow-hidden text-[#0B1F30] dark:text-[#F1F5F9] cursor-default"
            >
              <div className="bg-[#004266] p-4 sm:p-5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-[#FFB35C] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Ajouter un nouveau membre</h3>
                    <p className="text-[11px] text-white/75 font-medium">Enregistrement dans l’annuaire du cabinet</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#0B1F30] dark:text-[#F1F5F9] mb-1">Nom complet</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sophie Martin"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-hidden focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0B1F30] dark:text-[#F1F5F9] mb-1">Adresse email</label>
                  <input
                    type="email"
                    required
                    placeholder="sophie.martin@lamaisondelafiscalite.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-hidden focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0B1F30] dark:text-[#F1F5F9] mb-1">Rôle</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-[#F1F5F9] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                    >
                      <option value="admin">Admin (Complet)</option>
                      <option value="manager">Manager</option>
                      <option value="member">Membre</option>
                      <option value="guest">Invité</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0B1F30] dark:text-[#F1F5F9] mb-1">Département</label>
                    <input
                      type="text"
                      placeholder="Ex: Fiscalité"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-hidden focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddUserModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" variant="accent" size="sm" disabled={isSubmittingUser} className="font-bold cursor-pointer">
                    {isSubmittingUser ? 'Création...' : 'Créer le membre'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
