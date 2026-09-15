'use client';

import React, { useState, useEffect } from 'react';
import {
  ReviewDossier,
  ReviewStatus,
  WorkflowActor,
  Department,
  InterDepRequest,
  DataFieldDiff,
} from '@/types/review';
import {
  executeWorkflowTransition,
  togglePreventiveLock,
} from '@/lib/review-service';
import { TextDiffViewer } from './TextDiffViewer';
import { DataDiffViewer } from './DataDiffViewer';
import { AuditTrailViewer } from './AuditTrailViewer';
import { InterDepGatewayViewer } from './InterDepGatewayViewer';
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
  Users,
  Send,
  RotateCcw,
  Archive,
  Eye,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { soundManager } from '@/lib/sound';

interface DossierReviewStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: ReviewDossier | null;
  currentUser: WorkflowActor;
  onUpdateDossier: (updated: ReviewDossier) => void;
  activeViewers?: Array<{ userName: string; department: Department; status: string }>;
}

const WORKFLOW_STEPS: Array<{ id: ReviewStatus; label: string; stage: string }> = [
  { id: 'brouillon', label: 'Brouillon', stage: 'Collaborateur' },
  { id: 'soumis', label: 'Soumis pour Revue', stage: 'N+1' },
  { id: 'en_revision', label: 'En Révision', stage: 'Superviseur' },
  { id: 'amendements', label: 'Amendements', stage: 'Revue' },
  { id: 'valide', label: 'Validé & Verrouillé', stage: 'Approuvé' },
  { id: 'archive', label: 'Archivé', stage: 'Clôturé' },
];

