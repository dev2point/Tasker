'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Plus,
  Key,
  Layers,
  UserCheck,
  Briefcase,
  Shield,
  Server,
  Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, UserRole } from '@/types/user';
import { Task } from '@/types/task';

interface PostgresTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelectUser: (user: User) => void;
  tasks: Task[];
  onTasksSynced?: (tasks: Task[]) => void;
}

export const PostgresTeamModal: React.FC<PostgresTeamModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  tasks,
  onTasksSynced,
}) => {
  const [activeTab, setActiveTab] = useState<'db' | 'team' | 'roles' | 'schema'>('db');
  const [dbStatus, setDbStatus] = useState<{
    connected?: boolean;
    configured?: boolean;
    serverTime?: string;
    pgVersion?: string;
    schemaReady?: boolean;
    schemaMessage?: string;
    error?: string;
    loading: boolean;
  }>({ loading: true });

  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('member');
  const [newUserDept, setNewUserDept] = useState('Tech');

  const checkStatus = async () => {
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
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setTeamUsers(data.users);
      }
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    fetch('/api/db/status')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          setDbStatus({ ...data, loading: false });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setDbStatus({
            connected: false,
            configured: false,
            error: err instanceof Error ? err.message : 'Erreur de connexion',
            loading: false,
          });
        }
      });

    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.users) {
          setTeamUsers(data.users);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handleSyncNow = async () => {
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
        setSyncFeedback(`✅ Synchronisation réussie : ${data.count} tâches persistées dans PostgreSQL.`);
        if (onTasksSynced && data.tasks) {
          onTasksSynced(data.tasks);
        }
      } else {
        setSyncFeedback(data.message || 'Mode hors-ligne / IndexedDB local conservé.');
      }
    } catch {
      setSyncFeedback('Erreur lors de la synchronisation.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

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
      if (data.user) {
        setTeamUsers((prev) => [...prev, data.user]);
        setShowAddUser(false);
        setNewUserName('');
        setNewUserEmail('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg">PostgreSQL (Supabase) & Équipe</h2>
                <Badge
                  variant={dbStatus.connected ? 'success' : 'outline'}
                  className={`text-[10px] font-bold ${
                    dbStatus.connected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {dbStatus.connected ? 'Connecté (Drizzle)' : 'Mode Hybride / Local'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Gestion des rôles (RBAC), schéma Drizzle ORM et synchronisation cloud
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('db')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'db'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Base Supabase / Drizzle</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'team'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membres & Assignation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Matrice des Rôles (RBAC)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Schéma SQL (6 Tables)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PostgreSQL Supabase Status */}
          {activeTab === 'db' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border ${
                  dbStatus.connected
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {dbStatus.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Cloud className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {dbStatus.connected
                          ? 'Instance PostgreSQL Supabase opérationnelle'
                          : 'Prêt pour connexion Supabase PostgreSQL'}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {dbStatus.connected
                          ? `Connecté avec succès via Drizzle ORM. Horodatage serveur : ${new Date(
                              dbStatus.serverTime || ''
                            ).toLocaleString('fr-FR')}`
                          : 'L’architecture Drizzle ORM, les schémas relationnels et les routes API PostgreSQL sont prêts. Vous pouvez connecter votre URL de base de données à tout moment.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={checkStatus}
                    disabled={dbStatus.loading}
                    className="gap-1 text-xs shrink-0"
                  >
                    <RefreshCw className={`w-3 h-3 ${dbStatus.loading ? 'animate-spin' : ''}`} />
                    Tester
                  </Button>
                </div>
              </div>

              {/* Sync Action */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Synchronisation Bidirectionnelle</h4>
                    <p className="text-[11px] text-slate-500">
                      Synchronise les {tasks.length} tâches locales avec la base PostgreSQL cloud.
                    </p>
                  </div>
                  <Button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    size="sm"
                    className="gap-1.5 font-bold text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Synchroniser</span>
                  </Button>
                </div>
                {syncFeedback && (
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-medium">
                    {syncFeedback}
                  </div>
                )}
              </div>

              {/* Setup Guide */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Configuration de la variable DATABASE_URL</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Pour brancher votre projet Supabase, définissez <code>DATABASE_URL</code> dans vos variables
                  d&apos;environnement :
                </p>
                <pre className="bg-black/50 p-2.5 rounded-lg text-emerald-400 text-[11px] overflow-x-auto font-mono">
                  DATABASE_URL=&quot;postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres&quot;
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: Team Members & Active User Switcher */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Utilisateur Actif (Session Actuelle)</h4>
                  <p className="text-[11px] text-slate-500">
                    Sélectionnez votre profil pour tester les permissions et voir vos tâches assignées.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un membre
                </Button>
              </div>

              {/* New Member Form */}
              {showAddUser && (
                <form
                  onSubmit={handleCreateUser}
                  className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3 animate-in fade-in duration-150"
                >
                  <h5 className="font-bold text-xs text-indigo-950">Créer un nouveau membre</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nom complet (ex: Jean Dupont)"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <input
                      type="email"
                      placeholder="Email professionnel"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    >
                      <option value="admin">Administrateur (Tous droits)</option>
                      <option value="manager">Manager (Gestion d&apos;équipe)</option>
                      <option value="member">Membre (Assigné standard)</option>
                      <option value="guest">Invité (Lecture seule)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Département (ex: Ingénierie)"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowAddUser(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" size="xs">
                      Enregistrer
                    </Button>
                  </div>
                </form>
              )}

              {/* Team Members List */}
              <div className="space-y-2">
                {teamUsers.map((u) => {
                  const isCurrent = currentUser.id === u.id;
                  const assignedCount = tasks.filter((t) => t.assigneeId === u.id).length;

                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                          {u.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{u.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : u.role === 'manager'
                                  ? 'bg-blue-100 text-blue-700'
                                  : u.role === 'guest'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {u.role.toUpperCase()}
                            </span>
                            {isCurrent && (
                              <Badge variant="default" className="text-[9px] py-0 px-1 bg-indigo-600">
                                Actuel
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{u.email}</span>
                            {u.department && (
                              <>
                                <span>•</span>
                                <span>{u.department}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {assignedCount} tâche{assignedCount > 1 ? 's' : ''}
                        </span>
                        {!isCurrent && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => onSelectUser(u)}
                            className="text-xs gap-1"
                          >
                            <UserCheck className="w-3 h-3" />
                            Incarner
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: RBAC Matrix */}
          {activeTab === 'roles' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Matrice des Droits & Permissions Métier
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  La logique métier contrôle les accès selon le rôle de l&apos;utilisateur actif.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Action / Ressource</th>
                      <th className="p-2.5 text-center">Admin</th>
                      <th className="p-2.5 text-center">Manager</th>
                      <th className="p-2.5 text-center">Member</th>
                      <th className="p-2.5 text-center">Guest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">Créer & modifier des tâches</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✕ Non</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">Assigner des tâches à l&apos;équipe</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-amber-600 font-bold">Soi-même</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✕ Non</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">Supprimer toute tâche</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-amber-600 font-bold">Ses tâches</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✕ Non</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">Gérer les membres & rôles</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✕ Non</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✕ Non</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✕ Non</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-900">Accès aux statistiques & exports</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Oui</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Database Schema Viewer */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Tables PostgreSQL Définies avec Drizzle ORM
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Schéma relationnel complet optimisé pour PostgreSQL / Supabase.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-600 font-mono">users</span>
                    <Badge variant="outline" className="text-[9px]">
                      Table Principale
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    id, email, name, avatar_url, role, department, status, timestamps
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-600 font-mono">tasks</span>
                    <Badge variant="outline" className="text-[9px]">
                      Clé Métier
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    id, title, description, due_date, due_time, priority, status, category, creator_id, assignee_id,
                    subtasks, tags
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-600 font-mono">workspaces</span>
                    <Badge variant="outline" className="text-[9px]">
                      Multi-Tenant
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    id, name, description, owner_id, timestamps
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-600 font-mono">workspace_members</span>
                    <Badge variant="outline" className="text-[9px]">
                      Permissions
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    id, workspace_id, user_id, role, joined_at
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-600 font-mono">categories</span>
                    <Badge variant="outline" className="text-[9px]">
                      Organisation
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    id, name, color, bg_light, icon_name, workspace_id
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-600 font-mono">activity_logs</span>
                    <Badge variant="outline" className="text-[9px]">
                      Audit Trail
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    id, task_id, user_id, user_name, action, details, created_at
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{currentUser.name}</span>
            <span className="text-slate-400">•</span>
            <span className="capitalize text-indigo-600 font-bold">{currentUser.role}</span>
          </div>
          <Button onClick={onClose} size="sm" className="text-xs font-semibold">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
};
