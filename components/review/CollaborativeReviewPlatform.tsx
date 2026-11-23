'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ReviewDossier,
  Department,
  ReviewStatus,
  WorkflowActor,
  PresenceMember,
} from '@/types/review';
import { User } from '@/types/user';
import {
  getStoredDossiers,
  saveStoredDossiers,
  canUserDeleteDossier,
  mergeDossierPreservingCachedFileBytes,
  mergeServerDossiersIntoLocal,
} from '@/lib/review-service';
import {
  getActivePresence,
  pingPresence,
  subscribePresence,
  updatePresenceFromRemote,
} from '@/lib/presence-service';
import { useRealtimeEvents } from '@/lib/use-realtime-events';
import { formatRealtimeAlertType } from '@/lib/realtime-hub';
import { DossierReviewStudioModal } from './DossierReviewStudioModal';
import { NewDossierModal } from './NewDossierModal';
import {
  GitPullRequest,
  Plus,
  Lock,
  AlertTriangle,
  Search,
  Printer,
  BellRing,
  X,
  ChevronRight,
  Trash2,
  MoreHorizontal,
  SlidersHorizontal,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { soundManager } from '@/lib/sound';

interface CollaborativeReviewPlatformProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role?: string;
    department?: string;
  } | null;
  teamUsers?: User[];
  onOpenReportModal?: (department?: 'Tous' | Department) => void;
  isSidebarCollapsed?: boolean;
  onStudioOpenChange?: (isOpen: boolean) => void;
}

