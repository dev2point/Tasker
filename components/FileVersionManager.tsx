'use client';

import React, { useState, useRef } from 'react';
import {
  TrackedFile,
  FileVersionSnapshot,
  SpreadsheetSheet,
} from '@/types/file-version';
import {
  formatBytes,
  calculateNextVersion,
  createTrackedFile,
  addNewFileVersion,
  restoreFileVersion,
  downloadSnapshotFile,
  updateSnapshotModeration,
  generateChecksum,
} from '@/lib/file-version-service';
import { computeLineDiff } from '@/lib/review-service';
import { extractDocxText, extractXlsxData, extractCsvData } from '@/lib/office-parser';
import { SpreadsheetDiffViewer } from '@/components/review/SpreadsheetDiffViewer';
import { WordDocxDiffViewer } from '@/components/review/WordDocxDiffViewer';
import { ModerationDecisionModal } from '@/components/review/ModerationDecisionModal';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { sendBrowserNotification } from '@/lib/reminders';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Upload,
  Plus,
  History,
  RotateCcw,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  GitCommit,
  Trash2,
  X,
  FileEdit,
  ArrowRight,
  Layers,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { soundManager } from '@/lib/sound';

interface FileVersionManagerProps {
  files: TrackedFile[];
  onChangeFiles: (files: TrackedFile[]) => void;
  currentUser: {
    id?: string;
    name: string;
    email?: string;
    role?: string;
    department?: string;
  };
  contextTitle?: string; // e.g. "Dossier DOS-2026-FIS-042" or "Tâche #12"
  readOnly?: boolean;
}

