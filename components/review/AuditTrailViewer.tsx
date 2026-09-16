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
      return { label: 'Création initiale', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'soumission_n1':
      return { label: 'Soumission N+1 (Maker)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 'prise_en_charge':
      return { label: 'Prise en charge (Checker)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    case 'verrouillage':
      return { label: 'Verrouillage Préventif', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'deverrouillage':
      return { label: 'Déverrouillage', color: 'bg-emerald-950 text-slate-300 border-emerald-500/20' };
    case 'amendement_texte':
      return { label: 'Amendement de texte', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    case 'modification_chiffree':
      return { label: 'Modification chiffrée', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    case 'demande_corrections':
      return { label: 'Demande de corrections', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    case 'validation_finale':
      return { label: 'Validation Finale', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40' };
    case 'archivage':
      return { label: 'Archivage Définitif', color: 'bg-slate-800 text-slate-200 border-slate-700' };
    case 'requete_inter_pole':
      return { label: 'Passerelle Inter-Pôle', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    default:
      return { label: action, color: 'bg-emerald-950 text-slate-300 border-emerald-500/30' };
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
    <div className="flex flex-col gap-3 text-slate-100">
      {/* Top Banner with Certifications */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-emerald-950/80 border border-emerald-500/30 text-white rounded-xl shadow-md">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white">
              Journal d&apos;Audit Immuable &amp; Traçabilité Légale
            </span>
            <span className="text-xs text-slate-300">
              Chaque modification est horodatée à la seconde avec IP source et rôle certifié.
            </span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleExportAudit}
          className="h-8 bg-emerald-950/60 border-emerald-500/30 hover:bg-emerald-500/20 text-slate-200 text-xs gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          Exporter le PV d&apos;Audit (.JSON)
        </Button>
      </div>

      {/* Audit Entries Timeline Table */}
      <div className="overflow-x-auto rounded-xl border border-emerald-500/30 bg-[#061A13]/90 shadow-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-emerald-950/70 border-b border-emerald-500/30 text-emerald-300 font-semibold">
              <th className="py-2.5 px-3">Horodatage précis</th>
              <th className="py-2.5 px-3">Acteur &amp; Pôle</th>
              <th className="py-2.5 px-3">Adresse IP</th>
              <th className="py-2.5 px-3">Action Enregistrée</th>
              <th className="py-2.5 px-3">Détails &amp; Constats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10">
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
                <tr key={entry.id} className="hover:bg-emerald-500/10 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{formattedDate}</span>
                      <span className="font-bold text-white">
                        {formattedTime}.{ms}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-amber-400 shrink-0" />
                        {entry.actorName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {entry.actorDepartment} • {entry.actorRole}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500" />
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

                  <td className="py-2.5 px-3 text-slate-300 leading-relaxed text-[11px]">
                    <div>{entry.details}</div>
                    {entry.fieldChanged && (
                      <div className="mt-1 font-mono text-[10px] text-slate-300 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30 inline-block">
                        <strong className="text-amber-300">{entry.fieldChanged}</strong> : {entry.oldValue} ➔ {entry.newValue}
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
