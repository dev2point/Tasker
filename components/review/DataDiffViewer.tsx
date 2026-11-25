'use client';

import React from 'react';
import { DataFieldDiff } from '@/types/review';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface DataDiffViewerProps {
  dataFields: DataFieldDiff[];
}

function formatValue(val: string | number, unit?: string) {
  if (typeof val === 'number') {
    if (unit === '€') {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
    }
    if (unit === '%') {
      return `${val} %`;
    }
    return new Intl.NumberFormat('fr-FR').format(val) + (unit ? ` ${unit}` : '');
  }
  return String(val);
}

export const DataDiffViewer: React.FC<DataDiffViewerProps> = ({ dataFields }) => {
  if (!dataFields || dataFields.length === 0) {
    return (
      <div className="p-6 text-center text-[#486075] dark:text-[#9FB3C8] bg-[#F4F7FA] dark:bg-[#103049]/50 rounded-xl border border-dashed border-[#D8E2EC] dark:border-[#94B8D6]/25">
        Aucune donnée chiffrée structurée rattachée à ce dossier.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-white dark:bg-[#0B2438] shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[#004266] dark:text-[#7CC4EB] font-semibold">
              <th className="py-2.5 px-3">Indicateur &amp; Libellé</th>
              <th className="py-2.5 px-3">Catégorie</th>
              <th className="py-2.5 px-3">Valeur Initiale (Brouillon)</th>
              <th className="py-2.5 px-3 text-[#0B1F30] dark:text-white font-bold">Valeur Révisée (Checker)</th>
              <th className="py-2.5 px-3">Variation / Écart</th>
              <th className="py-2.5 px-3">Justification &amp; Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15">
            {dataFields.map((field) => {
              const isNum =
                typeof field.previousValue === 'number' && typeof field.currentValue === 'number';
              const diffNum = isNum
                ? (field.currentValue as number) - (field.previousValue as number)
                : 0;
              const pctDiff =
                isNum && (field.previousValue as number) !== 0
                  ? ((diffNum / (field.previousValue as number)) * 100).toFixed(1)
                  : null;

              const isPositive = diffNum > 0;
              const isIdentical = field.previousValue === field.currentValue;

              return (
                <tr key={field.id} className="hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/60 transition-colors">
                  <td className="py-3 px-3 font-semibold text-[#0B1F30] dark:text-white">
                    <div className="flex flex-col">
                      <span>{field.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        field.category === 'fiscal'
                          ? 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35'
                          : field.category === 'finance'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : field.category === 'juridique'
                              ? 'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30'
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                      }`}
                    >
                      {field.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[#486075] dark:text-[#9FB3C8] tabular-nums">
                    {formatValue(field.previousValue, field.unit)}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#004266] dark:text-[#7CC4EB] bg-[#004266]/5 dark:bg-[#3895C9]/10 tabular-nums">
                    {formatValue(field.currentValue, field.unit)}
                  </td>
                  <td className="py-3 px-3 tabular-nums">
                    {isIdentical ? (
                      <span className="inline-flex items-center gap-1 text-[#64748B] dark:text-[#9FB3C8] font-mono text-[11px]">
                        <Minus className="w-3 h-3" />
                        Inchangé
                      </span>
                    ) : isNum ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold">
                            <TrendingUp className="w-3 h-3" />+{diffNum.toLocaleString('fr-FR')}{' '}
                            {field.unit} ({pctDiff}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold">
                            <TrendingDown className="w-3 h-3" />
                            {diffNum.toLocaleString('fr-FR')} {field.unit} ({pctDiff}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FFF4E6] border border-[#F77F00]/35 text-[#B85A00] dark:bg-[#F77F00]/20 dark:border-[#F77F00]/35 dark:text-[#FFB35C] text-[11px] font-medium">
                        Texte modifié
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[#486075] dark:text-[#9FB3C8] max-w-xs text-[11px] leading-relaxed">
                    {field.notes ? (
                      <span className="flex items-start gap-1">
                        <Info className="w-3 h-3 text-[#64748B] shrink-0 mt-0.5" />
                        {field.notes}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] italic">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
