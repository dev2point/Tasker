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
} from 'lucide-react';
import { Task } from '@/types/task';
import { generateICalendar, downloadFile } from '@/lib/ical';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImportTasks: (tasks: Task[]) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onImportTasks,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-modal-title" className="text-base font-bold text-slate-900">
                Synchronisation & Sauvegarde
              </h2>
              <p className="text-xs text-slate-500">
                Export iCal et gestion des données
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Status alerts */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Blocks */}
        <div className="space-y-3 text-xs">
          {/* 1. iCalendar (.ics) */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900">Export Google Calendar & Apple</span>
              </div>
              <Badge variant="indigo" className="text-[10px]">
                .ICS
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Exportez toutes vos tâches avec leurs dates et heures pour les importer dans Google Agenda, Apple Calendar ou Outlook.
            </p>
            <Button
              onClick={handleExportICal}
              size="sm"
              className="w-full font-bold gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le fichier .ics</span>
            </Button>
          </div>

          {/* 2. JSON Backup */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-slate-900">Sauvegarde & Restauration</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                JSON
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Sauvegardez l’intégralité de vos données ou restaurez un fichier de tâches existant.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="font-bold gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter JSON</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="font-bold gap-1.5 bg-white hover:bg-slate-100"
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
        </div>
      </div>
    </div>
  );
};
