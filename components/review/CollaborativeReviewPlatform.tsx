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
    return {
      id: currentUser?.id || 'usr-current',
      name: currentUser?.name || 'Moi (Collaborateur)',
      email: currentUser?.email || 'user@cabinet.fr',
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
        return { label: 'Brouillon', color: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'soumis':
        return { label: 'Soumis pour Revue', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'en_revision':
        return { label: 'En Révision', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'amendements':
        return { label: 'Amendements N+1', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'demande_corrections':
        return {
          label: 'Demande de Corrections',
          color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        };
      case 'valide':
        return {
          label: 'Validé & Verrouillé',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        };
      case 'archive':
        return { label: 'Archivé', color: 'bg-slate-200 text-slate-800 border-slate-400' };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* 1. Header Banner & Title */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-7 shadow-lg border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#EE8D4B]/20 text-[#EE8D4B] border border-[#EE8D4B]/30">
                <GitPullRequest className="w-5 h-5" />
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#F7C59F] font-bold">
                Plateforme Collaborative &amp; Circuit de Revue Métier
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Revue Maker-Checker, Diff &amp; Traçabilité Interdépartements
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Décloisonnez et sécurisez le travail entre <strong>Fiscalité</strong>,{' '}
              <strong>Comptabilité</strong> et <strong>Juridique</strong>. Validation hiérarchique
              stricte, comparateur de versions et journal d&apos;audit légal immuable pour conformité
              zéro défaut.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="bg-[#EE8D4B] hover:bg-[#BA5316] text-[#422006] hover:text-white font-bold text-xs gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Nouveau Dossier Métier
            </Button>
          </div>
        </div>

        {/* Real-time Phoenix Presence Live Bar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-bold text-slate-200">
              Membres actifs en direct (Phoenix Presence) :
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {presenceMembers.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 text-[11px]"
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
                  <span className="text-[10px] text-amber-300 font-mono">Modifie</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Metrics Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <span className="text-slate-500 text-xs font-medium">Total Dossiers</span>
          <span className="text-xl font-black text-slate-900 mt-1">{stats.total}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">3 départements</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex flex-col">
          <span className="text-indigo-700 text-xs font-semibold">En Revue N+1</span>
          <span className="text-xl font-black text-indigo-900 mt-1">{stats.inReview}</span>
          <span className="text-[10px] text-indigo-500 mt-0.5">Maker ➔ Checker</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-rose-200/80 shadow-2xs flex flex-col">
          <span className="text-rose-700 text-xs font-semibold">À Corriger</span>
          <span className="text-xl font-black text-rose-900 mt-1">{stats.needsCorrections}</span>
          <span className="text-[10px] text-rose-500 mt-0.5">Consignes formulées</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col">
          <span className="text-emerald-700 text-xs font-semibold">Validés &amp; Verrouillés</span>
          <span className="text-xl font-black text-emerald-900 mt-1">{stats.validated}</span>
          <span className="text-[10px] text-emerald-600 mt-0.5">Conformité certifiée</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex flex-col">
          <span className="text-amber-800 text-xs font-semibold">Passerelles Bloquantes</span>
          <span className="text-xl font-black text-amber-900 mt-1">{stats.blockedRequests}</span>
          <span className="text-[10px] text-amber-600 mt-0.5">Pièces en attente</span>
        </div>
      </div>

      {/* 3. Department Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl border border-slate-300/60 shadow-2xs">
        <button
          type="button"
          onClick={() => setSelectedDept('Tous')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedDept === 'Tous'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-300/50'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Tous les Pôles ({dossiers.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDept('Fiscalité')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedDept === 'Fiscalité'
              ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-xs'
              : 'text-slate-600 hover:text-amber-900'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-600" />
          Fiscalité ({deptCounts['Fiscalité']})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDept('Comptabilité')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedDept === 'Comptabilité'
              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-xs'
              : 'text-slate-600 hover:text-emerald-900'
          }`}
        >
          <Calculator className="w-4 h-4 text-emerald-600" />
          Comptabilité ({deptCounts['Comptabilité']})
        </button>

        <button
          type="button"
          onClick={() => setSelectedDept('Juridique')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedDept === 'Juridique'
              ? 'bg-blue-100 text-blue-950 border border-blue-300 shadow-xs'
              : 'text-slate-600 hover:text-blue-900'
          }`}
        >
          <Scale className="w-4 h-4 text-blue-600" />
          Juridique ({deptCounts['Juridique']})
        </button>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, client, typologie..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
            <GitPullRequest className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-700">Aucun dossier trouvé</h4>
            <p className="text-xs text-slate-500 mt-1">
              Modifiez vos critères de recherche ou créez un nouveau dossier métier.
            </p>
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
                className="group relative flex flex-col justify-between bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-[#EE8D4B]/70 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer text-xs"
              >
                <div>
                  {/* Card Top: Ref & Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-[11px] font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                      {dossier.ref}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {dossier.lock.isLocked && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300"
                          title={`Verrouillé par ${dossier.lock.lockedBy?.name || 'Superviseur'}`}
                        >
                          <Lock className="w-3 h-3 text-amber-700" />
                          Verrouillé
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          dossier.department === 'Fiscalité'
                            ? 'bg-amber-100 text-amber-900'
                            : dossier.department === 'Comptabilité'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {dossier.department}
                      </span>
                    </div>
                  </div>

                  {/* Title & Client */}
                  <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-[#BA5316] transition-colors leading-snug">
                    {dossier.title}
                  </h3>

                  <div className="text-slate-500 font-semibold mb-3">
                    Client : <span className="text-slate-800">{dossier.clientName}</span>
                  </div>

                  {/* Typology & Priority */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                      {dossier.typology}
                    </span>

                    {hasBlockedRequest && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Passerelle bloquante
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Maker-Checker & Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Maker : <strong>{dossier.maker.name.split(' ')[0]}</strong>
                    </span>
                    <span className="text-slate-500">
                      Checker :{' '}
                      <strong>{dossier.checker ? dossier.checker.name.split(' ')[0] : '-'}</strong>
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
                      className="h-7 px-2 text-[11px] font-bold text-[#BA5316] hover:bg-[#F7C59F]/20"
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
