'use client';

import React, { useState, useMemo, useRef } from 'react';
import { SpreadsheetSheet } from '@/types/file-version';
import { computeGridDiff, getColumnLetter } from '@/lib/office-parser';
import {
  FileSpreadsheet,
  Columns,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
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
  // Active sheet tab
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [filterChangedOnly, setFilterChangedOnly] = useState<boolean>(false);

  // Synchronized scroll refs
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);

  // Select active sheet
  const prevSheet = previousSheets[activeSheetIndex] || previousSheets[0];
  const currSheet = currentSheets[activeSheetIndex] || currentSheets[0];

  // Compute cell-level diff
  const gridDiff = useMemo(() => {
    return computeGridDiff(prevSheet, currSheet);
  }, [prevSheet, currSheet]);

  const maxRows = Math.max(prevSheet?.rows.length || 0, currSheet?.rows.length || 0);
  const maxCols = Math.max(
    prevSheet?.colCount || prevSheet?.headers?.length || 0,
    currSheet?.colCount || currSheet?.headers?.length || 0,
    1
  );

  // Rows to display (either all or only changed)
  const displayedRowIndices = useMemo(() => {
    const indices: number[] = [];
    for (let r = 0; r < maxRows; r++) {
      if (!filterChangedOnly || gridDiff.modifiedRowSet.has(r)) {
        indices.push(r);
      }
    }
    return indices;
  }, [maxRows, filterChangedOnly, gridDiff.modifiedRowSet]);

  // Synchronize scroll between left and right table
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

  // Get common headers
  const columnHeaders = useMemo(() => {
    const list: string[] = [];
    for (let c = 0; c < maxCols; c++) {
      const headerA = prevSheet?.headers?.[c];
      const headerB = currSheet?.headers?.[c];
      list.push(headerB || headerA || getColumnLetter(c + 1));
    }
    return list;
  }, [maxCols, prevSheet, currSheet]);

  // Available sheets tabs
  const allSheetNames = useMemo(() => {
    const set = new Set<string>();
    previousSheets.forEach((s) => s?.name && set.add(s.name));
    currentSheets.forEach((s) => s?.name && set.add(s.name));
    return Array.from(set);
  }, [previousSheets, currentSheets]);

  return (
    <div className="flex flex-col gap-3 w-full bg-[#061A13]/95 rounded-2xl border border-emerald-500/30 overflow-hidden text-slate-100 shadow-xl">
      {/* 1. Header Bar: File name, Sheet Tabs & Diff Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-emerald-950/70 border-b border-emerald-500/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">{fileName}</h4>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono">
                Double Grille .xlsx
              </Badge>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{maxRows} ligne(s)</span>
              <span>·</span>
              <span>{maxCols} colonne(s)</span>
            </div>
          </div>
        </div>

        {/* Diff statistics */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className={`px-2 py-0.5 rounded-md font-bold border ${
                gridDiff.totalModifiedCells > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {gridDiff.totalModifiedCells} cellule(s) modifiée(s)
            </span>
            {gridDiff.totalAddedRows > 0 && (
              <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                +{gridDiff.totalAddedRows} ligne(s)
              </span>
            )}
          </div>

          {/* Filter toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilterChangedOnly((prev) => !prev)}
            className={`h-7 px-2.5 text-xs font-semibold gap-1.5 transition-all ${
              filterChangedOnly
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterChangedOnly ? 'Lignes modifiées' : 'Toutes les lignes'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Sheet selector tabs (if workbook has multiple sheets) */}
      {allSheetNames.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-1.5 bg-black/40 border-b border-emerald-500/20 overflow-x-auto text-xs">
          <span className="text-[11px] text-slate-500 font-bold uppercase mr-1">Feuilles :</span>
          {allSheetNames.map((name, idx) => {
            const isTabActive = activeSheetIndex === idx;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheetIndex(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isTabActive
                    ? 'bg-emerald-500/30 text-white border border-emerald-500/50 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-emerald-950/40'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Dual side-by-side Spreadsheet Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-emerald-500/30">
        {/* Left Column: Version précédente */}
        <div className="flex flex-col min-w-0">
          <div className="px-4 py-2 bg-rose-950/30 border-b border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <span>{versionOldLabel}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({prevSheet?.rows.length || 0} lignes)
              </span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Origine</span>
          </div>

          <div
            ref={leftScrollRef}
            onScroll={() => handleScroll('left')}
            className="overflow-auto max-h-[380px] p-2 font-mono text-[11px]"
          >
            <table className="w-full border-collapse border border-emerald-500/20 select-text">
              <thead>
                <tr className="bg-emerald-950/70 border-b border-emerald-500/30 sticky top-0 z-10">
                  <th className="w-9 p-1.5 text-center text-[10px] text-slate-500 border-r border-emerald-500/20 font-normal">
                    #
                  </th>
                  {columnHeaders.map((hdr, cIdx) => (
                    <th
                      key={cIdx}
                      className="p-1.5 text-left text-[11px] font-bold text-emerald-300 border-r border-emerald-500/20 min-w-[90px] whitespace-nowrap"
                    >
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {displayedRowIndices.map((r) => {
                  const row = prevSheet?.rows[r];
                  const isModifiedRow = gridDiff.modifiedRowSet.has(r);
                  return (
                    <tr
                      key={r}
                      className={`hover:bg-emerald-500/10 transition-colors ${
                        isModifiedRow ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="w-9 p-1.5 text-center text-[10px] text-slate-500 border-r border-emerald-500/20 bg-emerald-950/30">
                        {r + 1}
                      </td>
                      {columnHeaders.map((_, cIdx) => {
                        const cellKey = `r${r}_c${cIdx}`;
                        const isChanged = gridDiff.modifiedCellMap.has(cellKey);
                        const val = row?.[cIdx];
                        return (
                          <td
                            key={cIdx}
                            className={`p-1.5 border-r border-emerald-500/20 truncate max-w-[160px] ${
                              isChanged
                                ? 'bg-rose-500/20 text-rose-200 border-rose-500/40 font-semibold line-through'
                                : 'text-slate-300'
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

        {/* Right Column: Version active révisée */}
        <div className="flex flex-col min-w-0">
          <div className="px-4 py-2 bg-emerald-950/50 border-b border-emerald-500/20 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span>{versionNewLabel}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({currSheet?.rows.length || 0} lignes)
              </span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">Actuel / Révisé</span>
          </div>

          <div
            ref={rightScrollRef}
            onScroll={() => handleScroll('right')}
            className="overflow-auto max-h-[380px] p-2 font-mono text-[11px]"
          >
            <table className="w-full border-collapse border border-emerald-500/20 select-text">
              <thead>
                <tr className="bg-emerald-950/70 border-b border-emerald-500/30 sticky top-0 z-10">
                  <th className="w-9 p-1.5 text-center text-[10px] text-slate-500 border-r border-emerald-500/20 font-normal">
                    #
                  </th>
                  {columnHeaders.map((hdr, cIdx) => (
                    <th
                      key={cIdx}
                      className="p-1.5 text-left text-[11px] font-bold text-emerald-300 border-r border-emerald-500/20 min-w-[90px] whitespace-nowrap"
                    >
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {displayedRowIndices.map((r) => {
                  const row = currSheet?.rows[r];
                  const isModifiedRow = gridDiff.modifiedRowSet.has(r);
                  return (
                    <tr
                      key={r}
                      className={`hover:bg-emerald-500/10 transition-colors ${
                        isModifiedRow ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="w-9 p-1.5 text-center text-[10px] text-slate-500 border-r border-emerald-500/20 bg-emerald-950/30">
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
                            className={`p-1.5 border-r border-emerald-500/20 truncate max-w-[160px] ${
                              isChanged
                                ? 'bg-amber-500/25 text-amber-200 border-amber-500/50 ring-1 ring-amber-400/40 font-bold'
                                : 'text-slate-200'
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

      {/* 4. Footer Note & Visual Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-emerald-950/40 border-t border-emerald-500/20 text-[11px] text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50 inline-block" />
            <span>Valeur d&apos;origine supprimée ou modifiée</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50 ring-1 ring-amber-400/50 inline-block" />
            <span>Nouvelle valeur saisie (Version active)</span>
          </span>
        </div>
        <span className="text-slate-500">
          Survol d&apos;une cellule ambre pour inspecter l&apos;ancienne valeur.
        </span>
      </div>
    </div>
  );
};
