'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { soundManager } from '@/lib/sound';

interface ModerationDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  versionNumber: string;
  authorName: string;
  onConfirmDecision: (decision: {
    status: 'approved' | 'rejected';
    note: string;
  }) => void;
  defaultAction?: 'approved' | 'rejected';
}

export const ModerationDecisionModal: React.FC<ModerationDecisionModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  versionNumber,
  authorName,
  onConfirmDecision,
  defaultAction = 'approved',
}) => {
  const [action, setAction] = useState<'approved' | 'rejected'>(defaultAction);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || note.trim().length < 5) {
      setError('Veuillez renseigner un motif d\'au moins 5 caractères (obligatoire pour la modération).');
      soundManager.playClickSound();
      return;
    }

    soundManager.playClickSound();
    onConfirmDecision({
      status: action,
      note: note.trim(),
    });
    setNote('');
    setError('');
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
        <div className="relative w-full max-w-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-2xl shadow-2xl p-5 text-[#0B1F30] dark:text-slate-100 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-lg border ${
                  action === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40'
                    : 'bg-[#FFF4E6] dark:bg-[#F77F00]/20 text-[#B85A00] dark:text-[#FFB35C] border-[#F77F00]/30'
                }`}
              >
                {action === 'approved' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#0B1F30] dark:text-white">
                  {action === 'approved' ? 'Validation de Modération' : 'Demande de Corrections'}
                </h3>
                <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                  {documentTitle} · Version <span className="font-mono text-[#004266] dark:text-[#7CC4EB] font-semibold">{versionNumber}</span> de {authorName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1 text-[#64748B] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Choice Tabs */}
            <div>
              <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1.5">
                Décision du Superviseur
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAction('approved');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    action === 'approved'
                      ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs'
                      : 'bg-[#F4F7FA] dark:bg-[#103049] text-[#486075] dark:text-slate-400 border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:text-[#0B1F30] dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Valider le document</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAction('rejected');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    action === 'rejected'
                      ? 'bg-[#FFF4E6] dark:bg-[#F77F00]/20 text-[#B85A00] dark:text-[#FFB35C] border-[#F77F00] ring-1 ring-[#F77F00]/40 shadow-xs'
                      : 'bg-[#F4F7FA] dark:bg-[#103049] text-[#486075] dark:text-slate-400 border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:text-[#0B1F30] dark:hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-[#F77F00] dark:text-[#FFB35C]" />
                  <span>Renvoyer pour corrections</span>
                </button>
              </div>
            </div>

            {/* Mandatory Motive / Instructions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#0B1F30] dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#F77F00]" />
                  <span>Motif et consignes d&apos;arbitrage <strong className="text-[#F77F00]">*</strong></span>
                </label>
                <span className="text-[10px] text-[#B85A00] dark:text-[#FFB35C] font-bold uppercase tracking-wider">
                  Obligatoire
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError('');
                }}
                placeholder={
                  action === 'approved'
                    ? 'Ex: Conforme aux dispositions de la liasse fiscale, chiffres vérifiés et validés pour envoi client...'
                    : 'Ex: Merci de revoir les calculs de déduction sur la ligne 14 de la feuille 2 et de compléter la note de bas de page...'
                }
                className="w-full p-3 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#061826] text-xs text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:ring-2 focus:ring-[#004266] dark:focus:ring-[#3895C9] outline-hidden resize-none"
              />
              {error && (
                <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{error}</span>
                </p>
              )}
              <p className="text-[10px] text-[#64748B] dark:text-[#9FB3C8] mt-1">
                Ce motif sera immédiatement consigné dans la Piste d&apos;Audit et notifié à <strong className="text-[#0B1F30] dark:text-slate-200">{authorName}</strong>.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/20">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                className={`text-xs font-bold gap-1.5 text-white ${
                  action === 'approved'
                    ? 'bg-[#004266] hover:bg-[#00314D]'
                    : 'bg-[#F77F00] hover:bg-[#DE7200]'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {action === 'approved' ? 'Confirmer la validation' : 'Notifier le renvoi'}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
