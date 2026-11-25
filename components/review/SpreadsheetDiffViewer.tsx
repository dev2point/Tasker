'use client';

import React, { useState, useMemo, useRef } from 'react';
import { SpreadsheetSheet } from '@/types/file-version';
import { computeGridDiff, getColumnLetter } from '@/lib/office-parser';
import {
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SpreadsheetDiffViewerProps {
  previousSheets?: SpreadsheetSheet[];
  currentSheets?: SpreadsheetSheet[];
  fileName: string;
  versionOldLabel?: string;
  versionNewLabel?: string;
}

export const SpreadsheetDiffViewer: React.FC<SpreadsheetDiffViewerProps> = ({
  previousSheets = [],
  currentSheets = [],
  fileName,
  versionOldLabel = 'Version précédente',
  versionNewLabel = 'Version active',
}) => {
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [filterChangedOnly, setFilterChangedOnly] = useState<boolean>(false);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);

  const prevSheet = previousSheets[activeSheetIndex] || previousSheets[0];
  const currSheet = currentSheets[activeSheetIndex] || currentSheets[0];

  const gridDiff = useMemo(() => {
    return computeGridDiff(prevSheet, currSheet);
  }, [prevSheet, currSheet]);

  const maxRows = Math.max(prevSheet?.rows.length || 0, currSheet?.rows.length || 0);
  const maxCols = Math.max(
    prevSheet?.colCount || prevSheet?.headers?.length || 0,
    currSheet?.colCount || currSheet?.headers?.length || 0,
    1
  );

  const displayedRowIndices = useMemo(() => {
    const indices: number[] = [];
    for (let r = 0; r < maxRows; r++) {
      if (!filterChangedOnly || gridDiff.modifiedRowSet.has(r)) {
        indices.push(r);
      }
    }
    return indices;
  }, [maxRows, filterChangedOnly, gridDiff.modifiedRowSet]);

  const handleScroll = (source: 'left' | 'right') => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    if (source === 'left' && leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
      rightScrollRef.current.scrollLeft = leftScrollRef.current.scrollLeft;
    } else if (source === 'right' && leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
      leftScrollRef.current.scrollLeft = rightScrollRef.current.scrollLeft;
    }

    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  const columnHeaders = useMemo(() => {
    const list: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const headerA = prevSheet?.headers?.[c];
      const headerB = currSheet?.headers?.[c];
      list.push(headerB || headerA || getColumnLetter(c + 1));
    }
    return list;
  }, [maxCols, prevSheet, currSheet]);

  const allSheetNames = useMemo(() => {
    const set = new Set<string>();
    previousSheets.forEach((s) => s?.name && set.add(s.name));
    currentSheets.forEach((s) => s?.name && set.add(s.name));
    return Array.from(set);
  }, [previousSheets, currentSheets]);

  return (
    <div className="flex flex-col gap-3 w-full bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 overflow-hidden text-[#0B1F30] dark:text-[#F1F5F9] shadow-sm">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[#004266]/10 text-[#004266] border border-[#004266]/20 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#0B1F30] dark:text-white truncate">{fileName}</h4>
              <Badge variant="default" className="text-[10px] font-mono">
                Double Grille .xlsx
              </Badge>
            </div>
            <div className="text-[11px] text-[#486075] dark:text-[#9FB3C8] flex items-center gap-2 tabular-nums">
              <span>{maxRows} ligne(s)</span>
              <span>·</span>
              <span>{maxCols} colonne(s)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <span
              className={`px-2 py-0.5 rounded-md font-bold border ${
                gridDiff.totalModifiedCells > 0
                  ? 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
              }`}
            >
              {gridDiff.totalModifiedCells} cellule(s) modifiée(s)
            </span>
            {gridDiff.totalAddedRows > 0 && (
              <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                +{gridDiff.totalAddedRows} ligne(s)
              </span>
            )}
          </div>

          <Button
            type="button"
            variant={filterChangedOnly ? 'accent' : 'outline'}
            size="sm"
            onClick={() => setFilterChangedOnly((prev) => !prev)}
            className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterChangedOnly ? 'Lignes modifiées' : 'Toutes les lignes'}</span>
          </Button>
        </div>
      </div>

      {/* Sheet selector tabs */}
      {allSheetNames.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-1.5 bg-[#F4F7FA] dark:bg-[#061826]/60 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 overflow-x-auto text-xs">
          <span className="text-[11px] text-[#64748B] font-bold uppercase mr-1">Feuilles :</span>
          {allSheetNames.map((name, idx) => {
            const isTabActive = activeSheetIndex === idx;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheetIndex(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isTabActive
                    ? 'bg-[#004266] text-white font-bold shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
                    : 'text-[#486075] hover:text-[#0B1F30] hover:bg-white dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#103049]'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* Dual side-by-side Spreadsheet Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#D8E2EC] dark:divide-[#94B8D6]/20">
        {/* Left Column */}
        <div className="flex flex-col min-w-0">
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <span>{versionOldLabel}</span>
              <span className="text-[10px] text-[#486075] dark:text-[#9FB3C8] font-normal tabular-nums">
                ({prevSheet?.rows.length || 0} lignes)
              </span>
            </span>
            <span className="text-[10px] font-mono text-[#64748B] dark:text-[#9FB3C8]">Origine</span>
          </div>

          <div
            ref={leftScrollRef}
            onScroll={() => handleScroll('left')}
            className="overflow-auto max-h-[380px] p-2 font-mono text-[11px]"
          >
            <table className="w-full border-collapse border border-[#D8E2EC] dark:border-[#94B8D6]/20 select-text">
              <thead>
                <tr className="bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 sticky top-0 z-10">
                  <th className="w-9 p-1.5 text-center text-[10px] text-[#64748B] border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 font-normal">
                    #
                  </th>
                  {columnHeaders.map((hdr, cIdx) => (
                    <th
                      key={cIdx}
                      className="p-1.5 text-left text-[11px] font-bold text-[#004266] dark:text-[#7CC4EB] border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 min-w-[90px] whitespace-nowrap"
                    >
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15">
                {displayedRowIndices.map((r) => {
                  const row = prevSheet?.rows[r];
                  const isModifiedRow = gridDiff.modifiedRowSet.has(r);
                  return (
                    <tr
                      key={r}
                      className={`hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/50 transition-colors ${
                        isModifiedRow ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="w-9 p-1.5 text-center text-[10px] text-[#64748B] border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/40 tabular-nums">
                        {r + 1}
                      </td>
                      {columnHeaders.map((_, cIdx) => {
                        const cellKey = `r${r}_c${cIdx}`;
                        const isChanged = gridDiff.modifiedCellMap.has(cellKey);
                        const val = row?.[cIdx];
                        return (
                          <td
                            key={cIdx}
                            className={`p-1.5 border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 truncate max-w-[160px] ${
                              isChanged
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/40 font-semibold line-through'
                                : 'text-[#486075] dark:text-[#9FB3C8]'
                            }`}
                            title={val !== null && val !== undefined ? String(val) : ''}
                          >
                            {val !== null && val !== undefined ? String(val) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col min-w-0">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <span>{versionNewLabel}</span>
              <span className="text-[10px] text-[#486075] dark:text-[#9FB3C8] font-normal tabular-nums">
                ({currSheet?.rows.length || 0} lignes)
              </span>
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">Actuel / Révisé</span>
          </div>

          <div
            ref={rightScrollRef}
            onScroll={() => handleScroll('right')}
            className="overflow-auto max-h-[380px] p-2 font-mono text-[11px]"
          >
            <table className="w-full border-collapse border border-[#D8E2EC] dark:border-[#94B8D6]/20 select-text">
              <thead>
                <tr className="bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 sticky top-0 z-10">
                  <th className="w-9 p-1.5 text-center text-[10px] text-[#64748B] border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 font-normal">
                    #
                  </th>
                  {columnHeaders.map((hdr, cIdx) => (
                    <th
                      key={cIdx}
                      className="p-1.5 text-left text-[11px] font-bold text-[#004266] dark:text-[#7CC4EB] border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 min-w-[90px] whitespace-nowrap"
                    >
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15">
                {displayedRowIndices.map((r) => {
                  const row = currSheet?.rows[r];
                  const isModifiedRow = gridDiff.modifiedRowSet.has(r);
                  return (
                    <tr
                      key={r}
                      className={`hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/50 transition-colors ${
                        isModifiedRow ? 'bg-[#FFF4E6]/50 dark:bg-[#F77F00]/10' : ''
                      }`}
                    >
                      <td className="w-9 p-1.5 text-center text-[10px] text-[#64748B] border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/40 tabular-nums">
                        {r + 1}
                      </td>
                      {columnHeaders.map((_, cIdx) => {
                        const cellKey = `r${r}_c${cIdx}`;
                        const changeInfo = gridDiff.modifiedCellMap.get(cellKey);
                        const isChanged = Boolean(changeInfo);
                        const val = row?.[cIdx];
                        return (
                          <td
                            key={cIdx}
                            className={`p-1.5 border-r border-[#D8E2EC] dark:border-[#94B8D6]/20 truncate max-w-[160px] ${
                              isChanged
                                ? 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/45 ring-1 ring-[#F77F00]/40 dark:bg-[#F77F00]/25 dark:text-[#FFB35C] dark:border-[#F77F00]/50 font-bold'
                                : 'text-[#0B1F30] dark:text-[#F1F5F9]'
                            }`}
                            title={
                              isChanged
                                ? `Avant : "${changeInfo?.oldValue ?? 'vide'}" ➔ Après : "${val ?? 'vide'}"`
                                : val !== null && val !== undefined
                                ? String(val)
                                : ''
                            }
                          >
                            {val !== null && val !== undefined ? String(val) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visual Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#EDF2F7] dark:bg-[#103049] border-t border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[11px] text-[#486075] dark:text-[#9FB3C8]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 dark:bg-rose-500/30 dark:border-rose-500/50 inline-block" />
            <span>Valeur d&apos;origine supprimée ou modifiée</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#FFF4E6] border border-[#F77F00]/50 ring-1 ring-[#F77F00]/40 dark:bg-[#F77F00]/30 inline-block" />
            <span>Nouvelle valeur saisie (Version active)</span>
          </span>
        </div>
        <span className="text-[#64748B] dark:text-[#9FB3C8]">
          Survol d&apos;une cellule orange pour inspecter l&apos;ancienne valeur.
        </span>
      </div>
    </div>
  );
};
