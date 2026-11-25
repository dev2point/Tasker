'use client';

import React, { useState } from 'react';
import { computeLineDiff } from '@/lib/review-service';
import { Columns, AlignJustify, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TextDiffViewerProps {
  previousText: string;
  currentText: string;
  title: string;
  lastAmendedBy?: string;
  lastAmendedAt?: string;
  amendmentNotes?: string;
}

export const TextDiffViewer: React.FC<TextDiffViewerProps> = ({
  previousText,
  currentText,
  title,
  lastAmendedBy,
  lastAmendedAt,
  amendmentNotes,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const diffLines = computeLineDiff(previousText || '', currentText || '');

  const additionsCount = diffLines.filter((l) => l.type === 'added').length;
  const deletionsCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <div className="flex flex-col gap-3 w-full bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 overflow-hidden shadow-sm text-[#0B1F30] dark:text-[#F1F5F9]">
      {/* Header Bar with Diff Stats & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <History className="w-4 h-4 text-[#F77F00] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[#0B1F30] dark:text-white truncate">
              {title}
            </span>
            {lastAmendedBy && (
              <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                Amendé par <strong className="text-[#004266] dark:text-[#7CC4EB]">{lastAmendedBy}</strong>{' '}
                {lastAmendedAt && (
                  <span>
                    le {new Date(lastAmendedAt).toLocaleDateString('fr-FR')} à{' '}
                    {new Date(lastAmendedAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold">
              +{additionsCount} ajouts
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold">
              -{deletionsCount} retraits
            </span>
          </div>

          <div className="inline-flex rounded-lg bg-white dark:bg-[#0B2438] p-0.5 border border-[#D8E2EC] dark:border-[#94B8D6]/25">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('unified')}
              className={`h-7 px-2.5 text-[11px] font-semibold gap-1 cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-[#004266] text-white hover:bg-[#00314D] dark:bg-[#3895C9] dark:text-[#061826]'
                  : 'text-[#486075] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              Unifié
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('split')}
              className={`h-7 px-2.5 text-[11px] font-semibold gap-1 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-[#004266] text-white hover:bg-[#00314D] dark:bg-[#3895C9] dark:text-[#061826]'
                  : 'text-[#486075] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Côte à côte
            </Button>
          </div>
        </div>
      </div>

      {amendmentNotes && (
        <div className="mx-4 mt-2 p-2.5 bg-[#FFF4E6] dark:bg-[#F77F00]/15 border border-[#F77F00]/35 rounded-lg flex items-start gap-2 text-xs text-[#0B1F30] dark:text-[#FFB35C]">
          <AlertCircle className="w-4 h-4 text-[#F77F00] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#B85A00] dark:text-[#FFB35C]">Consignes d&apos;amendement :</strong> {amendmentNotes}
          </div>
        </div>
      )}

      {/* Diff Content View */}
      {viewMode === 'unified' ? (
        <div className="font-mono text-xs overflow-x-auto divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15 bg-white dark:bg-[#0B2438] max-h-[420px]">
          {diffLines.map((line, idx) => {
            if (line.type === 'added') {
              return (
                <div
                  key={idx}
                  className="flex items-start bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200 border-l-4 border-emerald-500 px-3 py-1.5 gap-3"
                >
                  <span className="select-none text-emerald-700 dark:text-emerald-400 font-bold w-4 shrink-0 text-center">
                    +
                  </span>
                  <span className="whitespace-pre-wrap break-words flex-1 font-medium">
                    {line.content || ' '}
                  </span>
                </div>
              );
            }
            if (line.type === 'removed') {
              return (
                <div
                  key={idx}
                  className="flex items-start bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border-l-4 border-rose-500 px-3 py-1.5 gap-3 line-through opacity-85"
                >
                  <span className="select-none text-rose-600 dark:text-rose-400 font-bold w-4 shrink-0 text-center">
                    -
                  </span>
                  <span className="whitespace-pre-wrap break-words flex-1 font-medium">
                    {line.content || ' '}
                  </span>
                </div>
              );
            }
            return (
              <div
                key={idx}
                className="flex items-start text-[#486075] dark:text-[#9FB3C8] px-3 py-1.5 gap-3 hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/50"
              >
                <span className="select-none text-[#94A3B8] w-4 shrink-0 text-center">•</span>
                <span className="whitespace-pre-wrap break-words flex-1">{line.content || ' '}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#D8E2EC] dark:divide-[#94B8D6]/20 text-xs font-mono max-h-[420px] overflow-y-auto">
          <div className="p-3 bg-[#F4F7FA] dark:bg-[#061826]/40">
            <div className="text-[11px] font-bold text-[#486075] dark:text-[#9FB3C8] uppercase tracking-wider pb-2 mb-2 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15">
              Version Précédente (Brouillon Initial)
            </div>
            <pre className="whitespace-pre-wrap break-words text-[#486075] dark:text-[#9FB3C8] leading-relaxed font-sans">
              {previousText || '(Aucun texte antérieur)'}
            </pre>
          </div>

          <div className="p-3 bg-white dark:bg-[#0B2438]">
            <div className="text-[11px] font-bold text-[#004266] dark:text-[#7CC4EB] uppercase tracking-wider pb-2 mb-2 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 flex items-center justify-between">
              <span>Version Révisée / Amendée</span>
              <Badge variant="apricot" className="text-[9px] py-0 px-1 font-bold">
                Dernière mouture
              </Badge>
            </div>
            <pre className="whitespace-pre-wrap break-words text-[#0B1F30] dark:text-white font-medium leading-relaxed font-sans">
              {currentText || '(Texte en cours de saisie)'}
            </pre>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#EDF2F7] dark:bg-[#103049] border-t border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[11px] text-[#486075] dark:text-[#9FB3C8]">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
          Comparateur certifié conforme aux règles de traçabilité légale.
        </span>
        <span className="text-[#004266] dark:text-[#7CC4EB] font-mono">Diff v2.6.4</span>
      </div>
    </div>
  );
};
