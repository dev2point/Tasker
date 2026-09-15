'use client';

import React from 'react';
import { AuditLogEntry } from '@/types/review';
import { ShieldCheck, Download, Clock, Globe, UserCheck, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditTrailViewerProps {
  auditTrail: AuditLogEntry[];
  dossierRef: string;
}

function getActionBadge(action: AuditLogEntry['action']) {
  switch (action) {
    case 'creation':
      return { label: 'Création initiale', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    case 'soumission_n1':
      return { label: 'Soumission N+1 (Maker)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'prise_en_charge':
      return { label: 'Prise en charge (Checker)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case 'verrouillage':
      return { label: 'Verrouillage Préventif', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'deverrouillage':
      return { label: 'Déverrouillage', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'amendement_texte':
      return { label: 'Amendement de texte', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'modification_chiffree':
      return { label: 'Modification chiffrée', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'demande_corrections':
      return { label: 'Demande de corrections', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    case 'validation_finale':
      return { label: 'Validation Finale', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'archivage':
      return { label: 'Archivage Définitif', color: 'bg-slate-200 text-slate-900 border-slate-400' };
    case 'requete_inter_pole':
      return { label: 'Passerelle Inter-Pôle', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    default:
      return { label: action, color: 'bg-slate-100 text-slate-800 border-slate-200' };
  }
}

export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ auditTrail, dossierRef }) => {
  const handleExportAudit = () => {
    const jsonStr = JSON.stringify(auditTrail, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${dossierRef}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner with Certifications */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200/90 text-slate-900 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              Journal d&apos;Audit Immuable &amp; Traçabilité Légale
            </span>
            <span className="text-xs text-slate-500">
              Chaque modification est horodatée à la seconde avec IP source et rôle certifié.
            </span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleExportAudit}
          className="h-8 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 text-xs gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Exporter le PV d&apos;Audit (.JSON)
        </Button>
      </div>

      {/* Audit Entries Timeline Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">Horodatage précis</th>
              <th className="py-2.5 px-3">Acteur &amp; Pôle</th>
              <th className="py-2.5 px-3">Adresse IP</th>
              <th className="py-2.5 px-3">Action Enregistrée</th>
              <th className="py-2.5 px-3">Détails &amp; Constats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditTrail.map((entry) => {
              const badge = getActionBadge(entry.action);
              const dateObj = new Date(entry.timestamp);
              const formattedDate = dateObj.toLocaleDateString('fr-FR');
              const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const ms = dateObj.getMilliseconds().toString().padStart(3, '0');

              return (
                <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formattedDate}</span>
                      <span className="font-bold text-slate-900">
                        {formattedTime}.{ms}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#BA5316] shrink-0" />
                        {entry.actorName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {entry.actorDepartment} • {entry.actorRole}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" />
                      {entry.ipAddress}
                    </span>
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-slate-700 leading-relaxed text-[11px]">
                    <div>{entry.details}</div>
                    {entry.fieldChanged && (
                      <div className="mt-1 font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                        <strong>{entry.fieldChanged}</strong> : {entry.oldValue} ➔ {entry.newValue}
                      </div>
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
