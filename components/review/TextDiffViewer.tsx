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
    <div className="flex flex-col gap-3 w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header Bar with Diff Stats & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <History className="w-4 h-4 text-[#BA5316] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {title}
            </span>
            {lastAmendedBy && (
              <span className="text-[11px] text-slate-500">
                Amandé par <strong className="text-slate-700">{lastAmendedBy}</strong>{' '}
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
          {/* Counters */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              +{additionsCount} ajouts
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
              -{deletionsCount} retraits
            </span>
          </div>

          {/* Toggle View Mode */}
          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 border border-slate-300/50">
            <Button
              type="button"
              variant={viewMode === 'unified' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('unified')}
              className="h-7 px-2.5 text-[11px] font-semibold gap-1"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              Unifié
            </Button>
            <Button
              type="button"
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="h-7 px-2.5 text-[11px] font-semibold gap-1"
            >
              <Columns className="w-3.5 h-3.5" />
              Côte à côte
            </Button>
          </div>
        </div>
      </div>

      {/* Amendment notes highlight if any */}
      {amendmentNotes && (
        <div className="mx-4 mt-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg flex items-start gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Consignes d&apos;amendement :</strong> {amendmentNotes}
          </div>
        </div>
      )}

      {/* Diff Content View */}
      {viewMode === 'unified' ? (
        <div className="font-mono text-xs overflow-x-auto divide-y divide-slate-100 bg-white max-h-[420px]">
          {diffLines.map((line, idx) => {
            if (line.type === 'added') {
              return (
                <div
                  key={idx}
                  className="flex items-start bg-emerald-50/80 text-emerald-900 border-l-4 border-emerald-500 px-3 py-1.5 gap-3"
                >
                  <span className="select-none text-emerald-600 font-bold w-4 shrink-0 text-center">
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
                  className="flex items-start bg-rose-50/80 text-rose-900 border-l-4 border-rose-500 px-3 py-1.5 gap-3 line-through opacity-80"
                >
                  <span className="select-none text-rose-600 font-bold w-4 shrink-0 text-center">
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
                className="flex items-start text-slate-700 px-3 py-1.5 gap-3 hover:bg-slate-50/50"
              >
                <span className="select-none text-slate-300 w-4 shrink-0 text-center">•</span>
                <span className="whitespace-pre-wrap break-words flex-1">{line.content || ' '}</span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Split view: Original vs Current Revision */
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs font-mono max-h-[420px] overflow-y-auto">
          {/* Previous version column */}
          <div className="p-3 bg-slate-50/40">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-2 mb-2 border-b border-slate-200">
              Version Précédente (Brouillon Initial)
            </div>
            <pre className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed font-sans">
              {previousText || '(Aucun texte antérieur)'}
            </pre>
          </div>

          {/* Current version column with updates */}
          <div className="p-3 bg-white">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider pb-2 mb-2 border-b border-emerald-200 flex items-center justify-between">
              <span>Version Révisée / Amendée</span>
              <Badge variant="apricot" className="text-[9px] py-0 px-1 font-bold">
                Dernière mouture
              </Badge>
            </div>
            <pre className="whitespace-pre-wrap break-words text-slate-900 font-medium leading-relaxed font-sans">
              {currentText || '(Texte en cours de saisie)'}
            </pre>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Comparateur certifié conforme aux règles de traçabilité légale.
        </span>
        <span className="text-slate-400 font-mono">Diff v2.6.4</span>
      </div>
    </div>
  );
};
