'use client';

import React, { useState } from 'react';
import {
  ReviewDossier,
  ReviewStatus,
  WorkflowActor,
  Department,
  InterDepRequest,
} from '@/types/review';
import { User } from '@/types/user';
import {
  canUserStartReview,
  executeWorkflowTransition,
  togglePreventiveLock,
  resolveDepartmentSupervisor,
} from '@/lib/review-service';
import { formatBytes } from '@/lib/file-version-service';
import { TextDiffViewer } from './TextDiffViewer';
import { DataDiffViewer } from './DataDiffViewer';
import { AuditTrailViewer } from './AuditTrailViewer';
import { InterDepGatewayViewer } from './InterDepGatewayViewer';
import { FileVersionManager } from '@/components/FileVersionManager';
import { TrackedFile } from '@/types/file-version';
import {
  X,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  TrendingUp,
  History,
  ArrowRightLeft,
  Send,
  Archive,
  Eye,
  Edit3,
  ShieldAlert,
  RefreshCw,
  GitCompare,
  Trash2,
  Search,
  Check,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { soundManager } from '@/lib/sound';

interface DossierReviewStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: ReviewDossier | null;
  currentUser: WorkflowActor;
  onUpdateDossier: (
    updated: ReviewDossier,
    options?: { force?: boolean }
  ) => Promise<{
    success: boolean;
    conflict?: boolean;
    serverDossier?: ReviewDossier;
    serverVersion?: number;
    clientVersion?: number;
    dossier?: ReviewDossier;
    message?: string;
  }> | void;
  onDeleteDossier?: (
    dossierId: string
  ) => Promise<{ success: boolean; message?: string }> | void;
  canDelete?: boolean;
  teamUsers?: User[];
  activeViewers?: Array<{ userName: string; department: Department; status: string }>;
  isSidebarCollapsed?: boolean;
}

const REVIEW_PHASES: Array<{ number: number; label: string; statuses: ReviewStatus[] }> = [
  { number: 1, label: 'Dépôt', statuses: ['brouillon', 'demande_corrections'] },
  { number: 2, label: 'Envoi', statuses: ['soumis'] },
  { number: 3, label: 'Revue', statuses: ['en_revision', 'amendements'] },
  { number: 4, label: 'Validation', statuses: ['valide'] },
  { number: 5, label: 'Clôture', statuses: ['archive'] },
];

const phaseLabelFor = (status: ReviewStatus): string =>
  REVIEW_PHASES.find((phase) => phase.statuses.includes(status))?.label || status;

export const DossierReviewStudioModal: React.FC<DossierReviewStudioModalProps> = ({
  isOpen,
  dossier,
  ...props
}) => {
  if (!isOpen || !dossier) return null;
  return <DossierReviewStudioModalInner key={dossier.id} dossier={dossier} {...props} />;
};

interface DossierReviewStudioModalInnerProps extends Omit<DossierReviewStudioModalProps, 'isOpen' | 'dossier'> {
  dossier: ReviewDossier;
}

