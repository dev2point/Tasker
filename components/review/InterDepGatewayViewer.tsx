'use client';

import React, { useState } from 'react';
import { InterDepRequest, Department, WorkflowActor } from '@/types/review';
import {
  ArrowRightLeft,
  Plus,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterDepGatewayViewerProps {
  requests: InterDepRequest[];
  dossierId: string;
  dossierRef: string;
  currentDepartment: Department;
  currentUser: WorkflowActor;
  onAddRequest: (req: Omit<InterDepRequest, 'id' | 'requestedAt'>) => void;
  onUpdateRequestStatus: (
    reqId: string,
    status: InterDepRequest['status'],
    resolutionNotes?: string
  ) => void;
}

export const InterDepGatewayViewer: React.FC<InterDepGatewayViewerProps> = ({
  requests,
  dossierId,
  dossierRef,
  currentDepartment,
  currentUser,
  onAddRequest,
  onUpdateRequestStatus,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [toDepartment, setToDepartment] = useState<Department>(
    currentDepartment === 'Comptabilité'
      ? 'Juridique'
      : currentDepartment === 'Juridique'
        ? 'Fiscalité'
        : 'Comptabilité'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<InterDepRequest['priority']>('urgent');
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddRequest({
      dossierId,
      dossierRef,
      fromDepartment: currentDepartment,
      toDepartment,
      requesterName: currentUser.name,
      title: title.trim(),
      description: description.trim(),
      status: 'pending',
      priority,
      dueDate,
    });

    setTitle('');
    setDescription('');
    setIsCreating(false);
  };

  const getDeptColor = (dept: Department) => {
    switch (dept) {
      case 'Fiscalité':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Comptabilité':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Juridique':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-950/80 border border-emerald-500/30 text-white rounded-xl shadow-md">
        <div className="flex items-center gap-2.5">
          <ArrowRightLeft className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold">Passerelles Interdépartements &amp; Pièces Requises</h4>
            <p className="text-xs text-slate-300">
              Décloisonnez les échanges entre Fiscalité, Comptabilité et Juridique avec suivi des blocages.
            </p>
          </div>
        </div>

        {!isCreating && (
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="h-8 bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 text-slate-950 hover:opacity-95 font-bold text-xs gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Demander une Pièce / Avis
          </Button>
        )}
      </div>

      {/* New Request Creation Form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="p-4 bg-[#061A13] border-2 border-emerald-500/40 rounded-xl shadow-md flex flex-col gap-3"
        >
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-amber-400" />
              Nouvelle Passerelle Inter-Pôle pour le dossier {dossierRef}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="h-6 px-2 text-xs text-slate-400 hover:text-white"
            >
              Annuler
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Pôle Émetteur</label>
              <div className="p-2 rounded-lg bg-emerald-950/60 font-bold text-emerald-300 border border-emerald-500/30">
                {currentDepartment}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Pôle Destinataire</label>
              <select
                value={toDepartment}
                onChange={(e) => setToDepartment(e.target.value as Department)}
                className="w-full p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/80 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {(['Comptabilité', 'Fiscalité', 'Juridique'] as Department[])
                  .filter((d) => d !== currentDepartment)
                  .map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-white">
                      {d}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Niveau d&apos;Urgence</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as InterDepRequest['priority'])}
                className="w-full p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/80 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="normal" className="bg-slate-900 text-white">Normal</option>
                <option value="urgent" className="bg-slate-900 text-white">Urgent</option>
                <option value="bloquant" className="bg-slate-900 text-white">⛔ Bloquant (Empêche la validation)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1 text-xs">
              Objet de la demande (Pièce, avis ou arbitrage)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: PV d’AG extraordinaire ou grand livre des comptes 641 certifié..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/30 bg-emerald-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Description &amp; Contexte
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Précisez pourquoi cette pièce est requise pour le livrable client..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/30 bg-emerald-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Échéance requise</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-500/30 bg-emerald-950/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-emerald-500/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="text-xs border-emerald-500/30 bg-emerald-950/40 text-slate-300"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Transmettre la demande
            </Button>
          </div>
        </form>
      )}

      {/* Requests List */}
      <div className="flex flex-col gap-2.5">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-emerald-950/40 rounded-xl border border-dashed border-emerald-500/30 text-xs">
            Aucune demande interdépartement sur ce dossier. Tout est fluide entre les pôles !
          </div>
        ) : (
          requests.map((req) => {
            const isBlocked = req.status === 'blocked' || req.priority === 'bloquant';
            const isProvided = req.status === 'provided';

            return (
              <div
                key={req.id}
                className={`p-4 rounded-xl border transition-all ${
                  isBlocked
                    ? 'bg-rose-500/15 border-rose-500/30 shadow-md'
                    : isProvided
                      ? 'bg-emerald-500/15 border-emerald-500/30'
                      : 'bg-emerald-950/60 border-emerald-500/30 hover:border-emerald-500/50 shadow-md'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDeptColor(req.fromDepartment)}`}
                    >
                      {req.fromDepartment}
                    </span>
                    <span className="text-slate-500 text-xs">➔</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getDeptColor(req.toDepartment)}`}
                    >
                      {req.toDepartment}
                    </span>

                    {req.priority === 'bloquant' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                        <AlertOctagon className="w-3 h-3" />
                        BLOQUANT
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    {req.status === 'provided' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Pièce Fournie &amp; Validée
                      </span>
                    ) : req.status === 'blocked' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        Blocage Déclaré
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        En Attente
                      </span>
                    )}
                  </div>
                </div>

                <h5 className="text-sm font-bold text-white mb-1">{req.title}</h5>
                <p className="text-xs text-slate-300 mb-2 leading-relaxed">{req.description}</p>

                {req.blockerReason && (
                  <div className="p-2 mb-2 bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs text-rose-200 font-medium flex items-start gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-300">Motif du blocage :</strong> {req.blockerReason}
                    </div>
                  </div>
                )}

                {req.resolutionNotes && (
                  <div className="p-2 mb-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-200 font-medium flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-300">Réponse apportée :</strong> {req.resolutionNotes}
                      {req.attachedDocName && (
                        <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-emerald-300">
                          <FileText className="w-3.5 h-3.5" />
                          {req.attachedDocName}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer and action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20 text-[11px] text-slate-400">
                  <span>
                    Demandé par <strong className="text-slate-200">{req.requesterName}</strong> • Échéance :{' '}
                    <strong className="text-slate-200">{new Date(req.dueDate).toLocaleDateString('fr-FR')}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {req.status !== 'provided' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateRequestStatus(
                              req.id,
                              'provided',
                              `Pièce certifiée et transmise par ${currentUser.name} (${currentUser.department}).`
                            )
                          }
                          className="h-7 text-[11px] border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                          Marquer Fournie
                        </Button>
                        {req.status !== 'blocked' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onUpdateRequestStatus(
                                req.id,
                                'blocked',
                                `Blocage signalé : attente de confirmation client/tiers.`
                              )
                            }
                            className="h-7 text-[11px] border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-semibold cursor-pointer"
                          >
                            <AlertOctagon className="w-3 h-3 mr-1 text-rose-400" />
                            Déclarer Bloqué
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
