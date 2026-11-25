'use client';

import React from 'react';
import { AuditLogEntry } from '@/types/review';
import { ShieldCheck, Download, Clock, Globe, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditTrailViewerProps {
  auditTrail: AuditLogEntry[];
  dossierRef: string;
}

function getActionBadge(action: AuditLogEntry['action']) {
  switch (action) {
    case 'creation':
      return {
        label: 'Création initiale',
        color:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      };
    case 'soumission_n1':
      return {
        label: 'Soumission N+1 (Maker)',
        color:
          'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30',
      };
    case 'prise_en_charge':
      return {
        label: 'Prise en charge (Checker)',
        color:
          'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
      };
    case 'verrouillage':
      return {
        label: 'Verrouillage Préventif',
        color:
          'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35',
      };
    case 'deverrouillage':
      return {
        label: 'Déverrouillage',
        color:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#103049] dark:text-slate-300 dark:border-[#94B8D6]/25',
      };
    case 'amendement_texte':
      return {
        label: 'Amendement de texte',
        color:
          'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
      };
    case 'modification_chiffree':
      return {
        label: 'Modification chiffrée',
        color:
          'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30',
      };
    case 'demande_corrections':
      return {
        label: 'Demande de corrections',
        color:
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
      };
    case 'validation_finale':
      return {
        label: 'Validation Finale',
        color:
          'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/30 dark:text-emerald-200 dark:border-emerald-500/40',
      };
    case 'archivage':
      return {
        label: 'Archivage Définitif',
        color:
          'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      };
    case 'requete_inter_pole':
      return {
        label: 'Passerelle Inter-Pôle',
        color:
          'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35',
      };
    default:
      return {
        label: action,
        color:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#103049] dark:text-slate-300 dark:border-[#94B8D6]/25',
      };
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
    <div className="flex flex-col gap-3 text-[#0B1F30] dark:text-[#F1F5F9]">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#004266] dark:bg-[#103049] border border-[#00314D] dark:border-[#94B8D6]/25 text-white rounded-xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#FFB35C] shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white">
              Journal d&apos;Audit Immuable &amp; Traçabilité Légale
            </span>
            <span className="text-xs text-white/80">
              Chaque modification est horodatée à la seconde avec IP source et rôle certifié.
            </span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleExportAudit}
          className="h-8 bg-white/10 border-white/25 hover:bg-white/20 text-white hover:text-white text-xs gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#FFB35C]" />
          Exporter le PV d&apos;Audit (.JSON)
        </Button>
      </div>

      {/* Audit Entries Timeline Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-white dark:bg-[#0B2438] shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#EDF2F7] dark:bg-[#103049] border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[#004266] dark:text-[#7CC4EB] font-semibold">
              <th className="py-2.5 px-3">Horodatage précis</th>
              <th className="py-2.5 px-3">Acteur &amp; Pôle</th>
              <th className="py-2.5 px-3">Adresse IP</th>
              <th className="py-2.5 px-3">Action Enregistrée</th>
              <th className="py-2.5 px-3">Détails &amp; Constats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15">
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
                <tr key={entry.id} className="hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/60 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-[#486075] dark:text-[#9FB3C8] tabular-nums">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                      <span>{formattedDate}</span>
                      <span className="font-bold text-[#0B1F30] dark:text-white">
                        {formattedTime}.{ms}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#0B1F30] dark:text-white flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#F77F00] shrink-0" />
                        {entry.actorName}
                      </span>
                      <span className="text-[10px] text-[#486075] dark:text-[#9FB3C8]">
                        {entry.actorDepartment} • {entry.actorRole}
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-[#486075] dark:text-[#9FB3C8] tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#64748B]" />
                      {entry.ipAddress}
                    </span>
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-[#486075] dark:text-[#9FB3C8] leading-relaxed text-[11px]">
                    <div className="text-[#0B1F30] dark:text-[#F1F5F9]">{entry.details}</div>
                    {entry.fieldChanged && (
                      <div className="mt-1 font-mono text-[10px] text-[#0B1F30] dark:text-[#F1F5F9] bg-[#F4F7FA] dark:bg-[#103049] px-2 py-1 rounded border border-[#D8E2EC] dark:border-[#94B8D6]/25 inline-block">
                        <strong className="text-[#B85A00] dark:text-[#FFB35C]">{entry.fieldChanged}</strong> : {entry.oldValue} ➔ {entry.newValue}
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