export const FileVersionManager: React.FC<FileVersionManagerProps> = ({
  files = [],
  onChangeFiles,
  currentUser,
  contextTitle = 'Documents de travail',
  readOnly = false,
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    files.length > 0 ? files[0].id : null
  );
  const [inspectingSnapshot, setInspectingSnapshot] = useState<FileVersionSnapshot | null>(null);
  const [diffComparison, setDiffComparison] = useState<{
    v1: FileVersionSnapshot;
    v2: FileVersionSnapshot;
  } | null>(null);

  // Upload new file or new version state
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [uploadFileTarget, setUploadFileTarget] = useState<TrackedFile | null>(null);

  // Form states
  const [formFileName, setFormFileName] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTextContent, setFormTextContent] = useState('');
  const [formGridData, setFormGridData] = useState<SpreadsheetSheet[] | undefined>();
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [formIsMajor, setFormIsMajor] = useState(false);
  const [uploadedBase64, setUploadedBase64] = useState<string | undefined>();
  const [uploadedChecksum, setUploadedChecksum] = useState<string | undefined>();
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [uploadedName, setUploadedName] = useState<string>('');
  const [uploadedFileId, setUploadedFileId] = useState<string | undefined>();
  const [uploadedVersionId, setUploadedVersionId] = useState<string | undefined>();
  const [uploadedStorageProvider, setUploadedStorageProvider] = useState<'r2' | 'inline'>('inline');
  const [uploadedR2Key, setUploadedR2Key] = useState<string | undefined>();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [moderationTarget, setModerationTarget] = useState<{
    file: TrackedFile;
    snapshot: FileVersionSnapshot;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newVersionInputRef = useRef<HTMLInputElement>(null);

  const selectedFile = files.find((f) => f.id === selectedFileId) || files[0] || null;

  // Handle local file picking for New Document or New Version (with R2 upload + Word/Excel/PDF extraction + SHA-256)
  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetFileId =
      uploadFileTarget?.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const targetVersionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setUploadError(null);
    setUploadedFileId(undefined);
    setUploadedVersionId(undefined);
    setUploadedR2Key(undefined);
    setUploadedStorageProvider('inline');
    setUploadedBase64(undefined);
    setUploadedChecksum(undefined);
    setUploadedSize(0);
    setUploadedName('');
    setIsExtracting(true);

    try {
      const buffer = await file.arrayBuffer();
      const rawBytes = new Uint8Array(buffer);
      const checksum = generateChecksum(rawBytes);

      const uploadForm = new FormData();
      uploadForm.append('file', file);
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
        setUploadError('Le fichier n’a pas été stocké dans Cloudflare R2.');
        return;
      }

      setUploadedFileId(targetFileId);
      setUploadedVersionId(targetVersionId);
      setUploadedName(file.name);
      setUploadedSize(file.size);
      setUploadedChecksum(uploadData.checksum || checksum);
      setUploadedR2Key(uploadData.r2Key);
      setUploadedBase64(uploadData.downloadUrl);
      setUploadedStorageProvider('r2');
      setFormFileName(file.name);

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
                setFormTextContent(data.textContent);
              }
              if (typeof data.checksum === 'string') {
                setUploadedChecksum(data.checksum);
              }
              setFormGridData(undefined);
            }
          } catch (err) {
            console.warn('Extraction PDF indisponible, empreinte binaire conservée.', err);
          }
        } else if (ext === 'docx') {
          const text = await extractDocxText(buffer);
          setFormTextContent(text);
          setFormGridData(undefined);
        } else if (ext === 'xlsx' || ext === 'xls') {
          const sheets = await extractXlsxData(buffer);
          setFormGridData(sheets);
          const summaryText = sheets
            .map((s) => `--- Feuille : ${s.name} (${s.rowCount} lignes) ---\n` + s.rows.map((r) => r.join(' | ')).join('\n'))
            .join('\n\n');
          setFormTextContent(summaryText);
        } else if (ext === 'csv') {
          const text = await file.text();
          const sheet = extractCsvData(text, file.name);
          setFormGridData([sheet]);
          setFormTextContent(text);
        } else if (file.type.startsWith('text/') || ext === 'md' || ext === 'txt' || ext === 'json') {
          const text = await file.text();
          setFormTextContent(text);
          setFormGridData(undefined);
        }
      } catch (err) {
        console.error('Erreur lors de la lecture du fichier Office :', err);
      }
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (newVersionInputRef.current) newVersionInputRef.current.value = '';
    }
  };

  // Create new Tracked File
  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    const fileName = (formFileName || uploadedName || 'document-travail.txt').trim();
    if (!fileName) return;
    if (uploadError) return;
    if (uploadedName && (!uploadedR2Key || uploadedStorageProvider !== 'r2')) {
      setUploadError('Le fichier doit être téléversé dans Cloudflare R2 avant l’enregistrement.');
      return;
    }

    soundManager.playClickSound();

    const size = uploadedSize || (formTextContent ? new Blob([formTextContent]).size : 1024);
    const newTracked = createTrackedFile({
      id: uploadedFileId,
      versionId: uploadedVersionId,
      fileName,
      sizeBytes: size,
      storageProvider: uploadedStorageProvider,
      r2Key: uploadedR2Key,
      contentUrl: uploadedBase64,
      checksum: uploadedChecksum,
      textContent: formTextContent || undefined,
      gridData: formGridData,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      authorDepartment: currentUser.department,
      summary: formSummary.trim() || 'Version initiale v1.0',
      description: formDescription.trim() || undefined,
    });

    const nextFiles = [newTracked, ...files];
    onChangeFiles(nextFiles);
    setSelectedFileId(newTracked.id);

    // Reset form
    setIsNewFileModalOpen(false);
    setFormFileName('');
    setFormSummary('');
    setFormDescription('');
    setFormTextContent('');
    setFormGridData(undefined);
    setUploadedBase64(undefined);
    setUploadedChecksum(undefined);
    setUploadedSize(0);
    setUploadedName('');
    setUploadedFileId(undefined);
    setUploadedVersionId(undefined);
    setUploadedStorageProvider('inline');
    setUploadedR2Key(undefined);
    setUploadError(null);
  };

  // Add new revision version to existing tracked file
  const handleAddNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileTarget) return;
    if (uploadError) return;
    if (uploadedName && (!uploadedR2Key || uploadedStorageProvider !== 'r2')) {
      setUploadError('Le fichier doit être téléversé dans Cloudflare R2 avant l’enregistrement.');
      return;
    }

    soundManager.playClickSound();

    const fileName = (formFileName || uploadedName || uploadFileTarget.name).trim();
    const size = uploadedSize || (formTextContent ? new Blob([formTextContent]).size : (uploadFileTarget.versions[0]?.sizeBytes || 1024));

    const updated = addNewFileVersion(uploadFileTarget, {
      versionId: uploadedVersionId,
      fileName,
      sizeBytes: size,
      storageProvider: uploadedR2Key ? 'r2' : undefined,
      r2Key: uploadedR2Key,
      contentUrl: uploadedBase64 || uploadFileTarget.versions[0]?.contentUrl,
      checksum: uploadedChecksum,
      textContent: formTextContent || uploadFileTarget.versions[0]?.textContent,
      gridData: formGridData || uploadFileTarget.versions[0]?.gridData,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      authorRole: currentUser.role,
      authorDepartment: currentUser.department,
      summary: formSummary.trim() || `Mise à jour du document`,
      isMajor: formIsMajor,
    });

    const nextFiles = files.map((f) => (f.id === updated.id ? updated : f));
    onChangeFiles(nextFiles);

    // Reset
    setIsNewVersionModalOpen(false);
    setUploadFileTarget(null);
    setFormFileName('');
    setFormSummary('');
    setFormTextContent('');
    setFormGridData(undefined);
    setUploadedBase64(undefined);
    setUploadedChecksum(undefined);
    setUploadedSize(0);
    setUploadedName('');
    setUploadedFileId(undefined);
    setUploadedVersionId(undefined);
    setUploadedStorageProvider('inline');
    setUploadedR2Key(undefined);
    setFormIsMajor(false);
    setUploadError(null);
  };

  // Moderation decision confirmed by supervisor
  const handleConfirmModeration = (decision: { status: 'approved' | 'rejected'; note: string }) => {
    if (!moderationTarget) return;

    soundManager.playCompleteSound();
    const updated = updateSnapshotModeration(
      moderationTarget.file,
      moderationTarget.snapshot.id,
      decision.status,
      decision.note,
      currentUser
    );

    const nextFiles = files.map((f) => (f.id === updated.id ? updated : f));
    onChangeFiles(nextFiles);

    // Send browser notification
    const actionLabel = decision.status === 'approved' ? 'Validé' : 'Renvoyé pour corrections';
    sendBrowserNotification(`Modération : ${actionLabel}`, {
      body: `Le document ${moderationTarget.file.name} (${moderationTarget.snapshot.versionNumber}) a été ${actionLabel.toLowerCase()} par ${currentUser.name}.\nMotif: "${decision.note}"`,
    });

    setModerationTarget(null);
  };

  // Restore previous version
  const handleRestore = (file: TrackedFile, snapshot: FileVersionSnapshot) => {
    const confirmRestore = window.confirm(
      `Confirmez-vous la restauration de la version ${snapshot.versionNumber} ?\n\nUne nouvelle version ${calculateNextVersion(file.currentVersion, false)} sera automatiquement créée sans écraser l'historique.`
    );
    if (!confirmRestore) return;

    soundManager.playCompleteSound();
    const updated = restoreFileVersion(file, snapshot.id, {
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      department: currentUser.department,
    });

    const nextFiles = files.map((f) => (f.id === updated.id ? updated : f));
    onChangeFiles(nextFiles);
  };

  // Delete tracked file
  const handleDeleteTrackedFile = (fileId: string) => {
    if (!window.confirm('Supprimer ce fichier et tout son historique de versions ?')) return;
    soundManager.playClickSound();
    const nextFiles = files.filter((f) => f.id !== fileId);
    onChangeFiles(nextFiles);
    if (selectedFileId === fileId) {
      setSelectedFileId(nextFiles.length > 0 ? nextFiles[0].id : null);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'docx':
      case 'doc':
      case 'pdf':
        return <FileText className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB]" />;
      case 'txt':
      case 'md':
        return <FileCode className="w-4 h-4 text-[#F77F00] dark:text-[#FFB35C]" />;
      default:
        return <File className="w-4 h-4 text-[#486075] dark:text-slate-400" />;
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 w-full text-[#0B1F30] dark:text-slate-100">
      {/* Top Banner / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/30 flex items-center justify-center text-[#004266] dark:text-[#7CC4EB]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2">
              <span>Suivi &amp; Historique de Versions</span>
              <Badge variant="outline" className="text-[10px] bg-[#004266]/10 dark:bg-[#3895C9]/20 border-[#004266]/20 dark:border-[#3895C9]/30 text-[#004266] dark:text-[#7CC4EB]">
                {files.length} document{files.length > 1 ? 's' : ''}
              </Badge>
            </h4>
            <p className="text-[11px] text-[#486075] dark:text-slate-400">
              Traçabilité complète, numérotation automatique, restauration en 1 clic et empreinte d&apos;intégrité.
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={() => {
                setUploadFileTarget(null);
                setFormFileName('');
                setFormSummary('');
                setFormDescription('');
                setFormTextContent('');
                setUploadedBase64(undefined);
                setUploadedChecksum(undefined);
                setUploadedSize(0);
                setUploadedName('');
                setUploadedFileId(undefined);
                setUploadedVersionId(undefined);
                setUploadedStorageProvider('inline');
                setUploadedR2Key(undefined);
                setUploadError(null);
                setIsNewFileModalOpen(true);
              }}
              className="h-8 text-xs font-bold shadow-sm cursor-pointer gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau document versionné</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Layout: Left File List + Right Version Timeline & Details */}
      {files.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#F4F7FA]/70 dark:bg-[#061826]/40 border border-dashed border-[#D8E2EC] dark:border-[#94B8D6]/20 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF4E6] dark:bg-[#F77F00]/15 border border-[#F77F00]/25 dark:border-[#F77F00]/30 flex items-center justify-center">
            <History className="w-6 h-6 text-[#F77F00]" />
          </div>
          <div className="max-w-md">
            <p className="text-xs sm:text-sm font-bold text-[#0B1F30] dark:text-white mb-1">
              Aucun document versionné pour le moment
            </p>
            <p className="text-[11px] text-[#486075] dark:text-slate-400 leading-relaxed mb-4">
              Ajoutez des pièces jointes, comptes-rendus, tableaux Excel ou notes fiscales pour suivre l&apos;intégralité de leurs modifications avec auteurs, dates et versions successives.
            </p>
            {!readOnly && (
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={() => {
                  setUploadError(null);
                  setIsNewFileModalOpen(true);
                }}
                className="font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Ajouter un premier fichier
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* File selector column (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] px-1">
              Documents suivis ({files.length})
            </span>
            <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
              {files.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                const latest = file.versions[0];
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-white dark:bg-[#0B2438] border-[#004266] dark:border-[#3895C9] shadow-sm ring-1 ring-[#004266]/20 dark:ring-[#3895C9]/35'
                        : 'bg-[#F4F7FA] dark:bg-[#061826]/55 border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 text-[#486075] dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 shrink-0 mt-0.5">
                        {getFileIcon(file.fileType)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#0B1F30] dark:text-white truncate max-w-[170px]" title={file.name}>
                            {file.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-black bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/25 dark:border-[#3895C9]/35">
                            {file.currentVersion}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#486075] dark:text-slate-400 mt-0.5">
                          {file.versions.length} version{file.versions.length > 1 ? 's' : ''} • {latest ? formatBytes(latest.sizeBytes) : ''}
                        </span>
                        <span className="text-[10px] text-[#486075] dark:text-slate-400 truncate">
                          Dernier par <strong className="text-[#0B1F30] dark:text-slate-200">{latest?.authorName || 'Collaborateur'}</strong>
                        </span>
                      </div>
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrackedFile(file.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Supprimer ce document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Version History Timeline (8 cols on lg) */}
          {selectedFile && (
            <div className="lg:col-span-8 flex flex-col gap-3">
              {/* Active File Header */}
              <div className="p-3.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/65 border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25">
                    {getFileIcon(selectedFile.fileType)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-xs sm:text-sm font-bold text-[#0B1F30] dark:text-white truncate">
                        {selectedFile.name}
                      </h5>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/25 dark:border-[#3895C9]/35">
                        Version active : {selectedFile.currentVersion}
                      </span>
                    </div>
                    {selectedFile.description && (
                      <p className="text-[11px] text-[#486075] dark:text-slate-400 truncate">
                        {selectedFile.description}
                      </p>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setUploadFileTarget(selectedFile);
                      setFormFileName(selectedFile.name);
                      setFormSummary('');
                      setFormTextContent(selectedFile.versions[0]?.textContent || '');
                      setUploadedBase64(undefined);
                      setUploadedChecksum(undefined);
                      setUploadedSize(0);
                      setUploadedName('');
                      setUploadedFileId(undefined);
                      setUploadedVersionId(undefined);
                      setUploadedStorageProvider('inline');
                      setUploadedR2Key(undefined);
                      setUploadError(null);
                      setFormIsMajor(false);
                      setIsNewVersionModalOpen(true);
                    }}
                    className="h-7 px-3 text-xs font-bold bg-[#FFF4E6] text-[#B85A00] border border-[#F77F00]/40 hover:bg-[#F77F00]/20 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35 dark:hover:bg-[#F77F00]/30 gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F77F00]" />
                    <span>Publier nouvelle version ({calculateNextVersion(selectedFile.currentVersion, false)})</span>
                  </Button>
                )}
              </div>

              {/* Timeline List of Snapshots */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] px-1">
                  Chronologie complète des versions ({selectedFile.versions.length})
                </span>

                <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#D8E2EC] dark:before:bg-[#3895C9]/30">
                  {selectedFile.versions.map((snapshot, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={snapshot.id}
                        className={`relative p-3.5 rounded-xl border transition-all ${
                          isLatest
                            ? 'bg-white dark:bg-[#0B2438] border-[#004266]/45 dark:border-[#3895C9]/45 shadow-sm ring-1 ring-[#004266]/15 dark:ring-[#3895C9]/20'
                            : 'bg-[#F4F7FA] dark:bg-[#061826]/45 border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[#486075] dark:text-slate-300 hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/40'
                        }`}
                      >
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
                            isLatest
                              ? 'bg-[#F77F00] border-white dark:border-[#0B2438] ring-2 ring-[#F77F00]/40'
                              : 'bg-[#D8E2EC] dark:bg-slate-700 border-[#004266]/40 dark:border-[#3895C9]/50'
                          }`}
                        />

                        {/* Top line of snapshot */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded font-mono text-xs font-black bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/25 dark:border-[#3895C9]/35">
                              {snapshot.versionNumber}
                            </span>
                            {isLatest && (
                              <Badge className="bg-[#004266] dark:bg-[#3895C9] text-white dark:text-[#061826] font-bold text-[10px]">
                                Version Active
                              </Badge>
                            )}
                            {snapshot.restoredFromVersion && (
                              <Badge variant="outline" className="text-[10px] bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35">
                                Restauration de {snapshot.restoredFromVersion}
                              </Badge>
                            )}
                            {snapshot.moderationStatus === 'approved' && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                Validé par {snapshot.moderatedBy || 'Superviseur'}
                              </Badge>
                            )}
                            {snapshot.moderationStatus === 'rejected' && (
                              <Badge variant="outline" className="text-[10px] bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/40 font-bold gap-1">
                                <RotateCcw className="w-3 h-3 text-[#F77F00]" />
                                Corrections requises
                              </Badge>
                            )}
                            {(!snapshot.moderationStatus || snapshot.moderationStatus === 'pending') && (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-[#486075] border-[#D8E2EC] dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/50">
                                En attente de revue
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#486075] dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>
                              {new Date(snapshot.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              à{' '}
                              {new Date(snapshot.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Author & Summary */}
                        <div className="flex flex-col gap-1 mb-2">
                          <p className="text-xs font-semibold text-[#0B1F30] dark:text-white">
                            {snapshot.summary}
                          </p>
                          {snapshot.moderationNote && (
                            <div className="p-2 rounded-lg bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[11px] text-[#486075] dark:text-slate-300 mt-0.5">
                              <span className="font-bold text-[#B85A00] dark:text-[#FFB35C] mr-1.5">Note du modérateur :</span>
                              <span>« {snapshot.moderationNote} »</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-[#486075] dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-[#004266] dark:text-[#3895C9]" />
                              <strong className="text-[#0B1F30] dark:text-slate-300">{snapshot.authorName}</strong>
                              {snapshot.authorDepartment && (
                                <span className="text-[#486075] dark:text-slate-500">({snapshot.authorDepartment})</span>
                              )}
                            </span>
                            <span>•</span>
                            <span>{formatBytes(snapshot.sizeBytes)}</span>
                            {snapshot.checksum && (
                              <>
                                <span>•</span>
                                <button
                                  type="button"
                                  onClick={() => copyHash(snapshot.checksum!)}
                                  className="flex items-center gap-1 font-mono text-[10px] text-[#486075] dark:text-slate-500 hover:text-[#004266] dark:hover:text-[#7CC4EB] cursor-pointer"
                                  title="Cliquer pour copier l'empreinte de sécurité"
                                >
                                  <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                  <span>{snapshot.checksum.substring(0, 16)}...</span>
                                  {copiedHash === snapshot.checksum ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1.5 border-t border-[#E6EDF4] dark:border-[#94B8D6]/15 flex-wrap">
                          {/* Download snapshot */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadSnapshotFile(snapshot)}
                            className="h-6 px-2 text-[11px] font-medium gap-1"
                          >
                            <Download className="w-3 h-3 text-[#004266] dark:text-[#3895C9]" />
                            <span>Télécharger</span>
                          </Button>

                          {/* Inspect / Preview */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectingSnapshot(snapshot)}
                            className="h-6 px-2 text-[11px] font-medium gap-1"
                          >
                            <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Inspecter</span>
                          </Button>

                          {/* Compare with latest if not latest */}
                          {!isLatest && selectedFile.versions[0] && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDiffComparison({
                                  v1: snapshot,
                                  v2: selectedFile.versions[0],
                                });
                              }}
                              className="h-6 px-2 text-[11px] font-medium gap-1"
                            >
                              <History className="w-3 h-3 text-[#F77F00]" />
                              <span>Diff vs Actuelle</span>
                            </Button>
                          )}

                          {/* Moderate button for supervisor */}
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setModerationTarget({ file: selectedFile, snapshot })}
                              className="h-6 px-2 text-[11px] font-bold text-[#B85A00] dark:text-[#FFB35C] hover:bg-[#F77F00]/10 gap-1"
                              title="Valider ou demander des corrections avec motif obligatoire"
                            >
                              <ShieldCheck className="w-3 h-3 text-[#F77F00]" />
                              <span>Modérer</span>
                            </Button>
                          )}

                          {/* Restore button if not latest */}
                          {!isLatest && !readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(selectedFile, snapshot)}
                              className="h-6 px-2 text-[11px] font-bold text-[#004266] dark:text-[#7CC4EB] hover:bg-[#004266]/10 dark:hover:bg-[#3895C9]/20 gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurer cette version</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: New Tracked File */}
      {isNewFileModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-2xl shadow-2xl p-5 text-[#0B1F30] dark:text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
              <h4 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
                <span>Ajouter un document avec suivi de version</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFile} className="space-y-3.5">
              {/* File upload picker or name */}
              <div>
                <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                  Fichier source (ou choisir un nom de document)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLocalFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                    <span>Parcourir l&apos;ordinateur</span>
                  </Button>
                  {isExtracting ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#B85A00] dark:text-[#FFB35C] font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extraction automatique du contenu Word/Excel...</span>
                    </div>
                  ) : uploadedName ? (
                    <span className="text-xs text-[#004266] dark:text-[#7CC4EB] font-semibold truncate max-w-[200px]">
                      {uploadedName} ({formatBytes(uploadedSize)})
                    </span>
                  ) : null}
                </div>
              </div>

              {uploadError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-2 text-[11px] text-rose-700 dark:text-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                  Nom du document
                </label>
                <input
                  type="text"
                  required
                  value={formFileName}
                  onChange={(e) => setFormFileName(e.target.value)}
                  placeholder="ex: Liasse_Fiscale_2026_Audit.xlsx ou Note_Synthese.docx"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                  Motif / Note de version initiale (v1.0)
                </label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="ex: Première version du document de synthèse"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                  Description générale (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Objectif de ce document, destinataires ou consignes spécifiques..."
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden resize-none"
                />
              </div>

              {/* Text content preview/editor if text file */}
              {formTextContent && (
                <div>
                  <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                    Aperçu du contenu texte (modifiable)
                  </label>
                  <textarea
                    rows={4}
                    value={formTextContent}
                    onChange={(e) => setFormTextContent(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#061826]/70 text-[#0B1F30] dark:text-slate-200 outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  className="text-xs font-bold cursor-pointer"
                >
                  Créer et Démarrer v1.0
                </Button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: New Version of existing file */}
      {isNewVersionModalOpen && uploadFileTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-2xl shadow-2xl p-5 text-[#0B1F30] dark:text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-[#F77F00]" />
                  <span>Publier une nouvelle version de {uploadFileTarget.name}</span>
                </h4>
                <p className="text-[11px] text-[#486075] dark:text-slate-400">
                  Version actuelle : <strong>{uploadFileTarget.currentVersion}</strong> → Prochaine version :{' '}
                  <strong className="text-[#004266] dark:text-[#7CC4EB]">
                    {calculateNextVersion(uploadFileTarget.currentVersion, formIsMajor)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(false)}
                className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewVersion} className="space-y-3.5">
              {/* File upload picker */}
              <div>
                <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                  Remplacer par un fichier mis à jour (facultatif)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={newVersionInputRef}
                    onChange={handleLocalFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => newVersionInputRef.current?.click()}
                    className="text-xs gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                    <span>Choisir le nouveau fichier</span>
                  </Button>
                  {isExtracting ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#B85A00] dark:text-[#FFB35C] font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Extraction automatique du contenu Word/Excel...</span>
                    </div>
                  ) : uploadedName ? (
                    <span className="text-xs text-[#004266] dark:text-[#7CC4EB] font-semibold truncate max-w-[200px]">
                      {uploadedName} ({formatBytes(uploadedSize)})
                    </span>
                  ) : null}
                </div>
              </div>

              {uploadError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-2 text-[11px] text-rose-700 dark:text-rose-200">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                  Motif du changement / Notes de révision (obligatoire)
                </label>
                <input
                  type="text"
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="ex: Intégration des corrections de l'expert-comptable"
                  className="w-full px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                <input
                  type="checkbox"
                  id="major-version-checkbox"
                  checked={formIsMajor}
                  onChange={(e) => setFormIsMajor(e.target.checked)}
                  className="rounded accent-[#004266] dark:accent-[#F77F00] w-4 h-4"
                />
                <label htmlFor="major-version-checkbox" className="text-xs text-[#0B1F30] dark:text-slate-300 cursor-pointer">
                  Marquer comme <strong>version majeure</strong> (ex: {calculateNextVersion(uploadFileTarget.currentVersion, true)})
                </label>
              </div>

              {/* Text content if text document */}
              {uploadFileTarget.versions[0]?.textContent !== undefined && (
                <div>
                  <label className="text-[11px] font-bold text-[#486075] dark:text-slate-300 block mb-1">
                    Contenu texte mis à jour
                  </label>
                  <textarea
                    rows={5}
                    value={formTextContent}
                    onChange={(e) => setFormTextContent(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#061826]/70 text-[#0B1F30] dark:text-slate-200 outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewVersionModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  className="text-xs font-bold cursor-pointer"
                >
                  Enregistrer {calculateNextVersion(uploadFileTarget.currentVersion, formIsMajor)}
                </Button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Inspect Snapshot Details */}
      {inspectingSnapshot && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-2xl shadow-2xl p-5 text-[#0B1F30] dark:text-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-black bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/25 dark:border-[#3895C9]/35">
                  {inspectingSnapshot.versionNumber}
                </span>
                <h4 className="text-sm font-bold text-[#0B1F30] dark:text-white truncate max-w-sm">
                  {inspectingSnapshot.fileName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSnapshot(null)}
                className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                <div>
                  <span className="text-[#486075] dark:text-slate-400 block">Auteur</span>
                  <strong className="text-[#0B1F30] dark:text-white">{inspectingSnapshot.authorName}</strong>
                </div>
                <div>
                  <span className="text-[#486075] dark:text-slate-400 block">Pôle / Département</span>
                  <strong className="text-[#004266] dark:text-[#7CC4EB]">{inspectingSnapshot.authorDepartment || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[#486075] dark:text-slate-400 block">Date et heure</span>
                  <strong className="text-[#0B1F30] dark:text-white">
                    {new Date(inspectingSnapshot.createdAt).toLocaleString('fr-FR')}
                  </strong>
                </div>
                <div>
                  <span className="text-[#486075] dark:text-slate-400 block">Taille</span>
                  <strong className="text-[#0B1F30] dark:text-white">{formatBytes(inspectingSnapshot.sizeBytes)}</strong>
                </div>
                {inspectingSnapshot.checksum && (
                  <div className="col-span-2">
                    <span className="text-[#486075] dark:text-slate-400 block">Empreinte d&apos;intégrité</span>
                    <span className="font-mono text-[10px] text-purple-700 dark:text-purple-300 break-all">
                      {inspectingSnapshot.checksum}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-[#004266] dark:text-[#7CC4EB] block mb-1">Motif de version</span>
                <p className="p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[#0B1F30] dark:text-slate-200">
                  {inspectingSnapshot.summary}
                </p>
              </div>

              {inspectingSnapshot.textContent && (
                <div>
                  <span className="font-bold text-[#004266] dark:text-[#7CC4EB] block mb-1">Contenu texte</span>
                  <pre className="p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/80 border border-[#D8E2EC] dark:border-[#94B8D6]/20 font-mono text-[11px] text-[#0B1F30] dark:text-slate-200 max-h-56 overflow-y-auto whitespace-pre-wrap">
                    {inspectingSnapshot.textContent}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadSnapshotFile(inspectingSnapshot)}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                <span>Télécharger ce fichier ({inspectingSnapshot.versionNumber})</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInspectingSnapshot(null)}
                className="text-xs cursor-pointer"
              >
                Fermer
              </Button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Diff comparison between two versions */}
      {diffComparison && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-2xl shadow-2xl p-4 sm:p-5 text-[#0B1F30] dark:text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-hidden my-auto">
            <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#F77F00]" />
                <h4 className="text-sm font-bold text-[#0B1F30] dark:text-white">
                  Comparaison différentielle : {diffComparison.v1.versionNumber} vs {diffComparison.v2.versionNumber}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDiffComparison(null)}
                className="p-1 text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                <div>
                  <span className="font-mono text-xs font-bold text-[#486075] dark:text-slate-400 block mb-0.5">
                    Ancienne version ({diffComparison.v1.versionNumber})
                  </span>
                  <span className="text-[11px] text-[#0B1F30] dark:text-slate-300 block">
                    Par {diffComparison.v1.authorName} le {new Date(diffComparison.v1.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <p className="text-[11px] text-[#486075] dark:text-slate-400 italic mt-0.5">
                    « {diffComparison.v1.summary} »
                  </p>
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-[#004266] dark:text-[#7CC4EB] block mb-0.5">
                    Version active ({diffComparison.v2.versionNumber})
                  </span>
                  <span className="text-[11px] text-[#0B1F30] dark:text-slate-300 block">
                    Par {diffComparison.v2.authorName} le {new Date(diffComparison.v2.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <p className="text-[11px] text-[#486075] dark:text-slate-400 italic mt-0.5">
                    « {diffComparison.v2.summary} »
                  </p>
                </div>
              </div>

              {/* 1. If Spreadsheet (.xlsx, .csv or has gridData): Dual table side-by-side */}
              {Boolean(
                diffComparison.v1.gridData ||
                  diffComparison.v2.gridData ||
                  selectedFile.fileType === 'xlsx' ||
                  selectedFile.name.endsWith('.xlsx') ||
                  selectedFile.name.endsWith('.csv')
              ) ? (
                <SpreadsheetDiffViewer
                  previousSheets={diffComparison.v1.gridData}
                  currentSheets={diffComparison.v2.gridData}
                  fileName={selectedFile.name}
                  versionOldLabel={`v${diffComparison.v1.versionNumber} (${diffComparison.v1.authorName})`}
                  versionNewLabel={`v${diffComparison.v2.versionNumber} (${diffComparison.v2.authorName})`}
                />
              ) : Boolean(
                  /* 2. If Word (.docx, text, markdown or has textContent): Word-by-word diff */
                  diffComparison.v1.textContent !== undefined ||
                    diffComparison.v2.textContent !== undefined ||
                    selectedFile.fileType === 'docx' ||
                    selectedFile.name.endsWith('.docx')
                ) ? (
                <WordDocxDiffViewer
                  previousText={diffComparison.v1.textContent}
                  currentText={diffComparison.v2.textContent}
                  fileName={selectedFile.name}
                  versionOldLabel={`v${diffComparison.v1.versionNumber} (${diffComparison.v1.authorName})`}
                  versionNewLabel={`v${diffComparison.v2.versionNumber} (${diffComparison.v2.authorName})`}
                  authorName={diffComparison.v2.authorName}
                  amendmentNotes={diffComparison.v2.summary}
                />
              ) : (
                /* Fallback for other binary formats */
                <div className="p-6 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/45 border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-center text-[#486075] dark:text-slate-400 text-xs">
                  <p className="mb-1 font-bold text-[#0B1F30] dark:text-white">Fichiers binaires non textuels</p>
                  <p>
                    La comparaison automatique s&apos;applique aux documents Word (.docx), classeurs Excel (.xlsx), fichiers CSV et documents texte.
                    Pour les images ou formats personnalisés, téléchargez chaque version pour vérification.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18">
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      setModerationTarget({ file: selectedFile, snapshot: diffComparison.v2 });
                    }}
                    className="text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Modérer cette version ({diffComparison.v2.versionNumber})</span>
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDiffComparison(null)}
                className="text-xs cursor-pointer"
              >
                Fermer
              </Button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Moderation Decision with mandatory motive */}
      {moderationTarget && (
        <ModerationDecisionModal
          isOpen={Boolean(moderationTarget)}
          onClose={() => setModerationTarget(null)}
          documentTitle={moderationTarget.file.name}
          versionNumber={moderationTarget.snapshot.versionNumber}
          authorName={moderationTarget.snapshot.authorName}
          onConfirmDecision={handleConfirmModeration}
        />
      )}
    </div>
  );
};
