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
      <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-md">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Console d’Administration
                </h1>
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-xs font-bold gap-1 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Espace Sécurisé
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold py-0.5">
                  {currentUser.name} (Admin)
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
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
              className="gap-1.5 text-xs font-semibold border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 text-slate-200 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbStatus.loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Vérifier connexion</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setShowAddUserModal(true)}
              className="gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 shadow-md cursor-pointer"
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
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
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
        <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-emerald-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Membres Actifs</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{teamUsers.length}</span>
            <span className="text-xs text-slate-400">
              ({stats.adminsCount} admin{stats.adminsCount > 1 ? 's' : ''})
            </span>
          </div>
        </div>

        <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-emerald-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Tâches Totales</span>
            <FolderOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.totalTasks}</span>
            <span className="text-xs text-emerald-400 font-semibold">{stats.completionRate}% terminées</span>
          </div>
        </div>

        <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-emerald-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Tâches Assignées</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.assignedTasks}</span>
            <span className="text-xs text-slate-400">sur {stats.totalTasks}</span>
          </div>
        </div>

        <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-emerald-500/30 p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>État Stockage</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                dbStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-bold text-white">
              {dbStatus.connected ? 'PostgreSQL Connecté' : 'Mode Hybride Local'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-emerald-950/60 backdrop-blur-xl border border-emerald-500/30 rounded-xl max-w-full overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'overview'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
          <span>Vue d’ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'users'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gestion des Utilisateurs ({teamUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'security'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Matrice des Droits (RBAC)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('database')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSection === 'database'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Base de données & Synchronisation</span>
        </button>
      </div>

      {/* 4. Section Contents */}

      {/* SECTION 1: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Quick Team Summary & Distribution */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-4 text-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Répartition des Rôles dans l’Équipe
                </h3>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setActiveSection('users')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold gap-1"
                >
                  Voir tous les membres <ArrowRight className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Administrateurs</div>
                  <div className="text-2xl font-black mt-1 text-purple-300">{stats.adminsCount}</div>
                  <div className="text-[10px] text-purple-400 mt-0.5">Accès absolu</div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Managers</div>
                  <div className="text-2xl font-black mt-1 text-blue-300">{stats.managersCount}</div>
                  <div className="text-[10px] text-blue-400 mt-0.5">Gestion d’équipe</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Membres</div>
                  <div className="text-2xl font-black mt-1 text-emerald-300">{stats.membersCount}</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Exécution de tâches</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Invités</div>
                  <div className="text-2xl font-black mt-1 text-amber-300">
                    {teamUsers.filter((u) => u.role === 'guest').length}
                  </div>
                  <div className="text-[10px] text-amber-400 mt-0.5">Lecture seule</div>
                </div>
              </div>

              {/* Recent Members preview */}
              <div className="pt-2 border-t border-emerald-500/20">
                <div className="text-xs font-bold text-slate-300 mb-2.5">Derniers membres enregistrés</div>
                <div className="divide-y divide-emerald-500/20">
                  {teamUsers.slice(0, 4).map((u) => (
                    <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs flex items-center justify-center uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {currentUser?.id === u.id && (
                              <Badge variant="apricot" className="bg-amber-500/20 text-amber-300 text-[9px] py-0 px-1 border border-amber-500/30">
                                Vous
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            u.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : u.role === 'manager'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {tasks.filter((t) => t.assigneeId === u.id).length} tâches
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-3 text-slate-100">
              <h3 className="text-sm font-bold text-white">Raccourcis Administrateur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 text-left transition-colors flex flex-col justify-between cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center mb-2 border border-emerald-500/40">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Inviter un membre</div>
                    <div className="text-[11px] text-slate-400">Ajouter à l’annuaire d’équipe</div>
                  </div>
                </button>

                {onOpenCategoryTagManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryTagManager}
                    className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 text-left transition-colors flex flex-col justify-between cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center mb-2 border border-amber-500/40">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Catégories & Tags</div>
                      <div className="text-[11px] text-slate-400">{categories.length} catégories configurées</div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveSection('database')}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 text-left transition-colors flex flex-col justify-between cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center mb-2 border border-emerald-500/40">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Synchroniser PostgreSQL</div>
                    <div className="text-[11px] text-slate-400">Sauvegarde cloud sécurisée</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: System Diagnostics & Health */}
          <div className="space-y-6">
            <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-4 text-slate-100">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                État du Système & Infrastructure
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Moteur Base de Données</span>
                    <Badge variant={dbStatus.connected ? 'success' : 'outline'} className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {dbStatus.connected ? 'PostgreSQL En Ligne' : 'Local / Drizzle Ready'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {dbStatus.connected
                      ? `Version : ${dbStatus.pgVersion ? dbStatus.pgVersion.split(' ')[0] : 'Supabase/PostgreSQL'}`
                      : 'Stockage local persistant avec synchronisation Drizzle disponible.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Contrôle d’Accès (RBAC)</span>
                    <Badge variant="success" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      Actif (4 Niveaux)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Les règles de permissions restreignent la modification et la suppression de tâches.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Sauvegarde & Export</span>
                    <Badge variant="apricot" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
                      iCal / JSON
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
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
                  className="w-full gap-2 text-xs font-bold border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 text-slate-200 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Synchroniser les données maintenant</span>
                </Button>
                {syncFeedback && (
                  <p className="text-[11px] text-center text-emerald-400 mt-2 font-medium">
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
        <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 shadow-2xl overflow-hidden text-slate-100">
          {/* Filter and Search Bar */}
          <div className="p-4 sm:p-5 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/40">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email ou département..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Role filter */}
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-2.5 py-1 text-xs text-slate-200">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filtrer par rôle"
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-hidden"
                >
                  <option value="all" className="bg-[#061A13] text-slate-100">Tous les rôles</option>
                  <option value="admin" className="bg-[#061A13] text-slate-100">Administrateurs</option>
                  <option value="manager" className="bg-[#061A13] text-slate-100">Managers</option>
                  <option value="member" className="bg-[#061A13] text-slate-100">Membres</option>
                  <option value="guest" className="bg-[#061A13] text-slate-100">Invités</option>
                </select>
              </div>

              {/* Department filter */}
              {departments.length > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-2.5 py-1 text-xs text-slate-200">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    aria-label="Filtrer par département"
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-hidden"
                  >
                    <option value="all" className="bg-[#061A13] text-slate-100">Tous départements</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#061A13] text-slate-100">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                size="sm"
                onClick={() => setShowAddUserModal(true)}
                className="gap-1.5 text-xs font-bold shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ajouter</span>
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-950/80 text-emerald-300 font-bold border-b border-emerald-500/30">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Département</th>
                  <th className="py-3 px-4">Rôle (RBAC)</th>
                  <th className="py-3 px-4 text-center">Tâches assignées</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/20 text-slate-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="font-semibold text-slate-300">Aucun utilisateur correspondant trouvé</p>
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
                      <tr key={user.id} className="hover:bg-emerald-500/10 transition-colors">
                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-black text-xs flex items-center justify-center uppercase shrink-0 shadow-sm">
                              {user.name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isCurrent && (
                                  <Badge variant="apricot" className="bg-amber-500/20 text-amber-300 text-[9px] py-0 px-1 border border-amber-500/30 font-bold">
                                    Vous
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 text-slate-300">
                          {user.department || <span className="text-slate-500 italic">Non spécifié</span>}
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
                                className="px-2 py-1 rounded-lg border border-emerald-500/40 bg-[#061A13] text-xs font-semibold text-white"
                              >
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="member">Member</option>
                                <option value="guest">Guest</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="text-[10px] text-slate-400 hover:text-white px-1"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingUserId(user.id)}
                              title="Cliquer pour changer le rôle"
                              className={`group inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all border ${
                                user.role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                                  : user.role === 'manager'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                  : user.role === 'guest'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
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
                              assignedTasksCount > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500'
                            }`}
                          >
                            {assignedTasksCount}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                                className="text-[11px] font-semibold gap-1 border-emerald-500/30 bg-emerald-950/40 text-slate-200 hover:bg-emerald-500/20 hover:text-white"
                              >
                                <span>Incarner</span>
                              </Button>
                            )}

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                title="Supprimer ce membre"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
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
          <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Matrice des Droits & Permissions par Rôle (RBAC)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tableau comparatif des privilèges accordés selon le rôle attribué à chaque compte.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                Sécurité Stricte
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-xl border border-emerald-500/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-950/80 text-slate-200 font-bold border-b border-emerald-500/30">
                  <tr>
                    <th className="py-3 px-4">Fonctionnalité / Ressource</th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-purple-400">Admin</div>
                      <div className="text-[10px] font-normal text-slate-400">Contrôle absolu</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-blue-400">Manager</div>
                      <div className="text-[10px] font-normal text-slate-400">Responsable</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-emerald-400">Member</div>
                      <div className="text-[10px] font-normal text-slate-400">Opérationnel</div>
                    </th>
                    <th className="py-3 px-4 text-center">
                      <div className="font-bold text-amber-400">Guest</div>
                      <div className="text-[10px] font-normal text-slate-400">Consultation</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/20 text-slate-200">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">
                      Créer, éditer et planifier des tâches
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Lecture seule</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">
                      Assigner des tâches à d’autres collaborateurs
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Tous</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Tous</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-bold">Auto-assignation</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">
                      Supprimer des tâches du projet
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Toutes</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Toutes</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-bold">Ses tâches créées</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">
                      Accès à l’interface d’administration
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">
                      Modifier les rôles et droits des utilisateurs
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">
                      Gérer les catégories & étiquettes globales
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Oui</td>
                    <td className="py-3 px-4 text-center text-rose-400 font-bold">✕ Non</td>
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
          <div className="bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-400" />
                  Gestion de la Base de Données (PostgreSQL / Supabase)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Surveillance du statut de connexion, schéma relationnel Drizzle ORM et synchronisation.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchDbStatus}
                disabled={dbStatus.loading}
                className="gap-1.5 text-xs font-semibold border-emerald-500/30 bg-emerald-950/40 text-slate-200 hover:bg-emerald-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dbStatus.loading ? 'animate-spin' : ''}`} />
                <span>Tester la connexion</span>
              </Button>
            </div>

            {/* Status Card */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                dbStatus.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-slate-200'
              }`}
            >
              {dbStatus.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Cloud className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-sm text-white">
                  {dbStatus.connected
                    ? 'Base de données PostgreSQL connectée et active'
                    : 'Architecture Drizzle ORM prête'}
                </div>
                <p className="text-xs text-slate-300">
                  {dbStatus.connected
                    ? `Serveur connecté avec succès. Horodatage serveur : ${new Date(
                        dbStatus.serverTime || ''
                      ).toLocaleString('fr-FR')}`
                    : 'Les tables, schémas relationnels et API de synchronisation sont en place. Le stockage IndexedDB assure la continuité en local.'}
                </p>
              </div>
            </div>

            {/* Sync Controls */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white">Synchronisation des Tâches</div>
                <div className="text-[11px] text-slate-400">
                  Transférez vos {tasks.length} tâches vers le serveur PostgreSQL cloud.
                </div>
              </div>
              <Button
                onClick={handleSyncTasks}
                disabled={isSyncing}
                className="gap-2 text-xs font-bold shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Lancer la synchronisation</span>
              </Button>
            </div>

            {/* Schema Summary */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-200 mb-2.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                Tables du Schéma Drizzle ORM (PostgreSQL)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40">
                  <div className="font-mono text-xs font-bold text-emerald-300">users</div>
                  <div className="text-[11px] text-slate-400 mt-1">Identités, rôles (RBAC), profils</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40">
                  <div className="font-mono text-xs font-bold text-emerald-300">tasks</div>
                  <div className="text-[11px] text-slate-400 mt-1">Tâches, assignations, rappels</div>
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40">
                  <div className="font-mono text-xs font-bold text-emerald-300">categories</div>
                  <div className="text-[11px] text-slate-400 mt-1">Classification, couleurs, icônes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Member */}
      {showAddUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#061A13]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden text-slate-100">
            <div className="bg-emerald-950/60 border-b border-emerald-500/20 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Ajouter un nouveau membre</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Enregistrement dans l’annuaire d’équipe</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sophie Martin"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Adresse email</label>
                <input
                  type="email"
                  required
                  placeholder="sophie.martin@entreprise.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Rôle (RBAC)</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 rounded-xl border border-emerald-500/30 bg-[#061A13] text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="admin">Admin (Complet)</option>
                    <option value="manager">Manager</option>
                    <option value="member">Membre</option>
                    <option value="guest">Invité</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Département</label>
                  <input
                    type="text"
                    placeholder="Ex: Marketing"
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddUserModal(false)}
                  className="text-slate-300 hover:text-white hover:bg-emerald-500/20"
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingUser} className="font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer">
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
