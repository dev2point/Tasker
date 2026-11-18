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
      <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#061A13] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg border ${
                action === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {action === 'approved' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">
                {action === 'approved' ? 'Validation de Modération' : 'Demande de Corrections'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {documentTitle} · Version <span className="font-mono text-emerald-300">{versionNumber}</span> de {authorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Choice Tabs */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
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
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500 ring-1 ring-emerald-400 shadow-md'
                    : 'bg-emerald-950/30 text-slate-400 border-emerald-500/20 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500 ring-1 ring-amber-400 shadow-md'
                    : 'bg-emerald-950/30 text-slate-400 border-emerald-500/20 hover:text-white'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Renvoyer pour corrections</span>
              </button>
            </div>
          </div>

          {/* Mandatory Motive / Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Motif et consignes d&apos;arbitrage <strong className="text-amber-400">*</strong></span>
              </label>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
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
              className="w-full p-3 rounded-xl border border-emerald-500/30 bg-[#03140E] text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden resize-none"
            />
            {error && (
              <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{error}</span>
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Ce motif sera immédiatement consigné dans la Piste d&apos;Audit et notifié à <strong className="text-slate-300">{authorName}</strong>.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-500/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-300 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              className={`text-xs font-bold gap-1.5 ${
                action === 'approved'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
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