export const DossierReviewStudioModal: React.FC<DossierReviewStudioModalProps> = ({
  isOpen,
  onClose,
  dossier,
  currentUser,
  onUpdateDossier,
  activeViewers = [],
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'data' | 'audit' | 'gateway'>('diff');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [prevDossierId, setPrevDossierId] = useState<string | undefined>(dossier?.id);
  const [draftContent, setDraftContent] = useState<string>(() => dossier?.textDocument.currentContent || '');
  const [amendmentNote, setAmendmentNote] = useState('');
  const [isCorrectionsModalOpen, setIsCorrectionsModalOpen] = useState(false);
  const [correctionsInput, setCorrectionsInput] = useState('');

  if (dossier && dossier.id !== prevDossierId) {
    setPrevDossierId(dossier.id);
    setDraftContent(dossier.textDocument.currentContent);
    setIsEditingContent(false);
    setAmendmentNote('');
    setCorrectionsInput('');
  }

  if (!isOpen || !dossier) return null;

  const isLockedByOther =
    dossier.lock.isLocked &&
    dossier.lock.lockedBy &&
    dossier.lock.lockedBy.id !== currentUser.id;

  const isSupervisorOrAdmin =
    currentUser.role === 'manager' ||
    currentUser.role === 'associe' ||
    currentUser.role === 'admin';

  // State transitions handlers
  const handleTransition = (
    nextStatus: ReviewStatus,
    options?: {
      correctionNotes?: string;
      amendmentNotes?: string;
      updatedCurrentContent?: string;
    }
  ) => {
    soundManager.playClickSound();
    const res = executeWorkflowTransition(dossier, nextStatus, currentUser, {
      ...options,
      ipAddress: '192.168.1.42',
    });

    if (res.success) {
      onUpdateDossier(res.dossier);
    } else {
      alert(res.error || 'Erreur de transition de workflow');
    }
  };

  const handleToggleLock = () => {
    soundManager.playClickSound();
    const newLockState = !dossier.lock.isLocked;
    const updated = togglePreventiveLock(
      dossier,
      currentUser,
      newLockState,
      newLockState ? 'Révision active par le superviseur' : undefined
    );
    onUpdateDossier(updated);
  };

  const handleSaveDraftAmendments = () => {
    soundManager.playClickSound();
    handleTransition('amendements', {
      amendmentNotes: amendmentNote.trim() || 'Modifications directes du superviseur',
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
          ipAddress: '192.168.1.42',
          action: 'requete_inter_pole',
          details: `Passerelle inter-pôle émise vers le ${newReq.toDepartment} : "${newReq.title}".`,
        },
        ...dossier.auditTrail,
      ],
    };
    onUpdateDossier(updated);
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
          ipAddress: '192.168.1.42',
          action: 'requete_inter_pole',
          details: `Statut de la passerelle #${reqId} mis à jour vers "${status}".`,
        },
        ...dossier.auditTrail,
      ],
    };
    onUpdateDossier(updated);
  };

  // Get current active step index in workflow
  const currentStepIndex =
    dossier.status === 'demande_corrections'
      ? 0
      : WORKFLOW_STEPS.findIndex((s) => s.id === dossier.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-50 rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* 1. Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md">
              {dossier.ref}
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                dossier.department === 'Fiscalité'
                  ? 'bg-amber-100 text-amber-900'
                  : dossier.department === 'Comptabilité'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-blue-100 text-blue-900'
              }`}
            >
              {dossier.department}
            </span>

            <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
              {dossier.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Presence indicator on this dossier */}
            {activeViewers.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">{activeViewers[0].userName}</span>
                <span className="text-emerald-600">consulte en direct</span>
              </div>
            )}

            {/* Preventive Lock Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              disabled={Boolean(isLockedByOther && !isSupervisorOrAdmin)}
              title={
                dossier.lock.isLocked
                  ? `Verrouillé par ${dossier.lock.lockedBy?.name || 'Superviseur'}`
                  : 'Verrouiller pour empêcher les modifications concurrentes'
              }
              className={`h-8 px-2.5 text-xs font-bold gap-1.5 ${
                dossier.lock.isLocked
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {dossier.lock.isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Verrouillé ({dossier.lock.lockedBy?.name.split(' ')[0]})</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Verrouiller</span>
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Preventive Lock Alert if locked */}
        {dossier.lock.isLocked && (
          <div className="px-6 py-2 bg-amber-500/15 border-b border-amber-300 text-amber-950 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Verrouillage Préventif Actif :</strong> Ce dossier est actuellement sous revue par{' '}
                <strong>{dossier.lock.lockedBy?.name}</strong> ({dossier.lock.lockedBy?.department}). L&apos;édition collaborative est sécurisée.
              </span>
            </div>
            {dossier.lock.reason && (
              <span className="italic text-amber-900 font-medium">« {dossier.lock.reason} »</span>
            )}
          </div>
        )}

        {/* 3. Corrections Alert Banner if state is demande_corrections */}
        {dossier.status === 'demande_corrections' && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-300 text-rose-950 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900">
                Demande de corrections formulée par le superviseur :
              </span>
              <p className="mt-0.5 font-medium leading-relaxed">
                {dossier.correctionNotes || 'Veuillez réviser les éléments surlignés avant nouvelle soumission.'}
              </p>
            </div>
          </div>
        )}

        {/* 4. Workflow Stepper Bar (State Machine Representation) */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[620px] gap-2">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isPast = currentStepIndex > idx;
              const isCurrent =
                dossier.status === step.id ||
                (dossier.status === 'demande_corrections' && step.id === 'brouillon');
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black shrink-0 transition-colors ${
                        isCurrent
                          ? 'bg-[#EE8D4B] text-[#422006] ring-4 ring-[#F7C59F]/60'
                          : isPast
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-bold leading-tight ${
                          isCurrent
                            ? 'text-slate-900'
                            : isPast
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{step.stage}</span>
                    </div>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        isPast ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 bg-slate-50 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all ${
              activeTab === 'diff'
                ? 'bg-white text-[#933F15] border-slate-200 shadow-2xs -mb-px'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#BA5316]" />
            Diff &amp; Modifications Textuelles
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all ${
              activeTab === 'data'
                ? 'bg-white text-[#933F15] border-slate-200 shadow-2xs -mb-px'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Données &amp; Ratios ({dossier.dataFields.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all ${
              activeTab === 'gateway'
                ? 'bg-white text-[#933F15] border-slate-200 shadow-2xs -mb-px'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#BA5316]" />
            Passerelles Inter-Pôles ({dossier.interDepRequests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-[#933F15] border-slate-200 shadow-2xs -mb-px'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Journal d&apos;Audit Immuable ({dossier.auditTrail.length})
          </button>
        </div>

        {/* 6. Active Tab Content Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/50">
          {activeTab === 'diff' && (
            <div className="flex flex-col gap-4">
              {/* If supervisor wants to amend text directly */}
              {isSupervisorOrAdmin && dossier.status === 'en_revision' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-[#BA5316]" />
                      Édition directe des amendements par le Superviseur
                    </span>
                    {!isEditingContent ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsEditingContent(true)}
                        className="h-7 text-xs font-bold bg-slate-900 text-white"
                      >
                        Activer le mode modification
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
                          className="h-7 text-xs"
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveDraftAmendments}
                          className="h-7 text-xs font-bold bg-[#BA5316] text-white hover:bg-[#933F15]"
                        >
                          Consigner les amendements
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditingContent && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        rows={8}
                        className="w-full p-3 font-sans text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE8D4B] leading-relaxed"
                        placeholder="Rédigez vos amendements directement dans ce texte..."
                      />
                      <input
                        type="text"
                        value={amendmentNote}
                        onChange={(e) => setAmendmentNote(e.target.value)}
                        placeholder="Consignes d'amendement (ex: Rectification de la clause 4.2)..."
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE8D4B]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Text Diff Viewer Component */}
              <TextDiffViewer
                previousText={dossier.textDocument.previousContent}
                currentText={dossier.textDocument.currentContent}
                title={dossier.textDocument.title}
                lastAmendedBy={dossier.textDocument.lastAmendedBy}
                lastAmendedAt={dossier.textDocument.lastAmendedAt}
                amendmentNotes={dossier.textDocument.amendmentNotes}
              />
            </div>
          )}

          {activeTab === 'data' && <DataDiffViewer dataFields={dossier.dataFields} />}

          {activeTab === 'gateway' && (
            <InterDepGatewayViewer
              requests={dossier.interDepRequests}
              dossierId={dossier.id}
              dossierRef={dossier.ref}
              currentDepartment={dossier.department}
              currentUser={currentUser}
              onAddRequest={handleAddInterDepRequest}
              onUpdateRequestStatus={handleUpdateInterDepStatus}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrailViewer auditTrail={dossier.auditTrail} dossierRef={dossier.ref} />
          )}
        </div>

        {/* 7. Action Bar (Maker-Checker Decisions & Workflow Progression) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div>
              Collaborateur (Maker) : <strong>{dossier.maker.name}</strong>
            </div>
            <span>•</span>
            <div>
              Superviseur (Checker) :{' '}
              <strong>{dossier.checker?.name || 'Attribution en cours'}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Transition: Brouillon -> Soumis */}
            {(dossier.status === 'brouillon' || dossier.status === 'demande_corrections') && (
              <Button
                type="button"
                onClick={() => handleTransition('soumis')}
                className="bg-[#EE8D4B] hover:bg-[#BA5316] text-[#422006] hover:text-white font-black text-xs gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Soumettre au Superviseur N+1
              </Button>
            )}

            {/* Transition: Soumis -> En Révision */}
            {dossier.status === 'soumis' && (
              <Button
                type="button"
                onClick={() => handleTransition('en_revision')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                Prendre en charge la Révision (Manager)
              </Button>
            )}

            {/* Actions while En Révision or Amendements */}
            {(dossier.status === 'en_revision' || dossier.status === 'amendements') && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCorrectionsModalOpen(true)}
                  className="border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  Demander des Corrections (Rejet annoté)
                </Button>

                <Button
                  type="button"
                  onClick={() => handleTransition('valide')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valider &amp; Verrouiller (Conforme Zéro Défaut)
                </Button>
              </>
            )}

            {/* Transition: Valide -> Archive */}
            {dossier.status === 'valide' && (
              <Button
                type="button"
                onClick={() => handleTransition('archive')}
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs gap-1.5 shadow-xs"
              >
                <Archive className="w-3.5 h-3.5" />
                Archiver &amp; Clôturer le Livrable
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Rejet avec Consignes Dialog Modal */}
      {isCorrectionsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Demande de Corrections au Collaborateur
            </h4>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Précisez au collaborateur les points à amender, les calculs à rectifier ou les pièces manquantes.
              Le dossier sera repassé au collaborateur avec historique d&apos;audit.
            </p>

            <textarea
              value={correctionsInput}
              onChange={(e) => setCorrectionsInput(e.target.value)}
              rows={4}
              placeholder="Ex : Réajuster l'assiette CIR sur le projet BioGen, abaisser le seuil de minimis GAP à 15 000 €..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
              required
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCorrectionsModalOpen(false)}
                className="text-xs"
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
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Transmettre les consignes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