export const CollaborativeReviewPlatform: React.FC<CollaborativeReviewPlatformProps> = ({
  currentUser,
  teamUsers = [],
  onOpenReportModal,
  isSidebarCollapsed = false,
  onStudioOpenChange,
}) => {
  const [dossiers, setDossiers] = useState<ReviewDossier[]>(() => getStoredDossiers());
  const [selectedDept, setSelectedDept] = useState<'Tous' | Department>('Tous');
  const [selectedStatus, setSelectedStatus] = useState<'Tous' | ReviewStatus>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDossier, setActiveDossier] = useState<ReviewDossier | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [presenceMembers, setPresenceMembers] = useState<PresenceMember[]>(() => getActivePresence());
  const [dossierToDelete, setDossierToDelete] = useState<ReviewDossier | null>(null);
  const [isDeletingDossier, setIsDeletingDossier] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const shouldPersistDossiersRef = useRef(false);

  // Persist dossiers cleanly after commit (never inside a setState updater)
  useEffect(() => {
    if (!shouldPersistDossiersRef.current) return;
    shouldPersistDossiersRef.current = false;
    saveStoredDossiers(dossiers);
  }, [dossiers]);

  // Synchronize studio open state with parent sidebar layout
  const isStudioOpen = Boolean(activeDossier);
  useEffect(() => {
    onStudioOpenChange?.(isStudioOpen);
  }, [isStudioOpen, onStudioOpenChange]);

  useEffect(() => {
    return () => {
      onStudioOpenChange?.(false);
    };
  }, [onStudioOpenChange]);

  // Construct current actor
  const actor: WorkflowActor = useMemo(() => {
    const fallbackName = currentUser?.email
      ? currentUser.email.split('@')[0]
      : 'Collaborateur';
    return {
      id: currentUser?.id || 'usr-current',
      name: currentUser?.name || fallbackName,
      email: currentUser?.email || '',
      department: (currentUser?.department as Department) || 'Fiscalité',
      role: (currentUser?.role as any) || 'manager',
    };
  }, [currentUser]);

  // Real-time Server-Sent Events (SSE) hook
  const { alerts, dismissAlert } = useRealtimeEvents({
    currentUserId: currentUser?.id,
    currentUserRole: currentUser?.role,
    onDossierUpdate: (remoteDossier) => {
      shouldPersistDossiersRef.current = true;
      setDossiers((prev) => {
        const existing = prev.find((d) => d.id === remoteDossier.id);
        const merged = mergeDossierPreservingCachedFileBytes(remoteDossier, existing);
        if (existing) {
          return prev.map((d) => (d.id === merged.id ? merged : d));
        }
        return [merged, ...prev];
      });

      // Synchronize currently opened studio modal if same dossier
      setActiveDossier((cur) =>
        cur && cur.id === remoteDossier.id
          ? mergeDossierPreservingCachedFileBytes(remoteDossier, cur)
          : cur
      );
    },
    onDossierDelete: (deletedId) => {
      shouldPersistDossiersRef.current = true;
      setDossiers((prev) => prev.filter((d) => d.id !== deletedId));
      setActiveDossier((cur) => (cur && cur.id === deletedId ? null : cur));
    },
    onPresenceUpdate: (remoteMembers) => {
      setPresenceMembers(remoteMembers);
      updatePresenceFromRemote(remoteMembers);
    },
  });

  useEffect(() => {
    if (!currentUser?.id) return;

    let isCancelled = false;
    const hydrateServerDossiers = async () => {
      try {
        const res = await fetch('/api/review/dossiers', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const serverDossiers = Array.isArray(data?.dossiers)
          ? (data.dossiers as ReviewDossier[])
          : [];
        if (isCancelled || serverDossiers.length === 0) return;

        shouldPersistDossiersRef.current = true;
        setDossiers((prev) => mergeServerDossiersIntoLocal(prev, serverDossiers));
      } catch (err) {
        console.warn('Failed to hydrate review dossiers:', err);
      }
    };

    void hydrateServerDossiers();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

  // Load dossiers from persistence
  useEffect(() => {
    // Initial presence ping
    pingPresence(actor, undefined, 'viewing');

    // Subscribe to presence changes
    const unsubPresence = subscribePresence((members) => {
      setPresenceMembers(members);
    });

    // Listen for storage events across tabs and same-tab dossier updates
    const handleStorage = () => {
      shouldPersistDossiersRef.current = false;
      setDossiers(getStoredDossiers());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('planit_dossiers_change', handleStorage);

    return () => {
      unsubPresence();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('planit_dossiers_change', handleStorage);
    };
  }, [actor]);

  // Update a dossier & persist + broadcast to server SSE hub with OCC verification
  const handleUpdateDossier = useCallback(
    async (
      updated: ReviewDossier,
      options?: { force?: boolean }
    ): Promise<{
      success: boolean;
      conflict?: boolean;
      serverDossier?: ReviewDossier;
      serverVersion?: number;
      clientVersion?: number;
      dossier?: ReviewDossier;
      message?: string;
    }> => {
      // Async broadcast to server SSE endpoint with expected version for OCC validation
      try {
        const res = await fetch('/api/review/dossiers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dossierId: updated.id,
            expectedVersion: updated.version || 1,
            updatedDossier: updated,
            force: options?.force,
          }),
        });

        if (res.status === 409) {
          const data = await res.json();
          return {
            success: false,
            conflict: true,
            serverDossier: data.serverDossier,
            serverVersion: data.serverVersion,
            clientVersion: data.clientVersion,
            message: data.error,
          };
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return {
            success: false,
            message: errData.error || 'Erreur lors de la mise à jour du dossier.',
          };
        }

        const data = await res.json();
        const finalized: ReviewDossier = data.dossier || updated;

        shouldPersistDossiersRef.current = true;
        setDossiers((prev) => prev.map((d) => (d.id === finalized.id ? finalized : d)));
        setActiveDossier(finalized);

        return { success: true, dossier: finalized };
      } catch {
        // Safe offline fallback: bump version locally
        const fallbackDossier: ReviewDossier = {
          ...updated,
          version: (updated.version || 1) + 1,
          updatedAt: new Date().toISOString(),
        };
        shouldPersistDossiersRef.current = true;
        setDossiers((prev) => prev.map((d) => (d.id === fallbackDossier.id ? fallbackDossier : d)));
        setActiveDossier(fallbackDossier);
        return { success: true, dossier: fallbackDossier };
      }
    },
    []
  );

  // Create a new dossier & persist + broadcast
  const handleCreateDossier = useCallback(async (newDossier: ReviewDossier) => {
    shouldPersistDossiersRef.current = true;
    setDossiers((prev) => [newDossier, ...prev]);
    setActiveDossier(newDossier);

    // Async broadcast to server SSE endpoint & sync server-computed fields (IP, SHA-256)
    try {
      const res = await fetch('/api/review/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDossier),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.dossier) {
          const synced = mergeDossierPreservingCachedFileBytes(data.dossier, newDossier);
          shouldPersistDossiersRef.current = true;
          setDossiers((prev) => prev.map((d) => (d.id === synced.id ? synced : d)));
          setActiveDossier((cur) => (cur && cur.id === synced.id ? synced : cur));
        }
      }
    } catch {
      // Safe offline fallback
    }
  }, []);

  // Delete a dossier & persist + broadcast
  const handleDeleteDossier = useCallback(
    async (dossierId: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const res = await fetch(`/api/review/dossiers?id=${encodeURIComponent(dossierId)}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData?.error || 'Suppression refusée.';
          setDeleteError(msg);
          return { success: false, message: msg };
        }
      } catch {
        // Offline / localStorage fallback
      }

      soundManager.playClickSound();
      shouldPersistDossiersRef.current = true;
      setDossiers((prev) => prev.filter((d) => d.id !== dossierId));
      setActiveDossier((cur) => (cur && cur.id === dossierId ? null : cur));
      setDeleteError(null);
      return { success: true };
    },
    []
  );

  // Filtered dossiers list
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchesDept = selectedDept === 'Tous' || d.department === selectedDept;
      const matchesStatus = selectedStatus === 'Tous' || d.status === selectedStatus;
      const matchesSearch =
        !searchQuery.trim() ||
        (d.ref || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.typology || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [dossiers, selectedDept, selectedStatus, searchQuery]);

  // High-level statistics
  const stats = useMemo(() => {
    const total = dossiers.length;
    const inReview = dossiers.filter(
      (d) => d.status === 'soumis' || d.status === 'en_revision' || d.status === 'amendements'
    ).length;
    const needsCorrections = dossiers.filter((d) => d.status === 'demande_corrections').length;
    const validated = dossiers.filter((d) => d.status === 'valide' || d.status === 'archive').length;
    const blockedRequests = dossiers.reduce(
      (acc, d) =>
        acc + (d.interDepRequests || []).filter((r) => r.status === 'blocked' || r.priority === 'bloquant').length,
      0
    );

    return { total, inReview, needsCorrections, validated, blockedRequests };
  }, [dossiers]);

  // Department counts
  const deptCounts = useMemo(() => {
    return {
      Fiscalité: dossiers.filter((d) => d.department === 'Fiscalité').length,
      Comptabilité: dossiers.filter((d) => d.department === 'Comptabilité').length,
      Juridique: dossiers.filter((d) => d.department === 'Juridique').length,
      'Recherche & Innovation': dossiers.filter((d) => d.department === 'Recherche & Innovation').length,
    };
  }, [dossiers]);

  // Open specific dossier & ping presence
  const handleOpenStudio = (d: ReviewDossier) => {
    soundManager.playClickSound();
    setActiveDossier(d);
    pingPresence(actor, d.id, 'viewing');
  };

  const resetFilters = () => {
    setSelectedDept('Tous');
    setSelectedStatus('Tous');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedDept !== 'Tous' || selectedStatus !== 'Tous' || searchQuery.trim().length > 0;
  const activeFilterCount =
    (selectedDept !== 'Tous' ? 1 : 0) +
    (selectedStatus !== 'Tous' ? 1 : 0) +
    (searchQuery.trim().length > 0 ? 1 : 0);

  const getStatusMeta = (status: ReviewStatus) => {
    switch (status) {
      case 'brouillon':
        return { label: 'Brouillon', dot: 'bg-slate-400', text: 'text-slate-300' };
      case 'soumis':
        return { label: 'Soumis', dot: 'bg-sky-400', text: 'text-sky-300' };
      case 'en_revision':
        return { label: 'En révision', dot: 'bg-violet-400', text: 'text-violet-300' };
      case 'amendements':
        return { label: 'Amendements', dot: 'bg-amber-400', text: 'text-amber-300' };
      case 'demande_corrections':
        return { label: 'À corriger', dot: 'bg-rose-400', text: 'text-rose-300 font-semibold' };
      case 'valide':
        return { label: 'Validé', dot: 'bg-emerald-400', text: 'text-emerald-300 font-semibold' };
      case 'archive':
        return { label: 'Archivé', dot: 'bg-slate-500', text: 'text-slate-400' };
    }
  };

  const departmentTabs: Array<{ id: 'Tous' | Department; label: string; count: number }> = [
    { id: 'Tous', label: 'Tous', count: dossiers.length },
    { id: 'Fiscalité', label: 'Fiscalité', count: deptCounts['Fiscalité'] },
    { id: 'Comptabilité', label: 'Comptabilité', count: deptCounts['Comptabilité'] },
    { id: 'Juridique', label: 'Juridique', count: deptCounts['Juridique'] },
    { id: 'Recherche & Innovation', label: 'R&I', count: deptCounts['Recherche & Innovation'] },
  ];

  return (
    <div className="flex flex-col gap-5 w-full pb-14">
      {/* 1. Essential Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-emerald-500/15">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Revue métier</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 tabular-nums">
            <span>{stats.inReview} en revue</span>
            {stats.needsCorrections > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400 font-medium">
                  {stats.needsCorrections} à corriger
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenReportModal && (
            <div
              className="relative shrink-0"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsActionsOpen(false);
              }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsActionsOpen((open) => !open)}
                aria-expanded={isActionsOpen}
                aria-controls="header-actions-menu"
                className="border-emerald-500/30 bg-transparent text-slate-300 hover:bg-emerald-500/15 hover:text-white font-medium text-xs gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
              >
                <MoreHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Plus d&apos;actions</span>
              </Button>
              <div
                id="header-actions-menu"
                className={`${isActionsOpen ? 'block' : 'hidden'} absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-emerald-500/25 bg-[#061A13] p-1 shadow-xl`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    onOpenReportModal(selectedDept);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-200 hover:bg-emerald-500/15 hover:text-white focus-visible:outline-none focus-visible:bg-emerald-500/15 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rapport PDF</span>
                </button>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs gap-1.5 px-4 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Nouveau dossier</span>
          </Button>
        </div>
      </div>

      {/* 2. Live Alerts (Only shown when actionable events occur) */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.slice(0, 1).map((alert, alertIdx) => (
            <div
              key={alert?.id || `alert-${alertIdx}`}
              className="px-4 py-2.5 rounded-lg bg-[#061A13]/90 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-slate-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium text-white shrink-0">
                  {formatRealtimeAlertType(alert?.type)}
                </span>
                <span className="text-slate-400 truncate">{alert?.message || ''}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {alert.targetId && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = dossiers.find((d) => d.id === alert.targetId);
                      if (target) {
                        handleOpenStudio(target);
                        dismissAlert(alert.id);
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Ouvrir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  aria-label="Fermer la notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Search + Filters disclosure */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un dossier, client..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-emerald-500/20 bg-[#061A13]/85 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/60 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            className="shrink-0"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsFiltersOpen(false);
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFiltersOpen((open) => !open)}
              aria-expanded={isFiltersOpen}
              aria-controls="filters-panel"
              className="border-emerald-500/30 bg-transparent text-slate-300 hover:bg-emerald-500/15 hover:text-white font-medium text-xs gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filtres</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div
          id="filters-panel"
          className={`${isFiltersOpen ? 'flex' : 'hidden'} flex-col gap-3 rounded-lg border border-emerald-500/20 bg-[#061A13]/85 p-3`}
        >
          <div className="flex flex-wrap items-center gap-1">
            {departmentTabs.map((tab) => {
              const isActive = selectedDept === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedDept(tab.id)}
                  title={tab.id === 'Recherche & Innovation' ? 'Recherche & Innovation' : undefined}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:bg-emerald-500/15 ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <select
              aria-label="Filtrer par statut"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'Tous' | ReviewStatus)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/20 bg-[#061A13]/95 text-slate-200 focus:outline-none focus:border-emerald-400/60 cursor-pointer w-full sm:w-auto"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="soumis">Soumis</option>
              <option value="en_revision">En révision</option>
              <option value="amendements">Amendements</option>
              <option value="demande_corrections">À corriger</option>
              <option value="valide">Validé</option>
              <option value="archive">Archivé</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/30 bg-transparent text-slate-300 hover:bg-emerald-500/15 hover:text-white focus-visible:outline-none focus-visible:bg-emerald-500/15 cursor-pointer transition-colors whitespace-nowrap"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {deleteError && (
        <div className="px-4 py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200">
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-rose-300 hover:text-white cursor-pointer"
            aria-label="Fermer l'erreur"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Essential Dossiers List */}
      {filteredDossiers.length === 0 ? (
        <div className="rounded-xl bg-[#061A13]/75 border border-emerald-500/20 py-14 px-6 text-center">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-white">Aucun dossier</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {dossiers.length === 0
              ? 'Créez un dossier pour démarrer la revue collaborative.'
              : 'Aucun dossier ne correspond aux filtres actifs.'}
          </p>
          <div className="mt-4">
            {dossiers.length === 0 ? (
              <Button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs gap-1.5 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau dossier</span>
              </Button>
            ) : (
              hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                  className="border-emerald-500/30 bg-transparent text-slate-200 hover:bg-emerald-500/15 text-xs px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Réinitialiser les filtres
                </Button>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#061A13]/85 border border-emerald-500/20 overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_120px_110px] gap-4 px-5 py-2.5 border-b border-emerald-500/15 text-[11px] font-medium text-slate-400">
            <span>Dossier</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-emerald-500/10">
            {filteredDossiers.map((dossier) => {
              const statusMeta = getStatusMeta(dossier.status);
              const hasBlockedRequest = (dossier.interDepRequests || []).some(
                (r) => r.status === 'blocked' || r.priority === 'bloquant'
              );
              const makerName = (dossier.maker?.name || 'Auteur').split(' ')[0];
              const checkerName = dossier.checker?.name
                ? dossier.checker.name.split(' ')[0]
                : 'À assigner';
              const allowDelete = canUserDeleteDossier(dossier, actor);

              return (
                <div
                  key={dossier.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenStudio(dossier)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenStudio(dossier);
                    }
                  }}
                  className="group grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_110px] gap-2 md:gap-4 items-center px-5 py-3.5 hover:bg-emerald-500/[0.06] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:bg-emerald-500/10"
                >
                  {/* Dossier Title + Metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {dossier.title}
                      </span>
                      {dossier.lock.isLocked && (
                        <Lock
                          className="w-3.5 h-3.5 text-amber-400 shrink-0"
                          aria-label={`Verrouillé par ${dossier.lock.lockedBy?.name || 'Superviseur'}`}
                        />
                      )}
                      {hasBlockedRequest && (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-rose-400 shrink-0"
                          aria-label="Passerelle inter-pôle bloquante"
                        />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                      <span className="font-mono text-emerald-300/90 tabular-nums shrink-0">
                        {dossier.ref}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300 truncate">{dossier.clientName}</span>
                      <span aria-hidden="true" className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline truncate">{dossier.typology}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {dossier.department === 'Recherche & Innovation' ? 'R&I' : dossier.department}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {makerName} <span className="text-slate-500">→</span> {checkerName}
                      </span>
                      {(dossier.trackedFiles?.length || 0) > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            title={`${dossier.trackedFiles?.length} pièce(s) jointe(s)`}
                            className="inline-flex items-center gap-1 text-emerald-300 font-medium shrink-0"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{dossier.trackedFiles?.length}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between md:justify-start gap-2 text-xs">
                    <span className="text-slate-500 md:hidden">Statut</span>
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${statusMeta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    {allowDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          soundManager.playClickSound();
                          setDossierToDelete(dossier);
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        title="Supprimer le dossier"
                        aria-label={`Supprimer ${dossier.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 group-hover:text-emerald-300 whitespace-nowrap">
                      Ouvrir
                      <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Review Studio Modal */}
      {activeDossier && (
        <DossierReviewStudioModal
          isOpen={Boolean(activeDossier)}
          onClose={() => {
            setActiveDossier(null);
            pingPresence(actor, undefined, 'viewing');
          }}
          dossier={activeDossier}
          currentUser={actor}
          teamUsers={teamUsers}
          onUpdateDossier={handleUpdateDossier}
          onDeleteDossier={handleDeleteDossier}
          canDelete={canUserDeleteDossier(activeDossier, actor)}
          activeViewers={presenceMembers.filter((m) => m.dossierId === activeDossier.id)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
      )}

      {/* 6. New Dossier Modal */}
      <NewDossierModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        currentUser={actor}
        teamUsers={teamUsers}
        onCreateDossier={handleCreateDossier}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* 7. Delete Confirmation Dialog */}
      {dossierToDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#061A13] rounded-xl shadow-2xl p-5 border border-rose-500/35 text-slate-100">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Supprimer ce dossier ?
              </h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Le dossier <span className="font-mono text-emerald-300">{dossierToDelete.ref}</span> («{' '}
                <strong className="text-white">{dossierToDelete.title}</strong> » · {dossierToDelete.clientName}) sera définitivement supprimé.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDossierToDelete(null)}
                  disabled={isDeletingDossier}
                  className="text-xs border-emerald-500/30 bg-transparent text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDeletingDossier}
                  onClick={async () => {
                    setIsDeletingDossier(true);
                    await handleDeleteDossier(dossierToDelete.id);
                    setIsDeletingDossier(false);
                    setDossierToDelete(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer"
                >
                  {isDeletingDossier ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
