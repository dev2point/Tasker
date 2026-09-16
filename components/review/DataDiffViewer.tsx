'use client';

import React from 'react';
import { DataFieldDiff } from '@/types/review';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <div className="p-6 text-center text-slate-400 bg-emerald-950/40 rounded-xl border border-dashed border-emerald-500/30">
        Aucune donnée chiffrée structurée rattachée à ce dossier.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-emerald-500/30 bg-[#061A13]/90 shadow-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-emerald-950/70 border-b border-emerald-500/30 text-emerald-300 font-semibold">
              <th className="py-2.5 px-3">Indicateur & Libellé</th>
              <th className="py-2.5 px-3">Catégorie</th>
              <th className="py-2.5 px-3">Valeur Initiale (Brouillon)</th>
              <th className="py-2.5 px-3 text-white font-bold">Valeur Révisée (Checker)</th>
              <th className="py-2.5 px-3">Variation / Écart</th>
              <th className="py-2.5 px-3">Justification & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10">
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
              const isNegative = diffNum < 0;
              const isIdentical = field.previousValue === field.currentValue;

              return (
                <tr key={field.id} className="hover:bg-emerald-500/10 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">
                    <div className="flex flex-col">
                      <span>{field.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        field.category === 'fiscal'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : field.category === 'finance'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : field.category === 'juridique'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}
                    >
                      {field.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {formatValue(field.previousValue, field.unit)}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-300 bg-emerald-500/10">
                    {formatValue(field.currentValue, field.unit)}
                  </td>
                  <td className="py-3 px-3">
                    {isIdentical ? (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                        <Minus className="w-3 h-3" />
                        Inchangé
                      </span>
                    ) : isNum ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />+{diffNum.toLocaleString('fr-FR')}{' '}
                            {field.unit} ({pctDiff}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                            {diffNum.toLocaleString('fr-FR')} {field.unit} ({pctDiff}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                        Texte modifié
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs text-[11px] leading-relaxed">
                    {field.notes ? (
                      <span className="flex items-start gap-1">
                        <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        {field.notes}
                      </span>
                    ) : (
                      <span className="text-slate-600 italic">-</span>
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
