'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReviewDossier,
  Department,
  ReviewStatus,
  WorkflowActor,
  PresenceMember,
} from '@/types/review';
import {
  getStoredDossiers,
  saveStoredDossiers,
} from '@/lib/review-service';
import {
  getActivePresence,
  pingPresence,
  subscribePresence,
} from '@/lib/presence-service';
import { DossierReviewStudioModal } from './DossierReviewStudioModal';
import { NewDossierModal } from './NewDossierModal';
import {
  GitPullRequest,
  Plus,
  Lock,
  Unlock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  Search,
  Filter,
  Eye,
  ShieldCheck,
  Building2,
  Scale,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { soundManager } from '@/lib/sound';

interface CollaborativeReviewPlatformProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role?: string;
    department?: string;
  } | null;
}

export const CollaborativeReviewPlatform: React.FC<CollaborativeReviewPlatformProps> = ({
  currentUser,
}) => {
  const [dossiers, setDossiers] = useState<ReviewDossier[]>(() => getStoredDossiers());
  const [selectedDept, setSelectedDept] = useState<'Tous' | Department>('Tous');
  const [selectedStatus, setSelectedStatus] = useState<'Tous' | ReviewStatus>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDossier, setActiveDossier] = useState<ReviewDossier | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [presenceMembers, setPresenceMembers] = useState<PresenceMember[]>(() => getActivePresence());

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

  // Load dossiers from persistence
  useEffect(() => {
    // Initial presence ping
    pingPresence(actor, undefined, 'viewing');

    // Subscribe to presence changes
    const unsubPresence = subscribePresence((members) => {
      setPresenceMembers(members);
    });

    // Listen for storage events across tabs
    const handleStorage = () => {
      setDossiers(getStoredDossiers());
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubPresence();
      window.removeEventListener('storage', handleStorage);
    };
  }, [actor]);

  // Update a dossier & persist
  const handleUpdateDossier = useCallback(
    (updated: ReviewDossier) => {
      setDossiers((prev) => {
        const next = prev.map((d) => (d.id === updated.id ? updated : d));
        saveStoredDossiers(next);
        return next;
      });
      setActiveDossier(updated);
    },
    []
  );

  // Create a new dossier
  const handleCreateDossier = useCallback((newDossier: ReviewDossier) => {
    setDossiers((prev) => {
      const next = [newDossier, ...prev];
      saveStoredDossiers(next);
      return next;
    });
    setActiveDossier(newDossier);
  }, []);

  // Filtered dossiers list
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchesDept = selectedDept === 'Tous' || d.department === selectedDept;
      const matchesStatus = selectedStatus === 'Tous' || d.status === selectedStatus;
      const matchesSearch =
        !searchQuery.trim() ||
        d.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.typology.toLowerCase().includes(searchQuery.toLowerCase());
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
        acc + d.interDepRequests.filter((r) => r.status === 'blocked' || r.priority === 'bloquant').length,
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
    };
  }, [dossiers]);

  // Open specific dossier & ping presence
  const handleOpenStudio = (d: ReviewDossier) => {
    soundManager.playClickSound();
    setActiveDossier(d);
    pingPresence(actor, d.id, 'viewing');
  };

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'brouillon':
        return { label: 'Brouillon', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
      case 'soumis':
        return { label: 'Soumis pour Revue', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'en_revision':
        return { label: 'En Révision', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'amendements':
        return { label: 'Amendements N+1', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'demande_corrections':
        return {
          label: 'Demande de Corrections',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold',
        };
      case 'valide':
        return {
          label: 'Validé & Verrouillé',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold',
        };
      case 'archive':
        return { label: 'Archivé', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* 1. Header Banner & Title (Dark Glassmorphism) */}
      <div className="relative overflow-hidden rounded-2xl bg-[#061A13]/85 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl border border-emerald-500/30 text-slate-100">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-amber-500 text-slate-950 shadow-md">
                <GitPullRequest className="w-5 h-5 stroke-[2.2]" />
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Plateforme Collaborative &amp; Circuit de Revue Métier
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Revue Maker-Checker, Diff &amp; Traçabilité Interdépartements
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Décloisonnez et sécurisez le travail entre <strong className="text-amber-300">Fiscalité</strong>,{' '}
              <strong className="text-emerald-300">Comptabilité</strong> et <strong className="text-blue-300">Juridique</strong>. Validation hiérarchique
              stricte, comparateur de versions et journal d&apos;audit légal immuable pour conformité
              zéro défaut.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-md hover:opacity-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Nouveau Dossier Métier
            </Button>
          </div>
        </div>

        {/* Real-time Phoenix Presence Live Bar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-200">
              Membres actifs en direct (Phoenix Presence) :
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {presenceMembers.length === 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-slate-400 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>En attente d&apos;activité</span>
              </div>
            ) : (
              presenceMembers.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-slate-200 text-[11px]"
                  title={`${m.userName} (${m.role}) - Statut: ${m.status}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      m.status === 'editing'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <strong className="text-white">{m.userName.split(' ')[0]}</strong>
                  <span className="text-slate-400">({m.department})</span>
                  {m.status === 'editing' && (
                    <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1 py-0.5 rounded font-mono font-bold">
                      Modifie
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metrics Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-emerald-500/30 shadow-xl flex flex-col text-slate-100">
          <span className="text-slate-400 text-xs font-medium">Total Dossiers</span>
          <span className="text-xl font-black text-white mt-1">{stats.total}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">3 départements</span>
        </div>

        <div className="p-3.5 bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-purple-500/30 shadow-xl flex flex-col text-slate-100">
          <span className="text-purple-300 text-xs font-semibold">En Revue N+1</span>
          <span className="text-xl font-black text-purple-200 mt-1">{stats.inReview}</span>
          <span className="text-[10px] text-purple-400 mt-0.5">Maker ➔ Checker</span>
        </div>

        <div className="p-3.5 bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-rose-500/30 shadow-xl flex flex-col text-slate-100">
          <span className="text-rose-300 text-xs font-semibold">À Corriger</span>
          <span className="text-xl font-black text-rose-200 mt-1">{stats.needsCorrections}</span>
          <span className="text-[10px] text-rose-400 mt-0.5">Consignes formulées</span>
        </div>

        <div className="p-3.5 bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-emerald-500/30 shadow-xl flex flex-col text-slate-100">
          <span className="text-emerald-300 text-xs font-semibold">Validés &amp; Verrouillés</span>
          <span className="text-xl font-black text-emerald-200 mt-1">{stats.validated}</span>
          <span className="text-[10px] text-emerald-400 mt-0.5">Conformité certifiée</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 bg-[#061A13]/85 backdrop-blur-2xl rounded-xl border border-amber-500/30 shadow-xl flex flex-col text-slate-100">
          <span className="text-amber-300 text-xs font-semibold">Passerelles Bloquantes</span>
          <span className="text-xl font-black text-amber-200 mt-1">{stats.blockedRequests}</span>
          <span className="text-[10px] text-amber-400 mt-0.5">Pièces en attente</span>
        </div>
      </div>

      {/* 3. Department Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-emerald-950/60 backdrop-blur-xl rounded-xl border border-emerald-500/30 shadow-xl">
        <button
          type="button"
          onClick={() => setSelectedDept('Tous')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedDept === 'Tous'
              ? 'bg-gradient-to-r from-emerald-500/30 to-amber-500/20 text-white border border-emerald-500/40 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-emerald-500/10'
          }`}
        >
          <Building2 className="w-4 h-4 text-amber-400" />
          Tous les Pôles ({dossiers.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDept('Fiscalité')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedDept === 'Fiscalité'
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-md'
              : 'text-slate-300 hover:text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-400" />
          Fiscalité ({deptCounts['Fiscalité']})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDept('Comptabilité')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedDept === 'Comptabilité'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shadow-md'
              : 'text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10'
          }`}
        >
          <Calculator className="w-4 h-4 text-emerald-400" />
          Comptabilité ({deptCounts['Comptabilité']})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDept('Juridique')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            selectedDept === 'Juridique'
              ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40 shadow-md'
              : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/10'
          }`}
        >
          <Scale className="w-4 h-4 text-blue-400" />
          Juridique ({deptCounts['Juridique']})
        </button>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#061A13]/85 backdrop-blur-2xl p-3.5 rounded-xl border border-emerald-500/30 shadow-xl">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, client, typologie..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-emerald-500/30 bg-[#061A13] text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Workflow State filters */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {(
            [
              'Tous',
              'brouillon',
              'soumis',
              'en_revision',
              'demande_corrections',
              'valide',
              'archive',
            ] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-gradient-to-r from-emerald-500/30 to-amber-500/20 text-white border border-emerald-500/40 font-bold shadow-xs'
                  : 'bg-emerald-950/40 text-slate-300 hover:bg-emerald-500/20 hover:text-white'
              }`}
            >
              {st === 'Tous'
                ? 'Tous statuts'
                : st === 'brouillon'
                  ? 'Brouillon'
                  : st === 'soumis'
                    ? 'Soumis'
                    : st === 'en_revision'
                      ? 'En Révision'
                      : st === 'demande_corrections'
                        ? 'Corrections'
                        : st === 'valide'
                          ? 'Validé'
                          : 'Archivé'}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Dossiers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDossiers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl border border-dashed border-emerald-500/30 text-slate-300 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-amber-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-md">
              <GitPullRequest className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h4 className="text-sm font-bold text-white">
              {dossiers.length === 0
                ? 'Aucun dossier métier pour le moment'
                : 'Aucun dossier correspondant aux filtres'}
            </h4>
            <p className="text-xs text-slate-300 mt-1.5 max-w-md mx-auto leading-relaxed">
              {dossiers.length === 0
                ? 'Initiez votre premier dossier pour activer le circuit de validation Maker-Checker, le comparateur de versions et la traçabilité interdépartements.'
                : 'Modifiez vos critères de recherche ou réinitialisez les filtres pour afficher vos dossiers.'}
            </p>
            {dossiers.length === 0 && (
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-md hover:opacity-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Créer un premier dossier
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredDossiers.map((dossier) => {
            const statusBadge = getStatusBadge(dossier.status);
            const hasBlockedRequest = dossier.interDepRequests.some(
              (r) => r.status === 'blocked' || r.priority === 'bloquant'
            );

            return (
              <div
                key={dossier.id}
                onClick={() => handleOpenStudio(dossier)}
                className="group relative flex flex-col justify-between bg-[#061A13]/85 backdrop-blur-2xl rounded-2xl p-5 border border-emerald-500/30 hover:border-emerald-500/60 shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer text-xs text-slate-100"
              >
                <div>
                  {/* Card Top: Ref & Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-[11px] font-black bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                      {dossier.ref}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {dossier.lock.isLocked && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          title={`Verrouillé par ${dossier.lock.lockedBy?.name || 'Superviseur'}`}
                        >
                          <Lock className="w-3 h-3 text-amber-400" />
                          Verrouillé
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          dossier.department === 'Fiscalité'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : dossier.department === 'Comptabilité'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {dossier.department}
                      </span>
                    </div>
                  </div>

                  {/* Title & Client */}
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-amber-300 transition-colors leading-snug">
                    {dossier.title}
                  </h3>

                  <div className="text-slate-400 font-semibold mb-3">
                    Client : <span className="text-slate-200">{dossier.clientName}</span>
                  </div>

                  {/* Typology & Priority */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-slate-300 text-[10px] font-medium border border-emerald-500/30">
                      {dossier.typology}
                    </span>

                    {hasBlockedRequest && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Passerelle bloquante
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Maker-Checker & Action */}
                <div className="pt-3 border-t border-emerald-500/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Maker : <strong className="text-slate-200">{dossier.maker.name.split(' ')[0]}</strong>
                    </span>
                    <span className="text-slate-400">
                      Checker :{' '}
                      <strong className="text-slate-200">{dossier.checker ? dossier.checker.name.split(' ')[0] : '-'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}
                    >
                      {statusBadge.label}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStudio(dossier);
                      }}
                      className="h-7 px-2 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Revue Métier ➔
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Review Studio Modal */}
      {activeDossier && (
        <DossierReviewStudioModal
          isOpen={Boolean(activeDossier)}
          onClose={() => setActiveDossier(null)}
          dossier={activeDossier}
          currentUser={actor}
          onUpdateDossier={handleUpdateDossier}
          activeViewers={presenceMembers.filter((m) => m.dossierId === activeDossier.id)}
        />
      )}

      {/* 7. New Dossier Modal */}
      <NewDossierModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        currentUser={actor}
        onCreateDossier={handleCreateDossier}
      />
    </div>
  );
};