const DossierReviewStudioModalInner: React.FC<DossierReviewStudioModalInnerProps> = ({
  onClose,
  dossier,
  currentUser,
  onUpdateDossier,
  onDeleteDossier,
  canDelete = false,
  teamUsers = [],
  activeViewers = [],
  isSidebarCollapsed = false,
}) => {
  const [activeTab, setActiveTab] = useState<'revision' | 'files' | 'data' | 'requests' | 'history'>('revision');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [draftContent, setDraftContent] = useState<string>(() => dossier.textDocument.currentContent || '');
  const [amendmentNote, setAmendmentNote] = useState('');
  const [isCorrectionsModalOpen, setIsCorrectionsModalOpen] = useState(false);
  const [correctionsInput, setCorrectionsInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(dossier.checker?.id || '');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');

  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    serverDossier: ReviewDossier;
    serverVersion: number;
    clientVersion: number;
    message: string;
    pendingUpdate: ReviewDossier;
  } | null>(null);
  const [showConflictDiff, setShowConflictDiff] = useState(false);

  const isLockedByOther =
    dossier.lock.isLocked &&
    dossier.lock.lockedBy &&
    dossier.lock.lockedBy.id !== currentUser.id;

  const isSupervisorOrAdmin =
    currentUser.role === 'manager' ||
    currentUser.role === 'associe' ||
    currentUser.role === 'admin';

  const currentPhase =
    REVIEW_PHASES.find((phase) => phase.statuses.includes(dossier.status)) || REVIEW_PHASES[0];
  const progressPercent = (currentPhase.number / REVIEW_PHASES.length) * 100;

  const applyDossierUpdate = async (
    candidate: ReviewDossier,
    options?: { force?: boolean }
  ): Promise<boolean> => {
    try {
      const res = await onUpdateDossier(candidate, options);
      if (res && res.conflict && res.serverDossier) {
        soundManager.playReminderChime();
        setIsDeleteConfirmOpen(false);
        setConflictState({
          isOpen: true,
          serverDossier: res.serverDossier,
          serverVersion: res.serverVersion || res.serverDossier.version || 1,
          clientVersion: res.clientVersion || candidate.version || 1,
          message:
            res.message ||
            'Le dossier a été modifié par un autre intervenant pendant votre travail.',
          pendingUpdate: candidate,
        });
        return false;
      }
      return true;
    } catch (e: any) {
      console.warn('Erreur mise à jour dossier:', e);
      return false;
    }
  };

  const handleAcceptServerVersion = () => {
    if (!conflictState) return;
    soundManager.playClickSound();
    setDraftContent(conflictState.serverDossier.textDocument.currentContent);
    setIsEditingContent(false);
    onUpdateDossier(conflictState.serverDossier);
    setConflictState(null);
    setShowConflictDiff(false);
  };

  const handleForceApplyChanges = async () => {
    if (!conflictState) return;
    soundManager.playClickSound();
    const success = await applyDossierUpdate(conflictState.pendingUpdate, { force: true });
    if (success) {
      setConflictState(null);
      setShowConflictDiff(false);
    }
  };

  const handleTransition = (
    nextStatus: ReviewStatus,
    options?: {
      correctionNotes?: string;
      amendmentNotes?: string;
      submissionNote?: string;
      targetChecker?: WorkflowActor;
      updatedCurrentContent?: string;
    }
  ) => {
    soundManager.playClickSound();
    const res = executeWorkflowTransition(dossier, nextStatus, currentUser, {
      ...options,
      ipAddress: 'server-pending',
    });

    if (res.success) {
      setActionError(null);
      applyDossierUpdate(res.dossier);
    } else {
      setActionError(res.error || 'Erreur de transition de workflow');
    }
  };

  const availableRecipients = React.useMemo(() => {
    const baseList =
      teamUsers.length > 0
        ? teamUsers
        : [
            {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role === 'admin' ? 'admin' : 'member',
              department: currentUser.department,
            } as User,
          ];

    const sorted = [...baseList].sort((a, b) => {
      if (a.id === currentUser.id && b.id !== currentUser.id) return 1;
      if (b.id === currentUser.id && a.id !== currentUser.id) return -1;
      return (a.name || '').localeCompare(b.name || '');
    });

    const query = recipientSearch.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.department || '').toLowerCase().includes(query)
    );
  }, [teamUsers, currentUser, recipientSearch]);

  const selectedRecipient = availableRecipients.find((u) => u.id === selectedRecipientId) ||
    teamUsers.find((u) => u.id === selectedRecipientId) ||
    null;

  const handleOpenSubmitModal = () => {
    soundManager.playClickSound();
    const autoSupervisor = resolveDepartmentSupervisor(
      teamUsers,
      dossier.department,
      currentUser.id
    );
    const defaultTarget =
      dossier.checker?.id ||
      autoSupervisor?.id ||
      availableRecipients.find((u) => u.id !== currentUser.id)?.id ||
      availableRecipients[0]?.id ||
      '';
    setSelectedRecipientId(defaultTarget);
    setRecipientSearch('');
    setSubmissionNote('');
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmitToUser = () => {
    if (!selectedRecipient) return;
    const mappedRole: WorkflowActor['role'] =
      selectedRecipient.role === 'admin'
        ? 'admin'
        : selectedRecipient.role === 'manager'
          ? 'manager'
          : 'collaborateur';
    const targetChecker: WorkflowActor = {
      id: selectedRecipient.id,
      name: selectedRecipient.name,
      email: selectedRecipient.email,
      department: (selectedRecipient.department as Department) || dossier.department,
      role: mappedRole,
      avatarUrl: selectedRecipient.avatarUrl,
    };

    handleTransition('soumis', {
      targetChecker,
      submissionNote: submissionNote.trim() || undefined,
    });
    setIsSubmitModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteDossier || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      const result = await onDeleteDossier(dossier.id);
      if (result && result.success === false) {
        setActionError(result.message || 'Impossible de supprimer ce dossier.');
        setIsDeleteConfirmOpen(false);
      } else {
        setIsDeleteConfirmOpen(false);
        onClose();
      }
    } catch {
      setActionError('Erreur lors de la suppression du dossier.');
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLock = () => {
    soundManager.playClickSound();
    const newLockState = !dossier.lock.isLocked;
    const updated = togglePreventiveLock(
      dossier,
      currentUser,
      newLockState,
      newLockState ? 'En cours de révision' : undefined
    );
    applyDossierUpdate(updated);
  };

  const handleSaveDraftAmendments = () => {
    soundManager.playClickSound();
    handleTransition('amendements', {
      amendmentNotes: amendmentNote.trim() || 'Modifications directes du texte',
      updatedCurrentContent: draftContent,
    });
    setIsEditingContent(false);
  };

  const handleAddInterDepRequest = (reqData: any) => {
    soundManager.playClickSound();
    const newReq: InterDepRequest = {
      id: `idr-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      ...reqData,
    };
    const updated: ReviewDossier = {
      ...dossier,
      interDepRequests: [newReq, ...dossier.interDepRequests],
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorDepartment: currentUser.department,
          actorRole: currentUser.role,
          ipAddress: 'server-pending',
          action: 'requete_inter_pole',
          details: `Demande envoyée au ${newReq.toDepartment} : "${newReq.title}".`,
        },
        ...dossier.auditTrail,
      ],
    };
    applyDossierUpdate(updated);
  };

  const handleUpdateInterDepStatus = (
    reqId: string,
    status: InterDepRequest['status'],
    notes?: string
  ) => {
    soundManager.playClickSound();
    const updatedRequests = dossier.interDepRequests.map((r) =>
      r.id === reqId
        ? {
            ...r,
            status,
            resolutionNotes: notes,
            resolvedAt: status === 'provided' ? new Date().toISOString() : undefined,
          }
        : r
    );

    const updated: ReviewDossier = {
      ...dossier,
      interDepRequests: updatedRequests,
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorDepartment: currentUser.department,
          actorRole: currentUser.role,
          ipAddress: 'server-pending',
          action: 'requete_inter_pole',
          details: `Statut de la demande #${reqId} mis à jour vers "${status}".`,
        },
        ...dossier.auditTrail,
      ],
    };
    applyDossierUpdate(updated);
  };

  const handleUpdateTrackedFiles = (updatedFiles: TrackedFile[]) => {
    const updated: ReviewDossier = {
      ...dossier,
      trackedFiles: updatedFiles,
      updatedAt: new Date().toISOString(),
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorDepartment: currentUser.department,
          actorRole: currentUser.role,
          ipAddress: 'server-pending',
          action: 'amendement_texte',
          details: `Mise à jour des fichiers suivis et documents de travail (${updatedFiles.length} document(s)).`,
        },
        ...dossier.auditTrail,
      ],
    };
    applyDossierUpdate(updated);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-6xl bg-white dark:bg-[#0B2438] rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 flex flex-col max-h-[92vh] overflow-hidden my-auto text-[#0B1F30] dark:text-slate-100">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#004266] border-b border-[#00314D] text-white shrink-0">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <span className="font-mono text-xs font-bold bg-white/10 border border-white/20 text-white px-2.5 py-1 rounded-md tabular-nums">
                {dossier.ref}
              </span>

              <span
                title={`Version actuelle du dossier : v${dossier.version || 1}`}
                className="font-mono text-[11px] font-bold bg-white/10 border border-white/20 text-[#7CC4EB] px-2 py-0.5 rounded-md flex items-center gap-1 tabular-nums"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#7CC4EB]" />
                v{dossier.version || 1}
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                  dossier.department === 'Fiscalité'
                    ? 'bg-[#F77F00]/20 text-[#FFB35C] border-[#F77F00]/40'
                    : dossier.department === 'Comptabilité'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                      : 'bg-sky-500/20 text-sky-200 border-sky-400/30'
                }`}
              >
                {dossier.department}
              </span>

              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {dossier.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {activeViewers.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#E2ECF4] text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#3895C9]" />
                  <span className="font-bold text-white">{activeViewers[0].userName}</span>
                  <span>consulte en direct</span>
                </div>
              )}

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={isActionsMenuOpen}
                  aria-controls="dossier-studio-actions"
                  onClick={() => setIsActionsMenuOpen((open) => !open)}
                  className="h-8 px-2.5 text-xs font-bold gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3895C9]"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  Plus d&apos;actions
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
                </Button>

                {isActionsMenuOpen && (
                  <div
                    id="dossier-studio-actions"
                    className="absolute right-0 top-full mt-1 z-30 w-56 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] p-1.5 shadow-2xl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleLock();
                        setIsActionsMenuOpen(false);
                      }}
                      disabled={Boolean(isLockedByOther && !isSupervisorOrAdmin)}
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-[#0B1F30] dark:text-slate-200 hover:bg-[#EDF2F7] dark:hover:bg-[#103049] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004266] disabled:opacity-50 cursor-pointer"
                    >
                      {dossier.lock.isLocked ? (
                        <Unlock className="w-4 h-4 text-[#F77F00]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#486075] dark:text-slate-400" />
                      )}
                      {dossier.lock.isLocked ? 'Déverrouiller' : 'Verrouiller'}
                    </button>

                    {canDelete && onDeleteDossier && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClickSound();
                          setIsActionsMenuOpen(false);
                          setConflictState(null);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer le dossier
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer la revue"
                className="p-1.5 text-white/75 hover:text-white hover:bg-white/10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3895C9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lock banner */}
          {dossier.lock.isLocked && (
            <div className="px-4 sm:px-6 py-2 bg-[#FFF4E6] dark:bg-[#F77F00]/15 border-b border-[#F77F00]/30 text-[#B85A00] dark:text-[#FFB35C] text-xs flex items-start gap-2 shrink-0">
              <Lock className="w-4 h-4 text-[#F77F00] shrink-0 mt-0.5" />
              <span>
                En cours de révision par{' '}
                <strong className="text-[#0B1F30] dark:text-white">
                  {dossier.lock.lockedBy?.name || 'un intervenant'}
                </strong>
                {dossier.lock.reason ? ` · ${dossier.lock.reason}` : ''}
              </span>
            </div>
          )}

          {/* Corrections banner */}
          {dossier.status === 'demande_corrections' && (
            <div className="px-4 sm:px-6 py-3 bg-rose-50 dark:bg-rose-500/15 border-b border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5 shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900 dark:text-rose-300">Corrections demandées</span>
                <p className="mt-0.5 font-medium leading-relaxed">
                  {dossier.correctionNotes ||
                    'Veuillez réviser les éléments signalés avant une nouvelle soumission.'}
                </p>
              </div>
            </div>
          )}

          {/* 5-phase progress */}
          <div className="px-4 sm:px-6 py-3 bg-[#F4F7FA] dark:bg-[#061826] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-[#004266] dark:text-[#7CC4EB] tabular-nums">
                Étape {currentPhase.number} sur {REVIEW_PHASES.length} · {currentPhase.label}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 w-full rounded-full bg-[#D8E2EC] dark:bg-[#103049]"
              role="progressbar"
              aria-valuenow={currentPhase.number}
              aria-valuemin={0}
              aria-valuemax={REVIEW_PHASES.length}
              aria-label={`Progression : étape ${currentPhase.number} sur ${REVIEW_PHASES.length}`}
            >
              <div className="h-1.5 rounded-full bg-[#004266] dark:bg-[#3895C9] transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Primary Top-Level Studio Tabs (DT-ARCH-19: Files always visible at top level) */}
          <div
            role="tablist"
            aria-label="Sections du dossier"
            className="px-4 sm:px-6 bg-white dark:bg-[#0B2438] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center gap-1 overflow-x-auto shrink-0"
          >
            {[
              { id: 'revision' as const, label: 'Révision', count: undefined, icon: GitCompare },
              {
                id: 'files' as const,
                label: 'Fichiers',
                count: dossier.trackedFiles?.length || 0,
                icon: FileText,
              },
              {
                id: 'data' as const,
                label: 'Chiffres',
                count: dossier.dataFields?.length || 0,
                icon: TrendingUp,
              },
              {
                id: 'requests' as const,
                label: 'Demandes',
                count: dossier.interDepRequests?.length || 0,
                icon: ArrowRightLeft,
              },
              {
                id: 'history' as const,
                label: 'Historique',
                count: dossier.auditTrail?.length || 0,
                icon: History,
              },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'border-[#004266] dark:border-[#3895C9] text-[#004266] dark:text-[#7CC4EB] bg-[#EDF2F7]/70 dark:bg-[#103049]/60'
                      : 'border-transparent text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/40'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                        isSelected
                          ? 'bg-[#004266]/10 dark:bg-[#3895C9]/25 text-[#004266] dark:text-[#7CC4EB]'
                          : 'bg-[#EDF2F7] dark:bg-white/10 text-[#486075] dark:text-slate-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable middle */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#F4F7FA] dark:bg-[#061826]">
            {activeTab === 'revision' && (
              <div className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  {isSupervisorOrAdmin && dossier.status === 'en_revision' && (
                    <div className="p-4 bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-bold text-[#0B1F30] dark:text-white flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB]" />
                          Modifier le texte
                        </span>
                        {!isEditingContent ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsEditingContent(true)}
                            className="h-7 text-xs font-bold bg-[#004266] hover:bg-[#00314D] text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                          >
                            Modifier le texte
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDraftContent(dossier.textDocument.currentContent);
                                setIsEditingContent(false);
                              }}
                              className="h-7 text-xs border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-transparent text-[#486075] dark:text-slate-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              variant="accent"
                              size="sm"
                              onClick={handleSaveDraftAmendments}
                              className="h-7 text-xs font-bold bg-[#F77F00] hover:bg-[#DE7200] text-white cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F77F00]"
                            >
                              Enregistrer les modifications
                            </Button>
                          </div>
                        )}
                      </div>

                      {isEditingContent && (
                        <div className="flex flex-col gap-2">
                          <label htmlFor="draft-content" className="sr-only">
                            Texte du dossier
                          </label>
                          <textarea
                            id="draft-content"
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            rows={8}
                            className="w-full p-3 font-sans text-xs border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9] leading-relaxed"
                            placeholder="Rédigez vos modifications directement dans ce texte..."
                          />
                          <label htmlFor="amendment-note" className="sr-only">
                            Note sur les modifications
                          </label>
                          <input
                            id="amendment-note"
                            type="text"
                            value={amendmentNote}
                            onChange={(e) => setAmendmentNote(e.target.value)}
                            placeholder="Note sur les modifications (ex : Rectification de la clause 4.2)..."
                            className="w-full px-3 py-1.5 text-xs border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <TextDiffViewer
                    previousText={dossier.textDocument.previousContent}
                    currentText={dossier.textDocument.currentContent}
                    title={dossier.textDocument.title}
                    lastAmendedBy={dossier.textDocument.lastAmendedBy}
                    lastAmendedAt={dossier.textDocument.lastAmendedAt}
                    amendmentNotes={dossier.textDocument.amendmentNotes}
                  />
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="p-4 sm:p-6">
                <FileVersionManager
                  files={dossier.trackedFiles || []}
                  onChangeFiles={handleUpdateTrackedFiles}
                  currentUser={{
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                    department: currentUser.department,
                  }}
                  contextTitle={`Dossier ${dossier.ref} - ${dossier.title}`}
                  readOnly={dossier.status === 'archive' || (dossier.lock.isLocked && Boolean(isLockedByOther))}
                />
              </div>
            )}

            {activeTab === 'data' && (
              <div className="p-4 sm:p-6">
                <DataDiffViewer dataFields={dossier.dataFields} />
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="p-4 sm:p-6">
                <InterDepGatewayViewer
                  requests={dossier.interDepRequests}
                  dossierId={dossier.id}
                  dossierRef={dossier.ref}
                  currentDepartment={dossier.department}
                  currentUser={currentUser}
                  onAddRequest={handleAddInterDepRequest}
                  onUpdateRequestStatus={handleUpdateInterDepStatus}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-4 sm:p-6">
                <AuditTrailViewer auditTrail={dossier.auditTrail} dossierRef={dossier.ref} />
              </div>
            )}
          </div>

          {actionError && (
            <div className="px-4 sm:px-6 py-2.5 bg-rose-50 dark:bg-rose-500/20 border-t border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2 shrink-0">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-rose-600 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
                aria-label="Fermer le message d'erreur"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sticky footer */}
          <div className="shrink-0 bg-white dark:bg-[#0B2438] border-t border-[#D8E2EC] dark:border-[#94B8D6]/20">
            <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#486075] dark:text-[#9FB3C8]">
                Préparé par <strong className="text-[#0B1F30] dark:text-white">{dossier.maker.name}</strong>
                {dossier.checker?.name && (
                  <>
                    {' · En cours de révision par '}
                    <strong className="text-[#0B1F30] dark:text-white">{dossier.checker.name}</strong>
                  </>
                )}
              </div>

              <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
                {(dossier.status === 'brouillon' || dossier.status === 'demande_corrections') && (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => {
                      setIsCorrectionsModalOpen(false);
                      handleOpenSubmitModal();
                    }}
                    className="w-full sm:w-auto bg-[#F77F00] hover:bg-[#DE7200] text-white font-bold text-xs gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F77F00]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer en revue
                  </Button>
                )}

                {canUserStartReview(dossier, currentUser) && (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => handleTransition('en_revision')}
                    className="w-full sm:w-auto bg-[#F77F00] hover:bg-[#DE7200] text-white font-bold text-xs gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F77F00]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Commencer la revue
                  </Button>
                )}

                {(dossier.status === 'en_revision' || dossier.status === 'amendements') && (
                  <>
                    <Button
                      type="button"
                      variant="accent"
                      onClick={() => handleTransition('valide')}
                      className="w-full sm:w-auto bg-[#F77F00] hover:bg-[#DE7200] text-white font-bold text-xs gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F77F00]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valider le dossier
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitModalOpen(false);
                        setIsCorrectionsModalOpen(true);
                      }}
                      className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-200 underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
                    >
                      Demander des corrections
                    </button>
                  </>
                )}

                {dossier.status === 'valide' && (
                  <Button
                    type="button"
                    onClick={() => handleTransition('archive')}
                    className="w-full sm:w-auto bg-[#004266] hover:bg-[#00314D] text-white font-bold text-xs gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archiver le dossier
                  </Button>
                )}

                {dossier.status === 'archive' && (
                  <span className="text-xs font-semibold text-[#486075] dark:text-slate-300">Dossier clôturé</span>
                )}
              </div>
            </div>

            {/* Inline submit panel */}
            {isSubmitModalOpen && (
              <div className="px-4 sm:px-6 pb-4 pt-4 border-t border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826] max-h-[50vh] overflow-y-auto">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#F77F00]" />
                    Envoyer en revue
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    aria-label="Fermer le panneau d'envoi"
                    className="p-1 rounded text-[#64748B] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004266] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#486075] dark:text-slate-300 mb-3">
                  Choisissez la personne chargée de relire et valider le dossier{' '}
                  <span className="font-mono font-semibold text-[#004266] dark:text-[#7CC4EB]">{dossier.ref}</span>.
                </p>

                {/* Deliverable Version Manifest (DT-ARCH-19) */}
                <div className="mb-3 p-2.5 rounded-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#004266] dark:text-[#7CC4EB] mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Manifeste des livrables transmis ({dossier.trackedFiles?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSubmitModalOpen(false);
                        setActiveTab('files');
                      }}
                      className="text-[11px] underline text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
                    >
                      Gérer les fichiers
                    </button>
                  </div>
                  {(dossier.trackedFiles?.length || 0) === 0 ? (
                    <p className="text-[11px] text-[#B85A00] dark:text-[#FFB35C]">
                      Aucun fichier versionné joint à ce dossier.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-[11px] text-[#0B1F30] dark:text-slate-200">
                      {(dossier.trackedFiles || []).map((f) => {
                        const latest = f.versions[0];
                        return (
                          <li key={f.id} className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-[#004266] dark:text-[#7CC4EB]">
                              {f.name} ({f.currentVersion})
                            </span>
                            <span className="text-[#64748B] dark:text-slate-400 shrink-0 tabular-nums">
                              {latest ? formatBytes(latest.sizeBytes) : ''}
                              {latest?.checksum ? ` · ${latest.checksum.slice(0, 15)}…` : ''}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    aria-label="Rechercher un destinataire"
                    placeholder="Rechercher un utilisateur..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15 border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg bg-white dark:bg-[#0B2438] mb-3">
                  {availableRecipients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#64748B] dark:text-slate-400">
                      Aucun utilisateur trouvé.
                    </div>
                  ) : (
                    availableRecipients.map((u) => {
                      const isSelected = u.id === selectedRecipientId;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedRecipientId(u.id)}
                          className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004266] ${
                            isSelected
                              ? 'bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#0B1F30] dark:text-white'
                              : 'text-[#0B1F30] dark:text-slate-200 hover:bg-[#EDF2F7] dark:hover:bg-[#103049]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {u.name}
                              {u.id === currentUser.id && (
                                <span className="ml-1.5 text-[11px] font-normal text-[#64748B] dark:text-slate-400">
                                  (vous)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#486075] dark:text-slate-400 truncate">
                              {u.department || 'Équipe'} · {u.email}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB] shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="submission-note" className="block text-[11px] font-medium text-[#486075] dark:text-slate-300 mb-1">
                    Message pour le relecteur (optionnel)
                  </label>
                  <textarea
                    id="submission-note"
                    value={submissionNote}
                    onChange={(e) => setSubmissionNote(e.target.value)}
                    rows={2}
                    placeholder="Ex : Merci de vérifier les montants de TVA avant clôture..."
                    className="w-full p-2 text-xs border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="text-xs border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-transparent text-[#486075] dark:text-slate-300 hover:bg-[#EDF2F7] dark:hover:bg-white/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    disabled={!selectedRecipient}
                    onClick={handleConfirmSubmitToUser}
                    className="bg-[#F77F00] hover:bg-[#DE7200] text-white font-semibold text-xs gap-1.5 cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#F77F00]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {selectedRecipient
                      ? `Envoyer à ${selectedRecipient.name.split(' ')[0]}`
                      : 'Envoyer en revue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Inline corrections panel */}
            {isCorrectionsModalOpen && (
              <div className="px-4 sm:px-6 pb-4 pt-4 border-t border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826] max-h-[50vh] overflow-y-auto">
                <h4 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Demander des corrections
                </h4>
                <p className="text-xs text-[#486075] dark:text-slate-300 mb-3 leading-relaxed">
                  Précisez les points à revoir. Le dossier sera renvoyé à son auteur avec ces consignes.
                </p>

                <label htmlFor="corrections-input" className="sr-only">
                  Consignes de correction
                </label>
                <textarea
                  id="corrections-input"
                  value={correctionsInput}
                  onChange={(e) => setCorrectionsInput(e.target.value)}
                  rows={3}
                  placeholder="Ex : Réajuster l'assiette CIR sur le projet BioGen, abaisser le seuil de minimis GAP à 15 000 €..."
                  className="w-full p-2.5 text-xs border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />

                <div className="flex flex-wrap justify-end gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCorrectionsModalOpen(false)}
                    className="text-xs border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-transparent text-[#486075] dark:text-slate-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!correctionsInput.trim()) return;
                      handleTransition('demande_corrections', {
                        correctionNotes: correctionsInput.trim(),
                      });
                      setIsCorrectionsModalOpen(false);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    Transmettre les consignes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conflict dialog */}
        {conflictState?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <div className="w-full max-w-xl bg-white dark:bg-[#0B2438] rounded-2xl shadow-2xl p-5 sm:p-6 border border-[#F77F00]/45 text-[#0B1F30] dark:text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#FFF4E6] dark:bg-[#F77F00]/20 border border-[#F77F00]/35 text-[#F77F00] dark:text-[#FFB35C] shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-[#0B1F30] dark:text-white">
                    Ce dossier a changé pendant votre travail
                  </h4>
                  <p className="text-xs text-[#486075] dark:text-[#9FB3C8] mt-1 leading-relaxed">
                    Le dossier <span className="font-mono font-bold text-[#004266] dark:text-white">{dossier.ref}</span> a été modifié par un autre intervenant ou dans une autre session pendant vos travaux.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-2 text-xs">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[#64748B] dark:text-slate-400">Dernier enregistrement :</span>
                  <span className="font-semibold text-[#0B1F30] dark:text-white text-right tabular-nums">
                    {conflictState.serverDossier.auditTrail?.[0]?.actorName || 'Intervenant'} (v{conflictState.serverVersion})
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[#64748B] dark:text-slate-400">Heure de modification :</span>
                  <span className="font-mono text-[#004266] dark:text-[#7CC4EB] tabular-nums">
                    {new Date(conflictState.serverDossier.updatedAt).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[#64748B] dark:text-slate-400">Étape sur le serveur :</span>
                  <span className="font-bold text-[#B85A00] dark:text-[#FFB35C] text-right">
                    {phaseLabelFor(conflictState.serverDossier.status)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[#64748B] dark:text-slate-400">Votre action en attente :</span>
                  <span className="font-bold text-rose-700 dark:text-rose-300 text-right">
                    {conflictState.pendingUpdate.status !== conflictState.serverDossier.status
                      ? `Passage à l'étape ${phaseLabelFor(conflictState.pendingUpdate.status)}`
                      : 'Enregistrement de vos modifications'}
                  </span>
                </div>
              </div>

              {showConflictDiff && (
                <div className="p-3 bg-[#EDF2F7] dark:bg-[#061826] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 max-h-48 overflow-y-auto space-y-2 text-xs font-mono">
                  <p className="text-[11px] font-bold text-[#004266] dark:text-[#7CC4EB] uppercase tracking-wider font-sans">
                    Comparaison du texte :
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200">
                      <span className="block font-bold text-rose-700 dark:text-rose-300 mb-1 font-sans">
                        Version récente (v{conflictState.serverVersion}) :
                      </span>
                      <pre className="whitespace-pre-wrap">{conflictState.serverDossier.textDocument.currentContent.slice(0, 300) || '(vide)'}</pre>
                    </div>
                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200">
                      <span className="block font-bold text-emerald-700 dark:text-emerald-300 mb-1 font-sans">Vos modifications :</span>
                      <pre className="whitespace-pre-wrap">{conflictState.pendingUpdate.textDocument.currentContent.slice(0, 300) || '(vide)'}</pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConflictDiff(!showConflictDiff)}
                  className="text-xs text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                >
                  <GitCompare className="w-3.5 h-3.5 text-[#F77F00]" />
                  {showConflictDiff ? 'Masquer la comparaison' : 'Comparer les textes'}
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptServerVersion}
                    className="text-xs font-bold bg-[#EDF2F7] dark:bg-[#103049] border-[#004266]/30 dark:border-[#3895C9]/40 text-[#004266] dark:text-[#7CC4EB] hover:bg-[#D8E2EC] dark:hover:bg-[#153A57] gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Utiliser la version récente
                  </Button>

                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={handleForceApplyChanges}
                    className="text-xs font-bold bg-[#F77F00] hover:bg-[#DE7200] text-white gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#F77F00]"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Conserver mes modifications
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation dialog */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <div className="w-full max-w-md bg-white dark:bg-[#0B2438] rounded-xl shadow-2xl p-5 border border-rose-200 dark:border-rose-500/35 text-[#0B1F30] dark:text-slate-100">
              <h4 className="text-base font-bold text-[#0B1F30] dark:text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Supprimer ce dossier ?
              </h4>
              <p className="text-xs text-[#486075] dark:text-slate-300 mt-2 leading-relaxed">
                Le dossier <span className="font-mono font-semibold text-[#004266] dark:text-[#7CC4EB]">{dossier.ref}</span> («{' '}
                <strong className="text-[#0B1F30] dark:text-white">{dossier.title}</strong> ») sera définitivement supprimé. Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="text-xs border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-transparent text-[#486075] dark:text-slate-300 hover:bg-[#EDF2F7] dark:hover:bg-white/5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#004266]"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
