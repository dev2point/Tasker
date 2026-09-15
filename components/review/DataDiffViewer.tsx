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
      <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        Aucune donnée chiffrée structurée rattachée à ce dossier.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">Indicateur & Libellé</th>
              <th className="py-2.5 px-3">Catégorie</th>
              <th className="py-2.5 px-3">Valeur Initiale (Brouillon)</th>
              <th className="py-2.5 px-3 text-slate-900 font-bold">Valeur Révisée (Checker)</th>
              <th className="py-2.5 px-3">Variation / Écart</th>
              <th className="py-2.5 px-3">Justification & Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                <tr key={field.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div className="flex flex-col">
                      <span>{field.label}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        field.category === 'fiscal'
                          ? 'bg-amber-100 text-amber-800'
                          : field.category === 'finance'
                            ? 'bg-emerald-100 text-emerald-800'
                            : field.category === 'juridique'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {field.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {formatValue(field.previousValue, field.unit)}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 bg-emerald-50/30">
                    {formatValue(field.currentValue, field.unit)}
                  </td>
                  <td className="py-3 px-3">
                    {isIdentical ? (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                        <Minus className="w-3 h-3" />
                        Inchangé
                      </span>
                    ) : isNum ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {isPositive ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                            <TrendingUp className="w-3 h-3" />+{diffNum.toLocaleString('fr-FR')}{' '}
                            {field.unit} ({pctDiff}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">
                            <TrendingDown className="w-3 h-3" />
                            {diffNum.toLocaleString('fr-FR')} {field.unit} ({pctDiff}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-medium">
                        Texte modifié
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs text-[11px] leading-relaxed">
                    {field.notes ? (
                      <span className="flex items-start gap-1">
                        <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        {field.notes}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic">-</span>
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
