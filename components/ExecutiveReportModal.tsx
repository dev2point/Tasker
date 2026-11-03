'use client';

import React, { useState, useMemo, useRef } from 'react';
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

  const activeTitle = customTitle.trim() || REPORT_TYPE_LABELS[reportType];

  return (
    <div
      id="executive-report-modal-backdrop"
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#061A13]/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-500/30 text-slate-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================== */}
        {/* MODAL HEADER                                                        */}
        {/* =================================================================== */}
        <div className="px-5 py-4 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shadow-md shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Génération de Rapports &amp; Synthèse Comité
                </h2>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  Document Officiel
                </Badge>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Synthèse pour comités de direction, revues de pôle et export PDF certifié
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle: Paper Sheet vs Dark Immersive */}
            <div className="hidden sm:flex items-center p-1 bg-emerald-950/80 border border-emerald-500/20 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode('paper')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  previewMode === 'paper'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Aperçu A4 Réel
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('dark')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  previewMode === 'dark'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mode Émeraude
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MODAL ACTION BAR                                                    */}
        {/* =================================================================== */}
        <div className="px-5 py-2.5 bg-emerald-950/60 border-b border-emerald-500/20 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-emerald-400">Périmètre actif :</span>
            <span className="font-medium text-white">{metrics.departmentLabel}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{metrics.periodLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleCopyMarkdown}
              className="border-emerald-500/30 bg-emerald-950/60 text-slate-200 hover:bg-emerald-500/20 text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier Markdown'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleDownloadHTML}
              className="border-emerald-500/30 bg-emerald-950/60 text-slate-200 hover:bg-emerald-500/20 text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              {downloadSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{downloadSuccess ? 'Téléchargé !' : 'Télécharger HTML'}</span>
            </Button>

            <Button
              type="button"
              size="xs"
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </Button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* MAIN BODY: 2 COLUMNS (CONTROLS & PREVIEW)                           */}
        {/* =================================================================== */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* LEFT COLUMN (4 cols): Filter & Configuration Parameters */}
          <div className="lg:col-span-4 p-5 border-r border-emerald-500/20 overflow-y-auto custom-scrollbar space-y-5 bg-[#051610]/60">
            {/* Report Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
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
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-emerald-950/30 text-slate-400 border-emerald-500/15 hover:text-white hover:bg-emerald-500/10'
                    }`}
                  >
                    <span>{REPORT_TYPE_LABELS[t]}</span>
                    {reportType === t && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                Période d&apos;analyse
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
              >
                {Object.entries(REPORT_PERIOD_LABELS).map(([k, label]) => (
                  <option key={k} value={k} className="bg-slate-900 text-white">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Department / Pôle Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                Périmètre Métier
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
              >
                <option value="Tous" className="bg-slate-900 text-white">
                  Cabinet Global (Tous les pôles)
                </option>
                <option value="Fiscalité" className="bg-slate-900 text-white">
                  Pôle Fiscalité
                </option>
                <option value="Comptabilité" className="bg-slate-900 text-white">
                  Pôle Comptabilité
                </option>
                <option value="Juridique" className="bg-slate-900 text-white">
                  Pôle Juridique
                </option>
                <option value="Recherche & Innovation" className="bg-slate-900 text-white">
                  Pôle R&amp;D / Innovation
                </option>
              </select>
            </div>

            {/* Inclusion Options */}
            <div className="space-y-2 pt-2 border-t border-emerald-500/15">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                Sections Incluses
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded accent-emerald-400 w-3.5 h-3.5"
                />
                <span>Indicateurs de performance &amp; KPIs</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRiskAnalysis}
                  onChange={(e) => setIncludeRiskAnalysis(e.target.checked)}
                  className="rounded accent-emerald-400 w-3.5 h-3.5"
                />
                <span>Matrice des risques &amp; Points de vigilance</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuditTrail}
                  onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                  className="rounded accent-emerald-400 w-3.5 h-3.5"
                />
                <span>Traçabilité &amp; Circuit de revue Maker-Checker</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAIRecommendations}
                  onChange={(e) => setIncludeAIRecommendations(e.target.checked)}
                  className="rounded accent-emerald-400 w-3.5 h-3.5"
                />
                <span>Recommandations d&apos;orientation stratégique</span>
              </label>
            </div>

            {/* Report Metadata Customization */}
            <div className="space-y-3 pt-2 border-t border-emerald-500/15">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                Personnalisation
              </label>
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">Titre personnalisé :</span>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={REPORT_TYPE_LABELS[reportType]}
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/50 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-400 outline-hidden"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-400 mb-1">Auteur / Signataire :</span>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Direction de la Qualité"
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/50 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-400 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (8 cols): Interactive Live Report Preview */}
          <div className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-950/40">
            {/* The Printable Container */}
            <div
              id="printable-report-content"
              ref={printableRef}
              className={`w-full max-w-4xl mx-auto rounded-2xl transition-all shadow-xl ${
                previewMode === 'paper'
                  ? 'bg-white text-slate-900 p-8 sm:p-10 border border-slate-300 font-sans'
                  : 'bg-[#061A13]/90 text-slate-100 p-6 sm:p-8 border border-emerald-500/30'
              }`}
            >
              {/* Document Header */}
              <div
                className={`pb-5 mb-6 border-b ${
                  previewMode === 'paper' ? 'border-emerald-600' : 'border-emerald-500/30'
                } flex items-start justify-between gap-4 flex-wrap`}
              >
                <div>
                  <div
                    className={`text-[11px] font-black uppercase tracking-widest ${
                      previewMode === 'paper' ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    MFISCA &amp; ASSOCIÉS · DIRECTION GÉNÉRALE
                  </div>
                  <h1
                    className={`text-xl sm:text-2xl font-black mt-1 tracking-tight ${
                      previewMode === 'paper' ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {activeTitle}
                  </h1>
                  <div
                    className={`text-xs mt-1 font-medium ${
                      previewMode === 'paper' ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    Périmètre : <strong>{metrics.departmentLabel}</strong> · Période :{' '}
                    <strong>{metrics.periodLabel}</strong>
                  </div>
                </div>

                <div
                  className={`text-right text-xs shrink-0 ${
                    previewMode === 'paper' ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <div>
                    Émis le :{' '}
                    <strong className={previewMode === 'paper' ? 'text-slate-800' : 'text-slate-200'}>
                      {metrics.generatedAtFormatted}
                    </strong>
                  </div>
                  <div>
                    Signataire :{' '}
                    <strong className={previewMode === 'paper' ? 'text-slate-800' : 'text-slate-200'}>
                      {authorName}
                    </strong>
                  </div>
                  <div
                    className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      previewMode === 'paper'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
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
                      previewMode === 'paper' ? 'text-emerald-800' : 'text-emerald-300'
                    }`}
                  >
                    1. Indicateurs Clés de Pilotage (KPIs)
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Completion rate */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-emerald-950/40 border-emerald-500/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Complétion Globale
                      </span>
                      <div className="text-2xl font-black text-emerald-600 mt-1">
                        {metrics.completionRate}%
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {metrics.completedTasks} sur {metrics.totalTasks} tâches
                      </span>
                    </div>

                    {/* Review Dossiers */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-emerald-950/40 border-emerald-500/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Dossiers Validés
                      </span>
                      <div className="text-2xl font-black text-sky-600 mt-1">
                        {metrics.validatedDossiers}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {metrics.totalDossiers} dossiers suivis
                      </span>
                    </div>

                    {/* Overdue Tasks */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-emerald-950/40 border-emerald-500/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Tâches en Retard
                      </span>
                      <div
                        className={`text-2xl font-black mt-1 ${
                          metrics.overdueTasks > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {metrics.overdueTasks}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {metrics.urgentTasksCount} urgentes
                      </span>
                    </div>

                    {/* Gateway Requests */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        previewMode === 'paper'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-emerald-950/40 border-emerald-500/20'
                      }`}
                    >
                      <span className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                        Requêtes Inter-Pôles
                      </span>
                      <div
                        className={`text-2xl font-black mt-1 ${
                          metrics.blockedInterDepRequests > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {metrics.totalInterDepRequests}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
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
                    previewMode === 'paper' ? 'text-emerald-800' : 'text-emerald-300'
                  }`}
                >
                  2. Ventilation Opérationnelle par Département
                </h3>

                <div
                  className={`rounded-xl border overflow-hidden ${
                    previewMode === 'paper' ? 'border-slate-200' : 'border-emerald-500/20'
                  }`}
                >
                  <table className="w-full text-xs text-left">
                    <thead
                      className={`text-[11px] font-bold uppercase border-b ${
                        previewMode === 'paper'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-emerald-950/60 text-slate-300 border-emerald-500/20'
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
                          ? 'divide-slate-200 text-slate-800'
                          : 'divide-emerald-500/15 text-slate-200'
                      }`}
                    >
                      {metrics.departments.map((dept) => (
                        <tr key={dept.department}>
                          <td className="py-2.5 px-3 font-semibold flex items-center gap-1.5">
                            {dept.department === 'Fiscalité' && <Calculator className="w-3.5 h-3.5 text-emerald-500" />}
                            {dept.department === 'Comptabilité' && <Building2 className="w-3.5 h-3.5 text-amber-500" />}
                            {dept.department === 'Juridique' && <Scale className="w-3.5 h-3.5 text-indigo-500" />}
                            {dept.department === 'Recherche & Innovation' && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                            <span>{dept.department}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">{dept.totalTasks}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                            {dept.completedTasks}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-center font-bold ${
                              dept.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}
                          >
                            {dept.overdueTasks}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                            {dept.completionRate}%
                          </td>
                          <td className="py-2.5 px-3 text-center">{dept.totalDossiers}</td>
                          <td
                            className={`py-2.5 px-3 text-center font-bold ${
                              dept.blockedRequests > 0 ? 'text-rose-600' : 'text-slate-400'
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
                      previewMode === 'paper' ? 'text-emerald-800' : 'text-emerald-300'
                    }`}
                  >
                    3. État du Circuit de Validation (Maker-Checker)
                  </h3>

                  <div
                    className={`p-4 rounded-xl border space-y-2 text-xs ${
                      previewMode === 'paper'
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-emerald-950/30 border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span>
                        Dossiers en révision active par les managers :{' '}
                        <strong className="text-emerald-600">{metrics.dossiersInProgress}</strong>
                      </span>
                      <span>
                        Dossiers en attente de corrections collaborateur :{' '}
                        <strong className={metrics.dossiersNeedCorrections > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {metrics.dossiersNeedCorrections}
                        </strong>
                      </span>
                      <span>
                        Dossiers verrouillés (Audit immuable) :{' '}
                        <strong className="text-sky-600">{metrics.lockedDossiers}</strong>
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
                      previewMode === 'paper' ? 'text-rose-800' : 'text-rose-400'
                    }`}
                  >
                    4. Points de Vigilance &amp; Risques Opérationnels
                  </h3>

                  <div className="space-y-2">
                    {metrics.criticalTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border-l-4 border-rose-500 text-xs flex items-center justify-between gap-3 ${
                          previewMode === 'paper'
                            ? 'bg-rose-50/70 border border-slate-200 text-slate-800'
                            : 'bg-rose-950/30 border border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{t.title}</span>
                          <span className="text-[11px] opacity-75">
                            Échéance : {formatDueDateFrench(t.dueDate)} · Priorité : {t.priority.toUpperCase()}
                          </span>
                        </div>
                        <Badge
                          variant="destructive"
                          className="text-[10px] font-bold bg-rose-600 text-white shrink-0"
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
                      previewMode === 'paper' ? 'text-emerald-800' : 'text-emerald-300'
                    }`}
                  >
                    5. Recommandations Stratégiques pour le Comité
                  </h3>

                  <div
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      previewMode === 'paper'
                        ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                        : 'bg-emerald-950/40 border-emerald-500/25 text-slate-200'
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
                  previewMode === 'paper' ? 'border-slate-200 text-slate-500' : 'border-emerald-500/20 text-slate-400'
                }`}
              >
                <span>
                  Plateforme Planit · Cabinet Fiscal &amp; Juridique · Document certifié conforme
                </span>
                <span>Page 1 / 1 · Généré le {metrics.generatedAtFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
