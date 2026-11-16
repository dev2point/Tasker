'use client';

import React, { useState, useMemo } from 'react';
import { computeWordDiff, WordDiffToken } from '@/lib/office-parser';
import {
  FileText,
  Columns,
  AlignJustify,
  History,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WordDocxDiffViewerProps {
  previousText?: string;
  currentText?: string;
  fileName: string;
  versionOldLabel?: string;
  versionNewLabel?: string;
  authorName?: string;
  amendmentNotes?: string;
}

export const WordDocxDiffViewer: React.FC<WordDocxDiffViewerProps> = ({
  previousText = '',
  currentText = '',
  fileName,
  versionOldLabel = 'Version précédente',
  versionNewLabel = 'Version active',
  authorName,
  amendmentNotes,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  // Compute word-level diff tokens
  const tokens: WordDiffToken[] = useMemo(() => {
    return computeWordDiff(previousText || '', currentText || '');
  }, [previousText, currentText]);

  // Statistics
  const additionsCount = useMemo(
    () => tokens.filter((t) => t.type === 'added').length,
    [tokens]
  );
  const deletionsCount = useMemo(
    () => tokens.filter((t) => t.type === 'removed').length,
    [tokens]
  );

  return (
    <div className="flex flex-col gap-3 w-full bg-[#061A13]/95 rounded-2xl border border-emerald-500/30 overflow-hidden text-slate-100 shadow-xl">
      {/* 1. Header Bar: File name, View Mode Switch & Word Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-emerald-950/70 border-b border-emerald-500/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">{fileName}</h4>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono">
                Diff mot à mot .docx
              </Badge>
            </div>
            {authorName && (
              <span className="text-[11px] text-slate-400">
                Par <strong className="text-emerald-300">{authorName}</strong>
                {amendmentNotes && <span> · « {amendmentNotes} »</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Word diff counters */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              +{additionsCount} mot(s)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              -{deletionsCount} mot(s)
            </span>
          </div>

          {/* View mode toggle: Unified vs Split */}
          <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-950/60 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('unified')}
              className={`h-7 px-2.5 text-xs gap-1 font-semibold ${
                viewMode === 'unified'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Unifié</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('split')}
              className={`h-7 px-2.5 text-xs gap-1 font-semibold ${
                viewMode === 'split'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Côte à côte</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Content rendering */}
      {viewMode === 'unified' ? (
        /* Unified Word Diff View */
        <div className="p-4 bg-black/40 max-h-[420px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-sans whitespace-pre-wrap select-text">
          {tokens.map((token, idx) => {
            if (token.type === 'added') {
              return (
                <span
                  key={idx}
                  className="bg-emerald-500/30 text-emerald-200 border-b-2 border-emerald-400 font-medium px-0.5 mx-0.5 rounded-sm"
                  title="Mot ajouté dans la version active"
                >
                  {token.value}
                </span>
              );
            }
            if (token.type === 'removed') {
              return (
                <span
                  key={idx}
                  className="bg-rose-500/25 text-rose-300 line-through opacity-85 px-0.5 mx-0.5 rounded-sm"
                  title="Mot supprimé ou remplacé"
                >
                  {token.value}
                </span>
              );
            }
            return <span key={idx} className="text-slate-200">{token.value}</span>;
          })}
        </div>
      ) : (
        /* Split Side-by-Side Word Diff View */
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-emerald-500/30">
          {/* Left: Previous version */}
          <div className="flex flex-col min-w-0">
            <div className="px-4 py-2 bg-rose-950/30 border-b border-emerald-500/20 text-xs font-bold text-rose-300 flex items-center justify-between">
              <span>{versionOldLabel}</span>
              <span className="text-[10px] text-slate-400 font-mono">Avant modification</span>
            </div>
            <div className="p-4 bg-black/40 max-h-[420px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-sans whitespace-pre-wrap select-text">
              {previousText ? (
                tokens
                  .filter((t) => t.type !== 'added')
                  .map((t, idx) => (
                    <span
                      key={idx}
                      className={
                        t.type === 'removed'
                          ? 'bg-rose-500/30 text-rose-200 line-through px-0.5 rounded-sm font-semibold'
                          : 'text-slate-300'
                      }
                    >
                      {t.value}
                    </span>
                  ))
              ) : (
                <span className="text-slate-500 italic">Aucun contenu antérieur disponible.</span>
              )}
            </div>
          </div>

          {/* Right: Active version */}
          <div className="flex flex-col min-w-0">
            <div className="px-4 py-2 bg-emerald-950/50 border-b border-emerald-500/20 text-xs font-bold text-emerald-300 flex items-center justify-between">
              <span>{versionNewLabel}</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Actuel / Révisé</span>
            </div>
            <div className="p-4 bg-black/40 max-h-[420px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-sans whitespace-pre-wrap select-text">
              {currentText ? (
                tokens
                  .filter((t) => t.type !== 'removed')
                  .map((t, idx) => (
                    <span
                      key={idx}
                      className={
                        t.type === 'added'
                          ? 'bg-emerald-500/30 text-emerald-200 border-b-2 border-emerald-400 px-0.5 rounded-sm font-medium'
                          : 'text-slate-200'
                      }
                    >
                      {t.value}
                    </span>
                  ))
              ) : (
                <span className="text-slate-500 italic">Aucun contenu texte dans cette version.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-emerald-950/40 border-t border-emerald-500/20 text-[11px] text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50 inline-block line-through text-[8px] text-center leading-3">
              -
            </span>
            <span>Texte supprimé par la nouvelle version</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block text-[8px] text-center leading-3">
              +
            </span>
            <span>Texte ajouté par le consultant</span>
          </span>
        </div>
        <span className="text-slate-500">
          Comparateur mot à mot certifié pour documents Word (.docx).
        </span>
      </div>
    </div>
  );
};
