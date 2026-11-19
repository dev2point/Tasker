'use client';

import React, { useState, useRef } from 'react';
import { Department, DossierPriority, ReviewDossier, WorkflowActor } from '@/types/review';
import { TrackedFile } from '@/types/file-version';
import { createTrackedFile } from '@/lib/file-version-service';
import { extractDocxText, extractXlsxData, extractCsvData } from '@/lib/office-parser';
import { X, Plus, FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { soundManager } from '@/lib/sound';

interface NewDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkflowActor;
  onCreateDossier: (newDossier: ReviewDossier) => void;
  isSidebarCollapsed?: boolean;
}

const TYPOLOGIES_PER_DEPT: Record<Department, string[]> = {
  Fiscalité: [
    'Liasse Fiscale & CVAE',
    'Crédit Impôt Recherche & CIR',
    'Intégration Fiscale & Restructuration',
    'Audit & Déclaration TVA',
    'Prix de Transfert & Rescrit',
  ],
  Comptabilité: [
    'Consolidation & Arrêté des Comptes',
    'Clôture Bilan & Liasse Annuelle',
    'Audit de Trésorerie & Covenants',
    'Révision des Provisions & IFRS',
  ],
  Juridique: [
    'Opération de Haut de Bilan & Pacte d’Actionnaires',
    'Cession de Titres & GAP',
    'Secrétariat Juridique Annuel & PV d’AG',
    'Contrats Commerciaux & CGV',
    'Fusion-Absorption & Apport Partiel d’Actif',
  ],
  'Recherche & Innovation': [
    'Dossier de Justification CIR/CII',
    'Rescrit Fiscal R&D & Éligibilité',
    'Audit & Sécurisation de Crédit Impôt',
    'Subventions & Bpifrance Innovation',
    'Valorisation IP & Brevets',
  ],
};

