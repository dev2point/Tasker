'use client';

import React, { useRef, useState } from 'react';
import {
  Calendar,
  Download,
  Upload,
  FileJson,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  Smartphone,
  Building,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import { Task } from '@/types/task';
import { generateICalendar, downloadFile } from '@/lib/ical';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImportTasks: (tasks: Task[]) => void;
  onOpenM365Modal?: () => void;
  onOpenReportModal?: () => void;
  isSidebarCollapsed?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onImportTasks,
  onOpenM365Modal,
  onOpenReportModal,
  isSidebarCollapsed = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleExportICal = () => {
    try {
      const icsContent = generateICalendar(tasks);
      const filename = `planit-tasks-${new Date().toISOString().split('T')[0]}.ics`;
      downloadFile(icsContent, filename, 'text/calendar;charset=utf-8');
      setSuccessMsg('Fichier iCalendar (.ics) généré et téléchargé !');
      soundManager.playClickSound();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Erreur lors de la génération iCal.');
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonContent = JSON.stringify(tasks, null, 2);
      const filename = `planit-backup-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonContent, filename, 'application/json');
      setSuccessMsg('Sauvegarde JSON exportée avec succès !');
      soundManager.playClickSound();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Erreur lors de l’export JSON.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          onImportTasks(imported);
          setSuccessMsg(`${imported.length} tâches importées avec succès !`);
          soundManager.playCompleteSound();
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1500);
        } else {
          setErrorMsg('Le fichier sélectionné ne contient pas une liste valide de tâches.');
        }
      } catch {
        setErrorMsg('Format de fichier JSON invalide.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-[#0B1F30] dark:text-slate-100 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF4E8] dark:bg-[#F77F00]/20 border border-[#F77F00]/30 text-[#DE7200] dark:text-[#FFB35C] flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base font-bold text-[#0B1F30] dark:text-white">
                Synchronisation &amp; Sauvegarde
              </h2>
              <p className="text-xs text-[#486075] dark:text-slate-300">
                Export iCal et gestion des données
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Fermer"
            className="cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Status alerts */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-500/40 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Blocks */}
        <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* 0a. Executive PDF & Committee Reports */}
          {onOpenReportModal && (
            <div className="p-4 rounded-2xl border border-[#004266]/25 dark:border-[#3895C9]/40 bg-[#F4F7FA] dark:bg-[#061826]/65 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center border border-[#004266]/20 dark:border-[#3895C9]/35 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[#0B1F30] dark:text-white truncate">Rapport Exécutif &amp; Synthèse Comité</span>
                </div>
                <Badge variant="orange" className="text-[9px] font-bold shrink-0">
                  PDF Officiel
                </Badge>
              </div>
              <p className="text-[#486075] dark:text-slate-300 leading-relaxed text-[11px]">
                Générez la synthèse consolidée pour les comités de direction, la revue d&apos;avancement des pôles et imprimez directement au format A4 certifié.
              </p>
              <Button
                variant="accent"
                onClick={() => {
                  onClose();
                  onOpenReportModal();
                }}
                size="sm"
                className="w-full font-bold gap-2 shadow-sm cursor-pointer h-8 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Ouvrir le Générateur de Rapports PDF</span>
              </Button>
            </div>
          )}

          {/* 0b. Microsoft 365 Ecosystem */}
          {onOpenM365Modal && (
            <div className="p-4 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center border border-[#004266]/20 dark:border-[#3895C9]/35 shrink-0">
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[#0B1F30] dark:text-white truncate">Écosystème Microsoft 365</span>
                </div>
                <Badge variant="default" className="text-[9px] font-bold shrink-0">
                  Excel • Word • Outlook
                </Badge>
              </div>
              <p className="text-[#486075] dark:text-slate-300 leading-relaxed text-[11px]">
                Générez des classeurs Excel formatés (.xlsx), des rapports Word officiels (.docx) et synchronisez avec Outlook &amp; OneDrive.
              </p>
              <Button
                variant="default"
                onClick={() => {
                  onClose();
                  onOpenM365Modal();
                }}
                size="sm"
                className="w-full font-bold gap-2 shadow-sm cursor-pointer h-8 text-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ouvrir le Centre Microsoft 365</span>
              </Button>
            </div>
          )}

          {/* 1. iCalendar (.ics) */}
          <div className="p-4 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F77F00]" />
                <span className="font-bold text-[#0B1F30] dark:text-white">Export Google Calendar &amp; Apple</span>
              </div>
              <Badge variant="default" className="text-[10px] font-bold">
                .ICS
              </Badge>
            </div>
            <p className="text-[#486075] dark:text-slate-300 leading-relaxed">
              Exportez toutes vos tâches avec leurs dates et heures pour les importer dans Google Agenda, Apple Calendar ou Outlook.
            </p>
            <Button
              variant="default"
              onClick={handleExportICal}
              size="sm"
              className="w-full font-bold gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le fichier .ics</span>
            </Button>
          </div>

          {/* 2. JSON Backup */}
          <div className="p-4 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB]" />
                <span className="font-bold text-[#0B1F30] dark:text-white">Sauvegarde &amp; Restauration</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                JSON
              </Badge>
            </div>
            <p className="text-[#486075] dark:text-slate-300 leading-relaxed">
              Sauvegardez l’intégralité de vos données ou restaurez un fichier de tâches existant.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="font-bold gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter JSON</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="font-bold gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer JSON</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 3. Local IndexedDB & Offline Engine */}
          <div className="p-3.5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center shrink-0 border border-[#004266]/20 dark:border-[#3895C9]/30">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[#0B1F30] dark:text-white text-xs">Moteur Local IndexedDB &amp; PWA</span>
                  <Badge variant="success" className="text-[9px] py-0 px-1.5">
                    Actif
                  </Badge>
                </div>
                <p className="text-[11px] text-[#486075] dark:text-slate-300">
                  Stockage structuré local &amp; mode hors-ligne PWA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#004266] dark:text-[#7CC4EB] bg-white dark:bg-[#0B2438] px-2.5 py-1 rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 shrink-0 tabular-nums">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{tasks.length} tâches</span>
            </div>
          </div>

          {/* 4. PostgreSQL (Supabase) + Drizzle ORM */}
          <div className="p-3.5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF4E8] dark:bg-[#F77F00]/20 text-[#DE7200] dark:text-[#FFB35C] flex items-center justify-center shrink-0 border border-[#F77F00]/30">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[#0B1F30] dark:text-white text-xs">PostgreSQL Supabase (Drizzle ORM)</span>
                  <Badge variant="orange" className="text-[9px] py-0 px-1.5 font-bold">
                    Schéma Prêt
                  </Badge>
                </div>
                <p className="text-[11px] text-[#486075] dark:text-slate-300">
                  Support RBAC multi-utilisateurs &amp; montée en charge
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
