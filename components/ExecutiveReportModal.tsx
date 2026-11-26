'use client';

import React, { useState, useMemo, useRef } from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  X,
  Calendar,
  Layers,
  Filter,
  Building2,
  Scale,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { Task, Category } from '@/types/task';
import { ReviewDossier, Department } from '@/types/review';
import { User } from '@/types/user';
import {
  ReportConfig,
  ReportPeriod,
  ReportType,
  calculateReportMetrics,
  generateStandaloneHTMLReport,
  generateExecutiveMarkdownReport,
  REPORT_PERIOD_LABELS,
  REPORT_TYPE_LABELS,
} from '@/lib/report-generator';
import { downloadFile } from '@/lib/ical';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDueDateFrench } from '@/lib/reminders';

export interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  categories: Category[];
  dossiers: ReviewDossier[];
  currentUser?: User | null;
  initialType?: ReportType;
  initialDepartment?: 'Tous' | Department;
  isSidebarCollapsed?: boolean;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  categories,
  dossiers,
  currentUser,
  initialType = 'executive_board',
  initialDepartment = 'Tous',
  isSidebarCollapsed = false,
}) => {
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [period, setPeriod] = useState<ReportPeriod>('current_month');
  const [department, setDepartment] = useState<'Tous' | Department>(initialDepartment);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRiskAnalysis, setIncludeRiskAnalysis] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  const [includeAIRecommendations, setIncludeAIRecommendations] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [authorName, setAuthorName] = useState(
    currentUser?.name || 'Direction de la Qualité & Supervision'
  );
  const [previewMode, setPreviewMode] = useState<'paper' | 'dark'>('paper');
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isExportingServerPdf, setIsExportingServerPdf] = useState(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);

  const printableRef = useRef<HTMLDivElement>(null);

  const config: ReportConfig = useMemo(
    () => ({
      period,
      department,
      reportType,
      includeCharts,
      includeRiskAnalysis,
      includeAuditTrail,
      includeAIRecommendations,
      customTitle: customTitle.trim() || undefined,
      authorName: authorName.trim() || undefined,
    }),
    [
      period,
      department,
      reportType,
      includeCharts,
      includeRiskAnalysis,
      includeAuditTrail,
      includeAIRecommendations,
      customTitle,
      authorName,
    ]
  );

  const metrics = useMemo(
    () => calculateReportMetrics(tasks, categories, dossiers, config),
    [tasks, categories, dossiers, config]
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    soundManager.playClickSound();
    window.print();
  };

  const handleDownloadHTML = () => {
    try {
      soundManager.playClickSound();
      const html = generateStandaloneHTMLReport(metrics, config);
      const filename = `rapport-${reportType}-${period}-${new Date().toISOString().split('T')[0]}.html`;
      downloadFile(html, filename, 'text/html;charset=utf-8');
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur téléchargement HTML:', err);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      soundManager.playClickSound();
      const md = generateExecutiveMarkdownReport(metrics, config);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erreur copie Markdown:', err);
    }
  };

  const handleDownloadServerPdf = async () => {
    setPdfExportError(null);
    setIsExportingServerPdf(true);
    soundManager.playClickSound();
    try {
      const res = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics, config }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPdfExportError(err?.error || 'Impossible de générer le PDF serveur.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${reportType}-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setPdfExportError('Erreur réseau lors de la génération du PDF serveur.');
    } finally {
      setIsExportingServerPdf(false);
    }
  };

  const activeTitle = customTitle.trim() || REPORT_TYPE_LABELS[reportType];

  return (
    <ModalPortal>
      <div
        id="executive-report-modal-backdrop"
        className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div
        className="bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#0B1F30] dark:text-slate-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================== */}
        {/* MODAL HEADER                                                        */}
        {/* =================================================================== */}
        <div className="px-5 py-4 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between bg-[#F4F7FA] dark:bg-[#061826] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/35 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#0B1F30] dark:text-white tracking-tight">
                  Génération de Rapports &amp; Synthèse Comité
                </h2>
                <Badge variant="orange" className="text-[10px] font-bold">
                  Document Officiel
                </Badge>
              </div>
              <p className="text-xs text-[#486075] dark:text-[#9FB3C8] truncate">
                Synthèse pour comités de direction, revues de pôle et export PDF certifié
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle: Paper Sheet vs Dark Immersive */}
            <div className="hidden sm:flex items-center p-1 bg-[#EDF2F7] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode('paper')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  previewMode === 'paper'
                    ? 'bg-[#004266] dark:bg-[#3895C9] text-white dark:text-[#061826] font-bold shadow-xs'
                    : 'text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white'
                }`}
              >
                Aperçu A4 Réel
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('dark')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  previewMode === 'dark'
                    ? 'bg-[#004266] dark:bg-[#3895C9] text-white dark:text-[#061826] font-bold shadow-xs'
                    : 'text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white'
                }`}
              >
                Mode Sombre
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 rounded-xl text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MODAL ACTION BAR                                                    */}
        {/* =================================================================== */}
        <div className="px-5 py-2.5 bg-white dark:bg-[#0B2438] border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#486075] dark:text-slate-300">
            <span className="font-semibold text-[#004266] dark:text-[#7CC4EB]">Périmètre actif :</span>
            <span className="font-bold text-[#0B1F30] dark:text-white">{metrics.departmentLabel}</span>
            <span className="text-[#8599AD]">·</span>
            <span className="text-[#486075] dark:text-[#9FB3C8]">{metrics.periodLabel}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleCopyMarkdown}
              className="text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier Markdown'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleDownloadHTML}
              className="text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloadSuccess ? 'Téléchargé !' : 'Télécharger HTML'}</span>
            </Button>

            <Button
              type="button"
              variant="soft"
              size="xs"
              disabled={isExportingServerPdf}
              onClick={handleDownloadServerPdf}
              className="text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingServerPdf ? 'Génération...' : 'PDF Serveur'}</span>
            </Button>

            <Button
              type="button"
              variant="accent"
              size="xs"
              onClick={handlePrint}
              className="font-bold text-xs rounded-xl gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </Button>
          </div>
          {pdfExportError && (
            <div className="w-full text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/35 rounded-lg px-3 py-1.5">
              {pdfExportError}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* MAIN BODY: 2 COLUMNS (CONTROLS & PREVIEW)                           */}
        {/* =================================================================== */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* LEFT COLUMN (4 cols): Filter & Configuration Parameters */}
          <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-[#D8E2EC] dark:border-[#94B8D6]/18 overflow-y-auto custom-scrollbar space-y-5 bg-[#F4F7FA] dark:bg-[#061826]">
            {/* Report Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                Type de Rapport
              </label>
              <div className="space-y-1.5">
                {(['executive_board', 'review_progress', 'operational_tasks'] as ReportType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      soundManager.playClickSound();
                      setReportType(t);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      reportType === t
                        ? 'bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border-[#004266]/35 dark:border-[#3895C9]/50 ring-1 ring-[#004266]/20 dark:ring-[#3895C9]/30'
                        : 'bg-white dark:bg-[#0B2438] text-[#486075] dark:text-slate-300 border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]'
                    }`}
                  >
                    <span>{REPORT_TYPE_LABELS[t]}</span>
                    {reportType === t && <Check className="w-3.5 h-3.5 text-[#F77F00] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                Période d&apos;analyse
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/40 dark:focus:ring-[#3895C9]/40 outline-hidden font-medium"
              >
                {Object.entries(REPORT_PERIOD_LABELS).map(([k, label]) => (
                  <option key={k} value={k} className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Department / Pôle Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                Périmètre Métier
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/40 dark:focus:ring-[#3895C9]/40 outline-hidden font-medium"
              >
                <option value="Tous" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                  Cabinet Global (Tous les pôles)
                </option>
                <option value="Fiscalité" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                  Pôle Fiscalité
                </option>
                <option value="Comptabilité" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                  Pôle Comptabilité
                </option>
                <option value="Juridique" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                  Pôle Juridique
                </option>
                <option value="Recherche & Innovation" className="bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-white">
                  Pôle R&amp;D / Innovation
                </option>
              </select>
            </div>

            {/* Inclusion Options */}
            <div className="space-y-2 pt-3 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1">
                Sections Incluses
              </label>
              <label className="flex items-center gap-2.5 text-xs text-[#0B1F30] dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded accent-[#004266] dark:accent-[#3895C9] w-3.5 h-3.5"
                />
                <span>Indicateurs de performance &amp; KPIs</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-[#0B1F30] dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRiskAnalysis}
                  onChange={(e) => setIncludeRiskAnalysis(e.target.checked)}
                  className="rounded accent-[#004266] dark:accent-[#3895C9] w-3.5 h-3.5"
                />
                <span>Matrice des risques &amp; Points de vigilance</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-[#0B1F30] dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuditTrail}
                  onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                  className="rounded accent-[#004266] dark:accent-[#3895C9] w-3.5 h-3.5"
                />
                <span>Traçabilité &amp; Circuit de revue Maker-Checker</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-[#0B1F30] dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAIRecommendations}
                  onChange={(e) => setIncludeAIRecommendations(e.target.checked)}
                  className="rounded accent-[#004266] dark:accent-[#3895C9] w-3.5 h-3.5"
                />
                <span>Recommandations d&apos;orientation stratégique</span>
              </label>
            </div>

            {/* Report Metadata Customization */}
            <div className="space-y-3 pt-3 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                Personnalisation
              </label>
              <div>
                <span className="block text-[11px] text-[#486075] dark:text-[#9FB3C8] mb-1">Titre personnalisé :</span>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={REPORT_TYPE_LABELS[reportType]}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white placeholder:text-[#8599AD] focus:ring-1 focus:ring-[#004266] dark:focus:ring-[#3895C9] outline-hidden"
                />
              </div>
              <div>
                <span className="block text-[11px] text-[#486075] dark:text-[#9FB3C8] mb-1">Auteur / Signataire :</span>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Direction de la Qualité"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white placeholder:text-[#8599AD] focus:ring-1 focus:ring-[#004266] dark:focus:ring-[#3895C9] outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (8 cols): Interactive Live Report Preview */}
          <div className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#EDF2F7] dark:bg-[#04101A]/60">
            {/* The Printable Container */}
            <div
              id="printable-report-content"
              ref={printableRef}
              className={`w-full max-w-4xl mx-auto rounded-2xl transition-all shadow-xl ${
                previewMode === 'paper'
                  ? 'bg-white text-[#0B1F30] p-8 sm:p-10 border border-[#D8E2EC] font-sans'
                  : 'bg-[#0B2438] text-slate-100 p-6 sm:p-8 border border-[#94B8D6]/25'
              }`}
            >
              {/* Document Header */}
              <div
                className={`pb-5 mb-6 border-b-2 ${
                  previewMode === 'paper' ? 'border-[#004266]' : 'border-[#3895C9]/40'
                } flex items-start justify-between gap-4 flex-wrap`}
              >
                <div>
                  <div
                    className={`text-[11px] font-black uppercase tracking-widest ${
                      previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'
                    }`}
                  >
                    LA MAISON DE LA FISCALITÉ · DIRECTION GÉNÉRALE
                  </div>
                  <h1
                    className={`text-xl sm:text-2xl font-black mt-1 tracking-tight ${
                      previewMode === 'paper' ? 'text-[#0B1F30]' : 'text-white'
                    }`}
                  >
                    {activeTitle}
                  </h1>
                  <div
                    className={`text-xs mt-1 font-medium ${
                      previewMode === 'paper' ? 'text-[#486075]' : 'text-slate-300'
                    }`}
                  >
                    Périmètre : <strong>{metrics.departmentLabel}</strong> · Période :{' '}
                    <strong>{metrics.periodLabel}</strong>
                  </div>
                </div>

                <div
                  className={`text-right text-xs shrink-0 ${
                    previewMode === 'paper' ? 'text-[#486075]' : 'text-[#9FB3C8]'
                  }`}
                >
                  <div>
                    Émis le :{' '}
                    <strong className={previewMode === 'paper' ? 'text-[#0B1F30]' : 'text-slate-200'}>
                      {metrics.generatedAtFormatted}
                    </strong>
                  </div>
                  <div>
                    Signataire :{' '}
                    <strong className={previewMode === 'paper' ? 'text-[#0B1F30]' : 'text-slate-200'}>
                      {authorName}
                    </strong>
                  </div>
                  <div
                    className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      previewMode === 'paper'
                        ? 'bg-[#004266]/10 text-[#004266] border border-[#004266]/20'
                        : 'bg-[#3895C9]/20 text-[#7CC4EB] border border-[#3895C9]/35'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Conformité &amp; Traçabilité Validées</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Executive KPI Cards */}
              {includeCharts && (
                <div className="mb-7">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                      previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'
                    }`}
                  >
                    1. Indicateurs Clés de Pilotage (KPIs)
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Completion rate */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-[#F4F7FA] border-[#D8E2EC]'
                          : 'bg-[#061826] border-[#94B8D6]/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-[#486075] dark:text-[#9FB3C8] tracking-wider">
                        Complétion Globale
                      </span>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {metrics.completionRate}%
                      </div>
                      <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8] block">
                        {metrics.completedTasks} sur {metrics.totalTasks} tâches
                      </span>
                    </div>

                    {/* Review Dossiers */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-[#F4F7FA] border-[#D8E2EC]'
                          : 'bg-[#061826] border-[#94B8D6]/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-[#486075] dark:text-[#9FB3C8] tracking-wider">
                        Dossiers Validés
                      </span>
                      <div
                        className={`text-2xl font-black mt-1 ${
                          previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'
                        }`}
                      >
                        {metrics.validatedDossiers}
                      </div>
                      <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8] block">
                        {metrics.totalDossiers} dossiers suivis
                      </span>
                    </div>

                    {/* Overdue Tasks */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-[#F4F7FA] border-[#D8E2EC]'
                          : 'bg-[#061826] border-[#94B8D6]/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-[#486075] dark:text-[#9FB3C8] tracking-wider">
                        Tâches en Retard
                      </span>
                      <div
                        className={`text-2xl font-black mt-1 ${
                          metrics.overdueTasks > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {metrics.overdueTasks}
                      </div>
                      <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8] block">
                        {metrics.urgentTasksCount} urgentes
                      </span>
                    </div>

                    {/* Gateway Requests */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-[#F4F7FA] border-[#D8E2EC]'
                          : 'bg-[#061826] border-[#94B8D6]/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-[#486075] dark:text-[#9FB3C8] tracking-wider">
                        Requêtes Inter-Pôles
                      </span>
                      <div
                        className={`text-2xl font-black mt-1 ${
                          metrics.blockedInterDepRequests > 0
                            ? 'text-[#F77F00]'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {metrics.totalInterDepRequests}
                      </div>
                      <span className="text-[11px] text-[#486075] dark:text-[#9FB3C8] block">
                        {metrics.blockedInterDepRequests} bloquante(s)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Department Breakdown Table */}
              <div className="mb-7">
                <h3
                  className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                    previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'
                  }`}
                >
                  2. Ventilation Opérationnelle par Département
                </h3>

                <div
                  className={`rounded-xl border overflow-hidden ${
                    previewMode === 'paper' ? 'border-[#D8E2EC]' : 'border-[#94B8D6]/20'
                  }`}
                >
                  <table className="w-full text-xs text-left">
                    <thead
                      className={`text-[11px] font-bold uppercase border-b ${
                        previewMode === 'paper'
                          ? 'bg-[#F4F7FA] text-[#0B1F30] border-[#D8E2EC]'
                          : 'bg-[#061826] text-slate-200 border-[#94B8D6]/20'
                      }`}
                    >
                      <tr>
                        <th className="py-2.5 px-3">Département</th>
                        <th className="py-2.5 px-3 text-center">Tâches</th>
                        <th className="py-2.5 px-3 text-center">Achevées</th>
                        <th className="py-2.5 px-3 text-center">Retards</th>
                        <th className="py-2.5 px-3 text-center">Taux</th>
                        <th className="py-2.5 px-3 text-center">Dossiers</th>
                        <th className="py-2.5 px-3 text-center">Blocages</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        previewMode === 'paper'
                          ? 'divide-[#D8E2EC] text-[#0B1F30]'
                          : 'divide-[#94B8D6]/15 text-slate-200'
                      }`}
                    >
                      {metrics.departments.map((dept) => (
                        <tr key={dept.department}>
                          <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                            {dept.department === 'Fiscalité' && <Calculator className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />}
                            {dept.department === 'Comptabilité' && <Building2 className="w-3.5 h-3.5 text-[#F77F00]" />}
                            {dept.department === 'Juridique' && <Scale className="w-3.5 h-3.5 text-indigo-500" />}
                            {dept.department === 'Recherche & Innovation' && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                            <span>{dept.department}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">{dept.totalTasks}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {dept.completedTasks}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-center font-bold ${
                              dept.overdueTasks > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#8599AD]'
                            }`}
                          >
                            {dept.overdueTasks}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {dept.completionRate}%
                          </td>
                          <td className="py-2.5 px-3 text-center">{dept.totalDossiers}</td>
                          <td
                            className={`py-2.5 px-3 text-center font-bold ${
                              dept.blockedRequests > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#8599AD]'
                            }`}
                          >
                            {dept.blockedRequests}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Maker-Checker Circuit & Review Status */}
              {includeAuditTrail && (
                <div className="mb-7">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                      previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'
                    }`}
                  >
                    3. État du Circuit de Validation (Maker-Checker)
                  </h3>

                  <div
                    className={`p-4 rounded-xl border space-y-2 text-xs ${
                      previewMode === 'paper'
                        ? 'bg-[#F4F7FA] border-[#D8E2EC] text-[#486075]'
                        : 'bg-[#061826] border-[#94B8D6]/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span>
                        Dossiers en révision active par les managers :{' '}
                        <strong className={previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'}>
                          {metrics.dossiersInProgress}
                        </strong>
                      </span>
                      <span>
                        Dossiers en attente de corrections collaborateur :{' '}
                        <strong
                          className={
                            metrics.dossiersNeedCorrections > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {metrics.dossiersNeedCorrections}
                        </strong>
                      </span>
                      <span>
                        Dossiers verrouillés (Audit immuable) :{' '}
                        <strong className="text-[#F77F00]">{metrics.lockedDossiers}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Risk Analysis & Vigilance Points */}
              {includeRiskAnalysis && metrics.criticalTasks.length > 0 && (
                <div className="mb-7">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                      previewMode === 'paper' ? 'text-rose-700' : 'text-rose-400'
                    }`}
                  >
                    4. Points de Vigilance &amp; Risques Opérationnels
                  </h3>

                  <div className="space-y-2">
                    {metrics.criticalTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border-l-4 border-l-rose-500 text-xs flex items-center justify-between gap-3 ${
                          previewMode === 'paper'
                            ? 'bg-rose-50/70 border border-rose-200 text-[#0B1F30]'
                            : 'bg-rose-950/35 border border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{t.title}</span>
                          <span className="text-[11px] opacity-80">
                            Échéance : {formatDueDateFrench(t.dueDate)} · Priorité : {t.priority.toUpperCase()}
                          </span>
                        </div>
                        <Badge
                          variant="destructive"
                          className="text-[10px] font-bold bg-rose-600 text-white border-rose-600 shrink-0"
                        >
                          Critique
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Strategic Recommendations */}
              {includeAIRecommendations && (
                <div className="mb-7">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                      previewMode === 'paper' ? 'text-[#004266]' : 'text-[#7CC4EB]'
                    }`}
                  >
                    5. Recommandations Stratégiques pour le Comité
                  </h3>

                  <div
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      previewMode === 'paper'
                        ? 'bg-[#EBF4FA]/60 border-[#004266]/20 text-[#0B1F30]'
                        : 'bg-[#061826] border-[#3895C9]/30 text-slate-200'
                    }`}
                  >
                    <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                      {metrics.recommendations.map((rec, i) => (
                        <li key={i} className="leading-relaxed font-medium">
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Document Footer */}
              <div
                className={`pt-5 border-t text-[11px] flex items-center justify-between flex-wrap gap-2 ${
                  previewMode === 'paper' ? 'border-[#D8E2EC] text-[#486075]' : 'border-[#94B8D6]/20 text-[#9FB3C8]'
                }`}
              >
                <span>
                  La Maison de la Fiscalité · Plateforme Planit · Document certifié conforme
                </span>
                <span>Page 1 / 1 · Généré le {metrics.generatedAtFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
