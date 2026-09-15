'use client';

import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';
import {
  Users,
  Shield,
  Database,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Filter,
  Check,
  Server,
  Cloud,
  Layers,
  LayoutDashboard,
  Lock,
  Calendar,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, UserRole } from '@/types/user';
import { Task, Category } from '@/types/task';
import { soundManager } from '@/lib/sound';

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
}

type AdminSection = 'overview' | 'users' | 'tasks' | 'database' | 'security';

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
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // New User Form Modal/Drawer
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newUserDept, setNewUserDept] = useState('Ingénierie');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database status
  const [dbStatus, setDbStatus] = useState<{
    connected?: boolean;
    configured?: boolean;
    serverTime?: string;
    pgVersion?: string;
    schemaReady?: boolean;
    schemaMessage?: string;
    error?: string;
    loading: boolean;
  }>({ loading: false });

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Quick role edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const fetchDbStatus = useCallback(async () => {
    setDbStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      setDbStatus({ ...data, loading: false });
    } catch (err) {
      setDbStatus({
        connected: false,
        configured: false,
        error: err instanceof Error ? err.message : 'Erreur de connexion',
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/db/status');
        const data = await res.json();
        if (!isCancelled) {
          setDbStatus({ ...data, loading: false });
        }
      } catch (err) {
        if (!isCancelled) {
          setDbStatus({
            connected: false,
            configured: false,
            error: err instanceof Error ? err.message : 'Erreur de connexion',
            loading: false,
          });
        }
      }
    };
    loadStatus();
    return () => {
      isCancelled = true;
    };
  }, []);

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
        setSyncFeedback(`Synchronisation réussie : ${data.count} tâches enregistrées sur PostgreSQL.`);
        if (onTasksSynced && data.tasks) {
          onTasksSynced(data.tasks);
        }
      } else {
        setSyncFeedback(data.message || 'Stockage local actif (IndexedDB).');
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
      alert('Vous ne pouvez pas supprimer votre propre compte actif.');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${userName} ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        soundManager.playClickSound();
        await onRefreshUsers();
        setUserActionMessage({ type: 'success', text: `Utilisateur ${userName} retiré de l’équipe.` });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    teamUsers.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [teamUsers]);

  // Filtered users list
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

  // Overall workspace stats
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

  // Security check: if not admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="py-12 px-4 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Accès Administrateur Restreint</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Cette interface d’administration est réservée aux utilisateurs disposant du rôle{' '}
          <strong className="text-slate-900">Admin</strong>.
          {currentUser ? (
            <span>
              {' '}Votre rôle actuel est <strong className="uppercase text-amber-700">{currentUser.role}</strong>.
            </span>
          ) : (
            ' Vous naviguez actuellement en mode invité ou membre.'
          )}
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => {
              console.log('[Planit AdminView] Promoting session user to Admin role');
              onSelectUser({
                id: currentUser?.id || 'admin-demo',
                name: currentUser?.name || 'Administrateur',
                email: currentUser?.email || 'admin@planit.local',
                role: 'admin',
                department: currentUser?.department || 'Direction',
                status: 'active',
                createdAt: currentUser?.createdAt || new Date().toISOString(),
              });
            }}
            className="font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200"
          >
            <Shield className="w-4 h-4 mr-1.5" />
            Activer le rôle Administrateur
          </Button>
          {onOpenAuthModal && (
            <Button variant="outline" onClick={onOpenAuthModal} className="font-semibold">
              Se connecter / Changer de compte
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F7C59F] to-[#ee8d4b] text-[#422006] flex items-center justify-center shrink-0 shadow-sm">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Console d’Administration
                </h1>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold gap-1 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Espace Sécurisé
                </Badge>
                <Badge variant="apricot" className="text-xs font-bold py-0.5">
                  {currentUser.name} (Admin)
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Supervision globale de l’équipe, des droits d’accès (RBAC), des tâches et du stockage de données.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDbStatus}
              disabled={dbStatus.loading}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbStatus.loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Vérifier connexion</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setShowAddUserModal(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nouveau membre</span>
            </Button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {userActionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 ${
              userActionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span>{userActionMessage.text}</span>
            <button
              type="button"
              onClick={() => setUserActionMessage(null)}
              className="text-xs underline hover:opacity-80"
            >
              Fermer
            </button>
          </div>
        )}
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Membres Actifs</span>
            <Users className="w-4 h-4 text-[#BA5316]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{teamUsers.length}</span>
            <span className="text-xs text-slate-500">
              ({stats.adminsCount} admin{stats.adminsCount > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tâches Totales</span>
            <FolderOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalTasks}</span>
            <span className="text-xs text-emerald-600 font-semibold">{stats.completionRate}% terminées</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tâches Assignées</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.assignedTasks}</span>
            <span className="text-xs text-slate-500">sur {stats.totalTasks}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>État Stockage</span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-bold text-slate-900">
              {dbStatus.connected ? 'PostgreSQL Connecté' : 'Mode Hybride Local'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl max-w-full overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-[#BA5316]" />
          <span>Vue d’ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#BA5316]" />
          <span>Gestion des Utilisateurs ({teamUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'security'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-[#BA5316]" />
          <span>Matrice des Droits (RBAC)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('database')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'database'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#BA5316]" />
          <span>Base de données & Synchronisation</span>
        </button>
      </div>

      {/* 4. Section Contents */}

      {/* SECTION 1: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Quick Team Summary & Distribution */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#BA5316]" />
                  Répartition des Rôles dans l’Équipe
                </h3>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setActiveSection('users')}
                  className="text-xs text-[#BA5316] font-semibold gap-1"
                >
                  Voir tous les membres <ArrowRight className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-purple-950">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Administrateurs</div>
                  <div className="text-2xl font-black mt-1 text-purple-900">{stats.adminsCount}</div>
                  <div className="text-[10px] text-purple-600 mt-0.5">Accès absolu</div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-950">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Managers</div>
                  <div className="text-2xl font-black mt-1 text-blue-900">{stats.managersCount}</div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Gestion d’équipe</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Membres</div>
                  <div className="text-2xl font-black mt-1 text-emerald-900">{stats.membersCount}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Exécution de tâches</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Invités</div>
                  <div className="text-2xl font-black mt-1 text-amber-900">
                    {teamUsers.filter((u) => u.role === 'guest').length}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Lecture seule</div>
                </div>
              </div>

              {/* Recent Members preview */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2.5">Derniers membres enregistrés</div>
                <div className="divide-y divide-slate-100">
                  {teamUsers.slice(0, 4).map((u) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F7C59F]/40 border border-[#F7C59F]/70 text-[#59240A] font-black text-xs flex items-center justify-center uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {currentUser?.id === u.id && (
                              <Badge variant="apricot" className="text-[9px] py-0 px-1">
                                Vous
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {tasks.filter((t) => t.assigneeId === u.id).length} tâches
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Raccourcis Administrateur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-left transition-colors flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F7C59F]/30 text-[#BA5316] flex items-center justify-center mb-2">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Inviter un membre</div>
                    <div className="text-[11px] text-slate-500">Ajouter à l’annuaire d’équipe</div>
                  </div>
                </button>

                {onOpenCategoryTagManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryTagManager}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-left transition-colors flex flex-col justify-between"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-2">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Catégories & Tags</div>
                      <div className="text-[11px] text-slate-500">{categories.length} catégories configurées</div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveSection('database')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 text-left transition-colors flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Synchroniser PostgreSQL</div>
                    <div className="text-[11px] text-slate-500">Sauvegarde cloud sécurisée</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: System Diagnostics & Health */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#BA5316]" />
                État du Système & Infrastructure
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Moteur Base de Données</span>
                    <Badge variant={dbStatus.connected ? 'success' : 'outline'} className="text-[10px]">
                      {dbStatus.connected ? 'PostgreSQL En Ligne' : 'Local / Drizzle Ready'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {dbStatus.connected
                      ? `Version : ${dbStatus.pgVersion ? dbStatus.pgVersion.split(' ')[0] : 'Supabase/PostgreSQL'}`
                      : 'Stockage local persistant avec synchronisation Drizzle disponible.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Contrôle d’Accès (RBAC)</span>
                    <Badge variant="success" className="text-[10px]">
                      Actif (4 Niveaux)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Les règles de permissions restreignent la modification et la suppression de tâches.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Sauvegarde & Export</span>
                    <Badge variant="apricot" className="text-[10px]">
                      iCal / JSON
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
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
                  className="w-full gap-2 text-xs font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Synchroniser les données maintenant</span>
                </Button>
                {syncFeedback && (
                  <p className="text-[11px] text-center text-slate-600 mt-2 font-medium">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filter and Search Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email ou département..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filtrer par rôle"
                  className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="admin">Administrateurs</option>
                  <option value="manager">Managers</option>
                  <option value="member">Membres</option>
                  <option value="guest">Invités</option>
                </select>
              </div>

              {/* Department filter */}
              {departments.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    aria-label="Filtrer par département"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden"
                  >
                    <option value="all">Tous départements</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                size="sm"
                onClick={() => setShowAddUserModal(true)}
                className="gap-1.5 text-xs font-bold shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ajouter</span>
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Département</th>
                  <th className="py-3 px-4">Rôle (RBAC)</th>
                  <th className="py-3 px-4 text-center">Tâches assignées</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">Aucun utilisateur correspondant trouvé</p>
                      <p className="text-[11px] text-slate-400 mt-1">
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

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#F7C59F]/40 border border-[#F7C59F]/70 text-[#59240A] font-black text-xs flex items-center justify-center uppercase shrink-0 shadow-2xs">
                              {user.name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isCurrent && (
                                  <Badge variant="apricot" className="text-[9px] py-0 px-1 font-bold">
                                    Vous
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 text-slate-600">
                          {user.department || <span className="text-slate-400 italic">Non spécifié</span>}
                        </td>

                        {/* Role selection / Badge */}
                        <td className="py-3 px-4">
                          {isEditingRole ? (
                            <div className="flex items-center gap-1.5">
                              <select
                                defaultValue={user.role}
                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value as UserRole)}
                                disabled={isUpdating}
                                aria-label="Modifier le rôle"
                                className="px-2 py-1 rounded-lg border border-[#F7C59F] bg-white text-xs font-semibold text-slate-800"
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="member">Member</option>
                                <option value="guest">Guest</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 px-1"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingUserId(user.id)}
                              title="Cliquer pour changer le rôle"
                              className={`group inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                  : user.role === 'manager'
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  : user.role === 'guest'
                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              <span>{user.role.toUpperCase()}</span>
                              <span className="opacity-0 group-hover:opacity-100 text-[9px] underline">
                                modifier
                              </span>
                            </button>
                          )}
                        </td>

                        {/* Assigned tasks */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              assignedTasksCount > 0 ? 'bg-slate-100 text-slate-800' : 'text-slate-400'
                            }`}
                          >
                            {assignedTasksCount}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Actif
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCurrent && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => onSelectUser(user)}
                                title="Tester l’application sous l’identité de ce membre"
                                className="text-[11px] font-semibold gap-1"
                              >
                                <span>Incarner</span>
                              </Button>
                            )}

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                title="Supprimer ce membre"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#BA5316]" />
                  Matrice des Droits & Permissions par Rôle (RBAC)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tableau comparatif des privilèges accordés selon le rôle attribué à chaque compte.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold">
                Sécurité Stricte
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fonctionnalité / Ressource</th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-purple-700">Admin</div>
                      <div className="text-[10px] font-normal text-slate-500">Contrôle absolu</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-blue-700">Manager</div>
                      <div className="text-[10px] font-normal text-slate-500">Responsable</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-emerald-700">Member</div>
                      <div className="text-[10px] font-normal text-slate-500">Opérationnel</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-amber-700">Guest</div>
                      <div className="text-[10px] font-normal text-slate-500">Consultation</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Créer, éditer et planifier des tâches
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Lecture seule</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Assigner des tâches à d’autres collaborateurs
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Tous</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Tous</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-bold">Auto-assignation</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Supprimer des tâches du projet
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Toutes</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Toutes</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-bold">Ses tâches créées</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Accès à l’interface d’administration
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Modifier les rôles et droits des utilisateurs
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      Gérer les catégories & étiquettes globales
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">✕ Non</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DATABASE & SYNC */}
      {activeSection === 'database' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#BA5316]" />
                  Gestion de la Base de Données (PostgreSQL / Supabase)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Surveillance du statut de connexion, schéma relationnel Drizzle ORM et synchronisation.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchDbStatus}
                disabled={dbStatus.loading}
                className="gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dbStatus.loading ? 'animate-spin' : ''}`} />
                <span>Tester la connexion</span>
              </Button>
            </div>

            {/* Status Card */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                dbStatus.connected
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {dbStatus.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Cloud className="w-5 h-5 text-[#BA5316] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-sm">
                  {dbStatus.connected
                    ? 'Base de données PostgreSQL connectée et active'
                    : 'Architecture Drizzle ORM prête'}
                </div>
                <p className="text-xs text-slate-600">
                  {dbStatus.connected
                    ? `Serveur connecté avec succès. Horodatage serveur : ${new Date(
                        dbStatus.serverTime || ''
                      ).toLocaleString('fr-FR')}`
                    : 'Les tables, schémas relationnels et API de synchronisation sont en place. Le stockage IndexedDB assure la continuité en local.'}
                </p>
              </div>
            </div>

            {/* Sync Controls */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900">Synchronisation des Tâches</div>
                <div className="text-[11px] text-slate-500">
                  Transférez vos {tasks.length} tâches vers le serveur PostgreSQL cloud.
                </div>
              </div>
              <Button
                onClick={handleSyncTasks}
                disabled={isSyncing}
                className="gap-2 text-xs font-bold shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Lancer la synchronisation</span>
              </Button>
            </div>

            {/* Schema Summary */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                Tables du Schéma Drizzle ORM (PostgreSQL)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="font-mono text-xs font-bold text-slate-900">users</div>
                  <div className="text-[11px] text-slate-500 mt-1">Identités, rôles (RBAC), profils</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="font-mono text-xs font-bold text-slate-900">tasks</div>
                  <div className="text-[11px] text-slate-500 mt-1">Tâches, assignations, rappels</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="font-mono text-xs font-bold text-slate-900">categories</div>
                  <div className="text-[11px] text-slate-500 mt-1">Classification, couleurs, icônes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Member */}
      {showAddUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#F7C59F]/30 border border-[#F7C59F]/60 flex items-center justify-center text-[#BA5316] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ajouter un nouveau membre</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Enregistrement dans l’annuaire d’équipe</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sophie Martin"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse email</label>
                <input
                  type="email"
                  required
                  placeholder="sophie.martin@entreprise.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rôle (RBAC)</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]"
                  >
                    <option value="admin">Admin (Complet)</option>
                    <option value="manager">Manager</option>
                    <option value="member">Membre</option>
                    <option value="guest">Invité</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Département</label>
                  <input
                    type="text"
                    placeholder="Ex: Marketing"
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#F7C59F]"
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
                <Button type="submit" size="sm" disabled={isSubmittingUser} className="font-bold">
                  {isSubmittingUser ? 'Création...' : 'Créer le membre'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