export const NewDossierModal: React.FC<NewDossierModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateDossier,
}) => {
  const [department, setDepartment] = useState<Department>(
    (currentUser.department as Department) || 'Fiscalité'
  );
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSiret, setClientSiret] = useState('');
  const [typology, setTypology] = useState(TYPOLOGIES_PER_DEPT[department][0]);
  const [priority, setPriority] = useState<DossierPriority>('medium');
  const [estimatedDate, setEstimatedDate] = useState(() =>
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [metricLabel, setMetricLabel] = useState('');
  const [metricAmount, setMetricAmount] = useState<number | ''>('');

  // Professional file attachment state (starts empty - no mock file)
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [attachedFileSize, setAttachedFileSize] = useState<number>(0);
  const [attachedBase64, setAttachedBase64] = useState<string | undefined>();
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedGrid, setExtractedGrid] = useState<any[] | undefined>();
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeptChange = (newDept: Department) => {
    setDepartment(newDept);
    setTypology(TYPOLOGIES_PER_DEPT[newDept][0]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setAttachedFileName(file.name);
    setAttachedFileSize(file.size);
    setIsExtracting(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx') {
        const buffer = await file.arrayBuffer();
        const text = await extractDocxText(buffer);
        setExtractedText(text);
        setExtractedGrid(undefined);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const sheets = await extractXlsxData(buffer);
        setExtractedGrid(sheets);
        const summaryText = sheets
          .map((s) => `--- Feuille : ${s.name} ---` + s.rows.map((r) => r.join(' | ')).join('\n'))
          .join('\n\n');
        setExtractedText(summaryText);
      } else if (ext === 'csv') {
        const text = await file.text();
        const sheet = extractCsvData(text, file.name);
        setExtractedGrid([sheet]);
        setExtractedText(text);
      } else {
        const text = await file.text();
        setExtractedText(text || 'Document de travail initial.');
        setExtractedGrid(undefined);
      }
    } catch {
      setExtractedText('Document attaché pour révision.');
    } finally {
      setIsExtracting(false);
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) return;
    if (!attachedFileName) {
      setUploadError('Veuillez attacher un document de travail (Word, Excel, PDF) pour initialiser le dossier.');
      return;
    }
    soundManager.playClickSound();

    const now = new Date().toISOString();
    const deptPrefix =
      department === 'Fiscalité' ? 'FIS' : department === 'Comptabilité' ? 'CPT' : department === 'Juridique' ? 'JUR' : 'RND';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const ref = `DOS-${new Date().getFullYear()}-${deptPrefix}-${randomNum}`;

    // Create professional initial tracked file (v1.0)
    const initialTrackedFile: TrackedFile = createTrackedFile({
      fileName: attachedFileName,
      sizeBytes: attachedFileSize,
      contentUrl: attachedBase64,
      textContent: extractedText || 'Document de travail initial.',
      gridData: extractedGrid,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      authorDepartment: currentUser.department,
      summary: 'Version initiale v1.0 du livrable',
      description: 'Document de travail déposé lors de la création du dossier.',
    });

    const newDossier: ReviewDossier = {
      id: `dossier-${Date.now()}`,
      ref,
      title: title.trim(),
      clientName: clientName.trim(),
      clientSiret: clientSiret.trim() || undefined,
      department,
      typology,
      priority,
      status: 'brouillon',
      version: 1,
      maker: currentUser,
      lock: {
        isLocked: false,
      },
      estimatedDeliverableDate: estimatedDate,
      createdAt: now,
      updatedAt: now,
      dataFields:
        metricLabel.trim() && metricAmount !== ''
          ? [
              {
                id: `df-${Date.now()}-1`,
                label: metricLabel.trim(),
                category:
                  department === 'Fiscalité'
                    ? 'fiscal'
                    : department === 'Comptabilité'
                      ? 'finance'
                      : 'juridique',
                previousValue: Number(metricAmount),
                currentValue: Number(metricAmount),
                unit: '€',
                notes: 'Valeur déclarée au stade brouillon',
              },
            ]
          : [],
      textDocument: {
        documentId: `doc-${Date.now()}`,
        title: `Synthèse - ${attachedFileName}`,
        type:
          department === 'Fiscalité'
            ? 'conclusions_fiscales'
            : department === 'Comptabilité'
              ? 'rapport_cloture'
              : 'acte_juridique',
        previousContent: extractedText || 'Document initial.',
        currentContent: extractedText || 'Document initial.',
        lastAmendedBy: currentUser.name,
        lastAmendedAt: now,
        amendmentNotes: `Dépôt initial du fichier ${attachedFileName}`,
      },
      trackedFiles: [initialTrackedFile],
      interDepRequests: [],
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp: now,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorDepartment: currentUser.department,
          actorRole: currentUser.role,
          ipAddress: '192.168.1.42',
          action: 'creation',
          details: `Création du dossier "${title.trim()}" pour ${clientName.trim()} avec dépôt du fichier "${attachedFileName}" (v1.0).`,
        },
      ],
    };

    onCreateDossier(newDossier);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-[#061A13]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden my-auto text-slate-100">
          <div className="flex items-center justify-between px-5 py-4 bg-emerald-950/80 border-b border-emerald-500/30 text-white">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-amber-400">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white">Nouveau Dossier Métier &amp; Dépôt de Fichier</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
            {/* Department Selector */}
            <div>
              <label className="font-bold text-slate-200 block mb-1.5">Département Référent</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Fiscalité', 'Comptabilité', 'Juridique', 'Recherche & Innovation'] as Department[]).map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => handleDeptChange(dept)}
                    className={`py-2 px-2.5 rounded-xl font-bold border text-center text-xs transition-all cursor-pointer ${
                      department === dept
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/40 shadow-sm'
                        : 'bg-emerald-950/40 border-emerald-500/20 text-slate-400 hover:bg-emerald-500/10 hover:text-white'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Titre du Dossier</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Liasse Fiscale & CVAE 2025..."
                  className="w-full px-3 py-2 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Nom du Client</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: SAS Biopharma..."
                  className="w-full px-3 py-2 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-200 block mb-1">Typologie</label>
                <select
                  value={typology}
                  onChange={(e) => setTypology(e.target.value)}
                  className="w-full p-2 border border-emerald-500/30 bg-emerald-950/80 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {TYPOLOGIES_PER_DEPT[department].map((t) => (
                    <option key={t} value={t} className="bg-slate-900 text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Priorité</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as DossierPriority)}
                  className="w-full p-2 border border-emerald-500/30 bg-emerald-950/80 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="low" className="bg-slate-900 text-white">Basse</option>
                  <option value="medium" className="bg-slate-900 text-white">Normale</option>
                  <option value="high" className="bg-slate-900 text-white">Haute</option>
                  <option value="urgent" className="bg-slate-900 text-white">Urgente</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-200 block mb-1">Échéance Estimée</label>
                <input
                  type="date"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-500/30 bg-emerald-950/80 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Metric input */}
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
              <span className="font-bold text-white block mb-2">
                Indicateur Chiffré Initial (pour suivi du Diff financier)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Libellé de l&apos;Indicateur</label>
                  <input
                    type="text"
                    value={metricLabel}
                    onChange={(e) => setMetricLabel(e.target.value)}
                    placeholder="Ex: Chiffre d'Affaires HT ou Résultat Fiscal"
                    className="w-full px-3 py-1.5 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Montant initial (€)</label>
                  <input
                    type="number"
                    value={metricAmount}
                    onChange={(e) => setMetricAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 1500000"
                    className="w-full px-3 py-1.5 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* Professional File Attachment Area (No Mock File Initially) */}
            <div className="p-4 bg-emerald-950/50 rounded-xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Document de Travail Initial (v1.0)</span>
                  <span className="text-[11px] text-emerald-300/80">
                    Attachez le fichier initial (Word .docx, Excel .xlsx, PDF ou Markdown) *
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.xlsx,.xls,.pdf,.md,.txt,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isExtracting ? 'Analyse...' : 'Parcourir les fichiers'}
                </Button>
              </div>

              {attachedFileName ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#061A13] border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-emerald-200 truncate">{attachedFileName}</span>
                    <span className="text-slate-400 text-[10px]">({Math.round(attachedFileSize / 1024)} Ko)</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Prêt (v1.0)
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Aucun fichier attaché. Veuillez cliquer sur &laquo; Parcourir les fichiers &raquo; pour joindre le document initial.</span>
                </div>
              )}

              {uploadError && (
                <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-emerald-500/30">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-emerald-500/30 bg-emerald-950/40 text-slate-300 cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Créer le Dossier &amp; Attacher le Document
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
