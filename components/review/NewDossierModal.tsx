'use client';

import React, { useState, useRef } from 'react';
import { Department, DossierPriority, ReviewDossier, WorkflowActor } from '@/types/review';
import { User } from '@/types/user';
import { TrackedFile } from '@/types/file-version';
import { createTrackedFile, generateChecksum } from '@/lib/file-version-service';
import { buildNewDossier } from '@/lib/review-dossier-factory';
import { extractDocxText, extractXlsxData, extractCsvData } from '@/lib/office-parser';
import { X, Plus, FileText, Upload, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { soundManager } from '@/lib/sound';

interface NewDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: WorkflowActor;
  teamUsers?: User[];
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
  const [draftDossierId, setDraftDossierId] = useState<string | null>(null);
  const [attachedFileId, setAttachedFileId] = useState<string | undefined>();
  const [attachedVersionId, setAttachedVersionId] = useState<string | undefined>();
  const [attachedStorageProvider, setAttachedStorageProvider] = useState<'r2' | 'inline'>('r2');
  const [attachedR2Key, setAttachedR2Key] = useState<string | undefined>();
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [attachedFileSize, setAttachedFileSize] = useState<number>(0);
  const [attachedBase64, setAttachedBase64] = useState<string | undefined>();
  const [attachedChecksum, setAttachedChecksum] = useState<string | undefined>();
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedGrid, setExtractedGrid] = useState<any[] | undefined>();
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeptChange = (newDept: Department) => {
    setDepartment(newDept);
    setTypology(TYPOLOGIES_PER_DEPT[newDept][0]);
  };

  const resetAttachedFile = () => {
    setDraftDossierId(null);
    setAttachedFileId(undefined);
    setAttachedVersionId(undefined);
    setAttachedStorageProvider('r2');
    setAttachedR2Key(undefined);
    setAttachedFileName(null);
    setAttachedFileSize(0);
    setAttachedBase64(undefined);
    setAttachedChecksum(undefined);
    setExtractedText('');
    setExtractedGrid(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetDossierId = draftDossierId || `dossier-${Date.now()}`;
    const targetFileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetVersionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setUploadError(null);
    setAttachedFileName(file.name);
    setAttachedFileSize(file.size);
    setAttachedR2Key(undefined);
    setAttachedStorageProvider('r2');
    setAttachedBase64(undefined);
    setIsExtracting(true);

    try {
      const buffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(buffer);
      setAttachedChecksum(generateChecksum(rawBytes));

      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('dossierId', targetDossierId);
      uploadForm.append('fileId', targetFileId);
      uploadForm.append('versionId', targetVersionId);

      let uploadData: {
        checksum?: string;
        storageProvider?: string;
        r2Key?: string;
        downloadUrl?: string;
      };
      try {
        const uploadRes = await fetch('/api/review/files/upload', {
          method: 'POST',
          body: uploadForm,
        });
        if (!uploadRes.ok) {
          const errorPayload = (await uploadRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errorPayload.error || 'Téléversement R2 indisponible.');
        }
        uploadData = await uploadRes.json();
      } catch (err) {
        resetAttachedFile();
        setUploadError(
          err instanceof Error ? err.message : 'Téléversement R2 indisponible.'
        );
        return;
      }

      if (
        uploadData.storageProvider !== 'r2' ||
        typeof uploadData.r2Key !== 'string' ||
        !uploadData.r2Key
      ) {
        resetAttachedFile();
        setUploadError('Le fichier n’a pas été stocké dans Cloudflare R2.');
        return;
      }

      setDraftDossierId(targetDossierId);
      setAttachedFileId(targetFileId);
      setAttachedVersionId(targetVersionId);
      setAttachedChecksum(uploadData.checksum || generateChecksum(rawBytes));
      setAttachedR2Key(uploadData.r2Key);
      setAttachedBase64(uploadData.downloadUrl);

      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') {
          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/review/files/extract', {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              if (typeof data.textContent === 'string') {
                setExtractedText(data.textContent);
              }
              if (typeof data.checksum === 'string') {
                setAttachedChecksum(data.checksum);
              }
              setExtractedGrid(undefined);
            } else {
              setExtractedText('Document PDF attaché pour révision.');
              setExtractedGrid(undefined);
            }
          } catch {
            setExtractedText('Document PDF attaché pour révision.');
            setExtractedGrid(undefined);
          }
        } else if (ext === 'docx') {
          const text = await extractDocxText(buffer);
          setExtractedText(text);
          setExtractedGrid(undefined);
        } else if (ext === 'xlsx' || ext === 'xls') {
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
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemoveFile = () => {
    resetAttachedFile();
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) return;
    if (!attachedFileName) {
      setUploadError('Veuillez attacher un document de travail (Word, Excel, PDF) pour initialiser le dossier.');
      return;
    }
    if (!attachedR2Key || attachedStorageProvider !== 'r2') {
      setUploadError('Le document doit être téléversé dans Cloudflare R2 avant la création du dossier.');
      return;
    }
    soundManager.playClickSound();

    const now = new Date().toISOString();
    const deptPrefix =
      department === 'Fiscalité' ? 'FIS' : department === 'Comptabilité' ? 'CPT' : department === 'Juridique' ? 'JUR' : 'RND';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const ref = `DOS-${new Date().getFullYear()}-${deptPrefix}-${randomNum}`;

    const initialTrackedFile: TrackedFile = createTrackedFile({
      id: attachedFileId,
      versionId: attachedVersionId,
      fileName: attachedFileName,
      sizeBytes: attachedFileSize,
      storageProvider: attachedStorageProvider,
      r2Key: attachedR2Key,
      contentUrl: attachedBase64,
      checksum: attachedChecksum,
      textContent: extractedText || 'Document de travail initial.',
      gridData: extractedGrid,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      authorDepartment: currentUser.department,
      summary: 'Version initiale v1.0 du livrable',
      description: 'Document de travail déposé lors de la création du dossier.',
    });

    const resolvedDossierId = draftDossierId || `dossier-${Date.parse(now)}`;

    const newDossier = buildNewDossier({
      id: resolvedDossierId,
      ref,
      title: title.trim(),
      clientName: clientName.trim(),
      clientSiret: clientSiret.trim() || undefined,
      department,
      typology,
      priority,
      estimatedDate,
      createdAt: now,
      maker: currentUser,
      initialTrackedFile,
      metricLabel,
      metricAmount,
      extractedText,
      attachedFileName,
    });

    onCreateDossier(newDossier);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-[#061A13]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden my-auto text-slate-100 flex flex-col max-h-[92vh]">
          <div className="flex items-center justify-between px-5 py-4 bg-emerald-950/80 border-b border-emerald-500/30 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-amber-400">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white">Nouveau dossier</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1 text-slate-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-xs">
              {/* L'essentiel */}
              <section aria-labelledby="essentiel-title">
                <h4 id="essentiel-title" className="font-bold text-emerald-300 mb-3">L&apos;essentiel</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="titre" className="font-bold text-slate-200 block mb-1">
                      Titre <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="titre"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Liasse Fiscale & CVAE 2025..."
                      className="w-full px-3 py-2 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="client" className="font-bold text-slate-200 block mb-1">
                      Client <span className="text-amber-400">*</span>
                    </label>
                    <input
                      id="client"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: SAS Biopharma..."
                      className="w-full px-3 py-2 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      required
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label htmlFor="document" className="font-bold text-slate-200 block mb-1">
                    Document <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="document"
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.xlsx,.xls,.pdf,.md,.txt,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {attachedFileName ? (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-mono text-emerald-200 truncate">{attachedFileName}</span>
                        <span className="text-slate-400 text-[10px] shrink-0">({Math.round(attachedFileSize / 1024)} Ko)</span>
                        {isExtracting && <span className="text-[10px] text-amber-300 shrink-0">Analyse...</span>}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="shrink-0 px-2 py-1 text-[11px] font-bold text-rose-300 hover:text-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-1.5 p-5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/30 text-slate-300 hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                    >
                      <Upload className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-white">Ajouter le document</span>
                      <span className="text-[11px] text-emerald-300/80">Word, Excel, PDF ou texte — obligatoire</span>
                    </button>
                  )}
                  {uploadError && (
                    <div role="alert" className="mt-2 p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Options */}
              <div className="border-t border-emerald-500/30 pt-3">
                <button
                  type="button"
                  aria-expanded={showOptions}
                  aria-controls="options-panel"
                  onClick={() => setShowOptions((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-slate-200 font-bold hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                >
                  <span>Options</span>
                  <ChevronDown className={`w-4 h-4 text-emerald-400 ${showOptions ? 'rotate-180' : ''}`} />
                </button>
                {showOptions && (
                  <div id="options-panel" className="mt-3 flex flex-col gap-3">
                    <div>
                      <label htmlFor="pole" className="font-bold text-slate-200 block mb-1">Pôle (facultatif)</label>
                      <select
                        id="pole"
                        value={department}
                        onChange={(e) => handleDeptChange(e.target.value as Department)}
                        className="w-full p-2 border border-emerald-500/30 bg-emerald-950/80 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {(['Fiscalité', 'Comptabilité', 'Juridique', 'Recherche & Innovation'] as Department[]).map((dept) => (
                          <option key={dept} value={dept} className="bg-slate-900 text-white">{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="typologie" className="font-bold text-slate-200 block mb-1">Typologie (facultatif)</label>
                        <select
                          id="typologie"
                          value={typology}
                          onChange={(e) => setTypology(e.target.value)}
                          className="w-full p-2 border border-emerald-500/30 bg-emerald-950/80 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          {TYPOLOGIES_PER_DEPT[department].map((t) => (
                            <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="priorite" className="font-bold text-slate-200 block mb-1">Priorité (facultatif)</label>
                        <select
                          id="priorite"
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
                        <label htmlFor="echeance" className="font-bold text-slate-200 block mb-1">Échéance estimée (facultatif)</label>
                        <input
                          id="echeance"
                          type="date"
                          value={estimatedDate}
                          onChange={(e) => setEstimatedDate(e.target.value)}
                          className="w-full px-3 py-2 border border-emerald-500/30 bg-emerald-950/80 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
                      <span className="font-bold text-white block mb-2">Indicateur chiffré initial (facultatif)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="metric-label" className="text-slate-300 block mb-1">Libellé de l&apos;indicateur (facultatif)</label>
                          <input
                            id="metric-label"
                            type="text"
                            value={metricLabel}
                            onChange={(e) => setMetricLabel(e.target.value)}
                            placeholder="Ex: Chiffre d'Affaires HT ou Résultat Fiscal"
                            className="w-full px-3 py-1.5 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>
                        <div>
                          <label htmlFor="metric-amount" className="text-slate-300 block mb-1">Montant initial (€) (facultatif)</label>
                          <input
                            id="metric-amount"
                            type="number"
                            value={metricAmount}
                            onChange={(e) => setMetricAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ex: 1500000"
                            className="w-full px-3 py-1.5 border border-emerald-500/30 bg-emerald-950/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 px-5 py-3 border-t border-emerald-500/30 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="w-full sm:w-auto border-emerald-500/30 bg-emerald-950/40 text-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Plus className="w-4 h-4" />
                Créer le dossier
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
