'use client';

import React, { useState, useMemo } from 'react';
import { computeWordDiff, WordDiffToken } from '@/lib/office-parser';
import {
  FileText,
  Columns,
  AlignJustify,
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

  const tokens: WordDiffToken[] = useMemo(() => {
    return computeWordDiff(previousText || '', currentText || '');
  }, [previousText, currentText]);

  const additionsCount = useMemo(
    () => tokens.filter((t) => t.type === 'added').length,
    [tokens]
  );
  const deletionsCount = useMemo(
    () => tokens.filter((t) => t.type === 'removed').length,
    [tokens]
  );

  return (
    <div className="flex flex-col gap-3 w-full bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 overflow-hidden text-[#0B1F30] dark:text-[#F1F5F9] shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#004266]/10 text-[#004266] border border-[#004266]/20 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#0B1F30] dark:text-white truncate">{fileName}</h4>
              <Badge variant="default" className="text-[10px] font-mono">
                Diff mot à mot .docx
              </Badge>
            </div>
            {authorName && (
              <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                Par <strong className="text-[#004266] dark:text-[#7CC4EB]">{authorName}</strong>
                {amendmentNotes && <span> · « {amendmentNotes} »</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold">
              +{additionsCount} mot(s)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold">
              -{deletionsCount} mot(s)
            </span>
          </div>

          <div className="flex items-center rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('unified')}
              className={`h-7 px-2.5 text-xs gap-1 font-semibold cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-[#004266] text-white hover:bg-[#00314D] dark:bg-[#3895C9] dark:text-[#061826]'
                  : 'text-[#486075] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white'
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
              className={`h-7 px-2.5 text-xs gap-1 font-semibold cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-[#004266] text-white hover:bg-[#00314D] dark:bg-[#3895C9] dark:text-[#061826]'
                  : 'text-[#486075] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Côte à côte</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content rendering */}
      {viewMode === 'unified' ? (
        <div className="p-4 bg-[#F4F7FA] dark:bg-[#061826]/60 max-h-[420px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-sans whitespace-pre-wrap select-text">
          {tokens.map((token, idx) => {
            if (token.type === 'added') {
              return (
                <span
                  key={idx}
                  className="bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 dark:bg-emerald-500/30 dark:text-emerald-200 dark:border-emerald-400 font-medium px-0.5 mx-0.5 rounded-sm"
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
                  className="bg-rose-100 text-rose-800 dark:bg-rose-500/25 dark:text-rose-300 line-through opacity-85 px-0.5 mx-0.5 rounded-sm"
                  title="Mot supprimé ou remplacé"
                >
                  {token.value}
                </span>
              );
            }
            return <span key={idx} className="text-[#0B1F30] dark:text-[#F1F5F9]">{token.value}</span>;
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#D8E2EC] dark:divide-[#94B8D6]/20">
          <div className="flex flex-col min-w-0">
            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>{versionOldLabel}</span>
              <span className="text-[10px] text-[#486075] dark:text-[#9FB3C8] font-mono">Avant modification</span>
            </div>
            <div className="p-4 bg-[#F4F7FA] dark:bg-[#061826]/60 max-h-[420px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-sans whitespace-pre-wrap select-text">
              {previousText ? (
                tokens
                  .filter((t) => t.type !== 'added')
                  .map((t, idx) => (
                    <span
                      key={idx}
                      className={
                        t.type === 'removed'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/30 dark:text-rose-200 line-through px-0.5 rounded-sm font-semibold'
                          : 'text-[#486075] dark:text-[#9FB3C8]'
                      }
                    >
                      {t.value}
                    </span>
                  ))
              ) : (
                <span className="text-[#64748B] italic">Aucun contenu antérieur disponible.</span>
              )}
            </div>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
              <span>{versionNewLabel}</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">Actuel / Révisé</span>
            </div>
            <div className="p-4 bg-white dark:bg-[#0B2438] max-h-[420px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-sans whitespace-pre-wrap select-text">
              {currentText ? (
                tokens
                  .filter((t) => t.type !== 'removed')
                  .map((t, idx) => (
                    <span
                      key={idx}
                      className={
                        t.type === 'added'
                          ? 'bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 dark:bg-emerald-500/30 dark:text-emerald-200 dark:border-emerald-400 px-0.5 rounded-sm font-medium'
                          : 'text-[#0B1F30] dark:text-[#F1F5F9]'
                      }
                    >
                      {t.value}
                    </span>
                  ))
              ) : (
                <span className="text-[#64748B] italic">Aucun contenu texte dans cette version.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visual Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#EDF2F7] dark:bg-[#103049] border-t border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[11px] text-[#486075] dark:text-[#9FB3C8]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 text-rose-700 dark:bg-rose-500/30 dark:border-rose-500/50 dark:text-rose-200 inline-block line-through text-[8px] text-center leading-3">
              -
            </span>
            <span>Texte supprimé par la nouvelle version</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 dark:bg-emerald-500/30 dark:border-emerald-500/50 dark:text-emerald-200 inline-block text-[8px] text-center leading-3">
              +
            </span>
            <span>Texte ajouté par le consultant</span>
          </span>
        </div>
        <span className="text-[#64748B] dark:text-[#9FB3C8]">
          Comparateur mot à mot certifié pour documents Word (.docx).
        </span>
      </div>
    </div>
  );
};
