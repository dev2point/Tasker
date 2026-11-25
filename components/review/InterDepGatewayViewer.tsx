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
        return 'bg-[#004266]/10 text-[#004266] border-[#004266]/20 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30';
      case 'Comptabilité':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
      case 'Juridique':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30';
      case 'Recherche & Innovation':
        return 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/30 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35';
    }
  };

  return (
    <div className="flex flex-col gap-4 text-[#0B1F30] dark:text-slate-100">
      {/* Header Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#004266] border border-[#00314D] text-white rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <ArrowRightLeft className="w-5 h-5 text-[#FFB35C] shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-white">Passerelles Interdépartements &amp; Pièces Requises</h4>
            <p className="text-xs text-[#D8E8F4]">
              Décloisonnez les échanges entre Fiscalité, Comptabilité et Juridique avec suivi des blocages.
            </p>
          </div>
        </div>

        {!isCreating && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="h-8 bg-[#F77F00] hover:bg-[#DE7200] text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
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
          className="p-4 bg-white dark:bg-[#0B2438] border border-[#004266]/30 dark:border-[#3895C9]/40 rounded-xl shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 pb-2">
            <span className="text-xs font-bold text-[#0B1F30] dark:text-white flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#F77F00]" />
              Nouvelle Passerelle Inter-Pôle pour le dossier {dossierRef}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="h-6 px-2 text-xs text-[#64748B] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white"
            >
              Annuler
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-[#486075] dark:text-slate-300 block mb-1">Pôle Émetteur</label>
              <div className="p-2 rounded-lg bg-[#EDF2F7] dark:bg-[#103049] font-bold text-[#004266] dark:text-[#7CC4EB] border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                {currentDepartment}
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#486075] dark:text-slate-300 block mb-1">Pôle Destinataire</label>
              <select
                value={toDepartment}
                onChange={(e) => setToDepartment(e.target.value as Department)}
                className="w-full p-2 rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] font-semibold text-[#0B1F30] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
              >
                {(['Comptabilité', 'Fiscalité', 'Juridique', 'Recherche & Innovation'] as Department[])
                  .filter((d) => d !== currentDepartment)
                  .map((d) => (
                    <option key={d} value={d} className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                      {d}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#486075] dark:text-slate-300 block mb-1">Niveau d&apos;Urgence</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as InterDepRequest['priority'])}
                className="w-full p-2 rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] font-semibold text-[#0B1F30] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
              >
                <option value="normal" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">Normal</option>
                <option value="urgent" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">Urgent</option>
                <option value="bloquant" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">Bloquant (Empêche la validation)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#486075] dark:text-slate-300 block mb-1 text-xs">
              Objet de la demande (Pièce, avis ou arbitrage)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: PV d’AG extraordinaire ou grand livre des comptes 641 certifié..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-[#486075] dark:text-slate-300 block mb-1">
                Description &amp; Contexte
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Précisez pourquoi cette pièce est requise pour le livrable client..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#486075] dark:text-slate-300 block mb-1">Échéance requise</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#103049] text-[#0B1F30] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(false)}
              className="text-xs border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-transparent text-[#486075] dark:text-slate-300"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              className="bg-[#F77F00] hover:bg-[#DE7200] text-white font-bold text-xs gap-1 cursor-pointer"
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
          <div className="p-8 text-center text-[#486075] dark:text-[#9FB3C8] bg-white dark:bg-[#0B2438] rounded-xl border border-dashed border-[#D8E2EC] dark:border-[#94B8D6]/25 text-xs">
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
                    ? 'bg-rose-50/70 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 shadow-xs'
                    : isProvided
                      ? 'bg-emerald-50/70 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-white dark:bg-[#0B2438] border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:border-[#004266]/35 dark:hover:border-[#3895C9]/40 shadow-xs'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getDeptColor(req.fromDepartment)}`}
                    >
                      {req.fromDepartment}
                    </span>
                    <span className="text-[#64748B] dark:text-slate-400 text-xs">➔</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getDeptColor(req.toDepartment)}`}
                    >
                      {req.toDepartment}
                    </span>

                    {req.priority === 'bloquant' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white">
                        <AlertOctagon className="w-3 h-3" />
                        BLOQUANT
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    {req.status === 'provided' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Pièce Fournie &amp; Validée
                      </span>
                    ) : req.status === 'blocked' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-500/20 px-2.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        Blocage Déclaré
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#B85A00] dark:text-[#FFB35C] bg-[#FFF4E6] dark:bg-[#F77F00]/20 px-2.5 py-0.5 rounded-md border border-[#F77F00]/30">
                        <Clock className="w-3.5 h-3.5 text-[#F77F00] dark:text-[#FFB35C]" />
                        En Attente
                      </span>
                    )}
                  </div>
                </div>

                <h5 className="text-sm font-bold text-[#0B1F30] dark:text-white mb-1">{req.title}</h5>
                <p className="text-xs text-[#486075] dark:text-slate-300 mb-2 leading-relaxed">{req.description}</p>

                {req.blockerReason && (
                  <div className="p-2 mb-2 bg-rose-100/80 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-lg text-xs text-rose-900 dark:text-rose-200 font-medium flex items-start gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-800 dark:text-rose-300">Motif du blocage :</strong> {req.blockerReason}
                    </div>
                  </div>
                )}

                {req.resolutionNotes && (
                  <div className="p-2 mb-2 bg-emerald-100/70 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-800 dark:text-emerald-300">Réponse apportée :</strong> {req.resolutionNotes}
                      {req.attachedDocName && (
                        <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                          <FileText className="w-3.5 h-3.5" />
                          {req.attachedDocName}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer and action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15 text-[11px] text-[#64748B] dark:text-[#9FB3C8]">
                  <span>
                    Demandé par <strong className="text-[#0B1F30] dark:text-slate-200">{req.requesterName}</strong> · Échéance :{' '}
                    <strong className="text-[#0B1F30] dark:text-slate-200 tabular-nums">{new Date(req.dueDate).toLocaleDateString('fr-FR')}</strong>
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
                          className="h-7 text-[11px] border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 font-semibold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
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
                            className="h-7 text-[11px] border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/30 font-semibold cursor-pointer"
                          >
                            <AlertOctagon className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />
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
