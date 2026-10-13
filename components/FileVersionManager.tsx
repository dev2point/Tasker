'use client';

import React, { useState, useRef } from 'react';
import {
  TrackedFile,
  FileVersionSnapshot,
} from '@/types/file-version';
import {
  formatBytes,
  calculateNextVersion,
  createTrackedFile,
  addNewFileVersion,
  restoreFileVersion,
  downloadSnapshotFile,
} from '@/lib/file-version-service';
import { computeLineDiff } from '@/lib/review-service';
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
  Sparkles,
  Trash2,
  X,
  FileEdit,
  ArrowRight,
  Layers,
  Check,
  Copy,
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
  const [formIsMajor, setFormIsMajor] = useState(false);
  const [uploadedBase64, setUploadedBase64] = useState<string | undefined>();
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [uploadedName, setUploadedName] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newVersionInputRef = useRef<HTMLInputElement>(null);

  const selectedFile = files.find((f) => f.id === selectedFileId) || files[0] || null;

  // Handle local file picking for New Document
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedName(file.name);
    setUploadedSize(file.size);
    setFormFileName(file.name);

    // Read file
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFormTextContent(text || '');
      };
      reader.readAsText(file);
    }

    const readerData = new FileReader();
    readerData.onload = (event) => {
      setUploadedBase64(event.target?.result as string);
    };
    readerData.readAsDataURL(file);
  };

  // Create new Tracked File
  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    const fileName = (formFileName || uploadedName || 'document-travail.txt').trim();
    if (!fileName) return;

    soundManager.playClickSound();

    const size = uploadedSize || (formTextContent ? new Blob([formTextContent]).size : 1024);
    const newTracked = createTrackedFile({
      fileName,
      sizeBytes: size,
      contentUrl: uploadedBase64,
      textContent: formTextContent || undefined,
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
    setUploadedBase64(undefined);
    setUploadedSize(0);
    setUploadedName('');
  };

  // Add new revision version to existing tracked file
  const handleAddNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileTarget) return;

    soundManager.playClickSound();

    const fileName = (formFileName || uploadedName || uploadFileTarget.name).trim();
    const size = uploadedSize || (formTextContent ? new Blob([formTextContent]).size : (uploadFileTarget.versions[0]?.sizeBytes || 1024));

    const updated = addNewFileVersion(uploadFileTarget, {
      fileName,
      sizeBytes: size,
      contentUrl: uploadedBase64 || uploadFileTarget.versions[0]?.contentUrl,
      textContent: formTextContent || uploadFileTarget.versions[0]?.textContent,
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
    setUploadedBase64(undefined);
    setUploadedSize(0);
    setUploadedName('');
    setFormIsMajor(false);
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
        return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      case 'docx':
      case 'doc':
      case 'pdf':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'txt':
      case 'md':
        return <FileCode className="w-4 h-4 text-amber-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 w-full text-slate-100">
      {/* Top Banner / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Suivi &amp; Historique de Versions</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/20 border-emerald-500/30 text-emerald-300">
                {files.length} document{files.length > 1 ? 's' : ''}
              </Badge>
            </h4>
            <p className="text-[11px] text-slate-400">
              Traçabilité complète, numérotation automatique, restauration en 1 clic et empreinte d&apos;intégrité.
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setFormFileName('');
                setFormSummary('');
                setFormDescription('');
                setFormTextContent('');
                setUploadedBase64(undefined);
                setUploadedSize(0);
                setUploadedName('');
                setIsNewFileModalOpen(true);
              }}
              className="h-8 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 shadow-md cursor-pointer gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau document versionné</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Layout: Left File List + Right Version Timeline & Details */}
      {files.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-slate-400">
            <History className="w-6 h-6 text-amber-400" />
          </div>
          <div className="max-w-md">
            <p className="text-xs sm:text-sm font-bold text-white mb-1">
              Aucun document versionné pour le moment
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Ajoutez des pièces jointes, comptes-rendus, tableaux Excel ou notes fiscales pour suivre l&apos;intégralité de leurs modifications avec auteurs, dates et versions successives.
            </p>
            {!readOnly && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsNewFileModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 px-1">
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
                        ? 'bg-[#061A13] border-emerald-400/60 shadow-lg ring-1 ring-emerald-400/40'
                        : 'bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-900/30 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/30 shrink-0 mt-0.5">
                        {getFileIcon(file.fileType)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate max-w-[170px]" title={file.name}>
                            {file.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {file.currentVersion}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {file.versions.length} version{file.versions.length > 1 ? 's' : ''} • {latest ? formatBytes(latest.sizeBytes) : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          Dernier par <strong className="text-slate-300">{latest?.authorName || 'Collaborateur'}</strong>
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
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
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
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-900/50 border border-emerald-500/30">
                    {getFileIcon(selectedFile.fileType)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                        {selectedFile.name}
                      </h5>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Version active : {selectedFile.currentVersion}
                      </span>
                    </div>
                    {selectedFile.description && (
                      <p className="text-[11px] text-slate-400 truncate">
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
                      setUploadedSize(0);
                      setUploadedName('');
                      setFormIsMajor(false);
                      setIsNewVersionModalOpen(true);
                    }}
                    className="h-7 px-3 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Publier nouvelle version ({calculateNextVersion(selectedFile.currentVersion, false)})</span>
                  </Button>
                )}
              </div>

              {/* Timeline List of Snapshots */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 px-1">
                  Chronologie complète des versions ({selectedFile.versions.length})
                </span>

                <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-emerald-500/30">
                  {selectedFile.versions.map((snapshot, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={snapshot.id}
                        className={`relative p-3.5 rounded-xl border transition-all ${
                          isLatest
                            ? 'bg-[#061A13] border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20'
                            : 'bg-emerald-950/30 border-emerald-500/20 text-slate-300 hover:bg-emerald-950/50'
                        }`}
                      >
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
                            isLatest
                              ? 'bg-emerald-400 border-slate-950 ring-2 ring-emerald-400/50'
                              : 'bg-slate-700 border-emerald-500/50'
                          }`}
                        />

                        {/* Top line of snapshot */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              {snapshot.versionNumber}
                            </span>
                            {isLatest && (
                              <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                                Version Active
                              </Badge>
                            )}
                            {snapshot.restoredFromVersion && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
                                Restauration de {snapshot.restoredFromVersion}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
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
                          <p className="text-xs font-semibold text-white">
                            {snapshot.summary}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-emerald-400" />
                              <strong className="text-slate-300">{snapshot.authorName}</strong>
                              {snapshot.authorDepartment && (
                                <span className="text-slate-500">({snapshot.authorDepartment})</span>
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
                                  className="flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-emerald-300 cursor-pointer"
                                  title="Cliquer pour copier l'empreinte de sécurité"
                                >
                                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                                  <span>{snapshot.checksum.substring(0, 16)}...</span>
                                  {copiedHash === snapshot.checksum ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/10">
                          {/* Download snapshot */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadSnapshotFile(snapshot)}
                            className="h-6 px-2 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-emerald-500/20 gap-1"
                          >
                            <Download className="w-3 h-3 text-emerald-400" />
                            <span>Télécharger</span>
                          </Button>

                          {/* Inspect / Preview */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectingSnapshot(snapshot)}
                            className="h-6 px-2 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-emerald-500/20 gap-1"
                          >
                            <Eye className="w-3 h-3 text-blue-400" />
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
                              className="h-6 px-2 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-emerald-500/20 gap-1"
                            >
                              <History className="w-3 h-3 text-amber-400" />
                              <span>Diff vs Actuelle</span>
                            </Button>
                          )}

                          {/* Restore button if not latest */}
                          {!isLatest && !readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(selectedFile, snapshot)}
                              className="h-6 px-2 text-[11px] font-bold text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#061A13] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Ajouter un document avec suivi de version</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewFile} className="space-y-3.5">
              {/* File upload picker or name */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
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
                    className="border-emerald-500/30 text-xs bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Parcourir l&apos;ordinateur</span>
                  </Button>
                  {uploadedName && (
                    <span className="text-xs text-emerald-300 font-semibold truncate max-w-[200px]">
                      {uploadedName} ({formatBytes(uploadedSize)})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nom du document
                </label>
                <input
                  type="text"
                  required
                  value={formFileName}
                  onChange={(e) => setFormFileName(e.target.value)}
                  placeholder="ex: Liasse_Fiscale_2026_Audit.xlsx ou Note_Synthese.docx"
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-[#061A13] text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Motif / Note de version initiale (v1.0)
                </label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="ex: Première version du document de synthèse"
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-[#061A13] text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Description générale (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Objectif de ce document, destinataires ou consignes spécifiques..."
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-[#061A13] text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden resize-none"
                />
              </div>

              {/* Text content preview/editor if text file */}
              {formTextContent && (
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Aperçu du contenu texte (modifiable)
                  </label>
                  <textarea
                    rows={4}
                    value={formTextContent}
                    onChange={(e) => setFormTextContent(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-slate-200 outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-500/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                >
                  Créer et Démarrer v1.0
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Version of existing file */}
      {isNewVersionModalOpen && uploadFileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#061A13] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-amber-400" />
                  <span>Publier une nouvelle version de {uploadFileTarget.name}</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Version actuelle : <strong>{uploadFileTarget.currentVersion}</strong> → Prochaine version :{' '}
                  <strong className="text-emerald-300">
                    {calculateNextVersion(uploadFileTarget.currentVersion, formIsMajor)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewVersion} className="space-y-3.5">
              {/* File upload picker */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
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
                    className="border-emerald-500/30 text-xs bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choisir le nouveau fichier</span>
                  </Button>
                  {uploadedName && (
                    <span className="text-xs text-emerald-300 font-semibold truncate max-w-[200px]">
                      {uploadedName} ({formatBytes(uploadedSize)})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Motif du changement / Notes de révision (obligatoire)
                </label>
                <input
                  type="text"
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="ex: Intégration des corrections de l'expert-comptable"
                  className="w-full px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-[#061A13] text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                <input
                  type="checkbox"
                  id="major-version-checkbox"
                  checked={formIsMajor}
                  onChange={(e) => setFormIsMajor(e.target.checked)}
                  className="rounded accent-emerald-400 w-4 h-4"
                />
                <label htmlFor="major-version-checkbox" className="text-xs text-slate-300 cursor-pointer">
                  Marquer comme <strong>version majeure</strong> (ex: {calculateNextVersion(uploadFileTarget.currentVersion, true)})
                </label>
              </div>

              {/* Text content if text document */}
              {uploadFileTarget.versions[0]?.textContent !== undefined && (
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Contenu texte mis à jour
                  </label>
                  <textarea
                    rows={5}
                    value={formTextContent}
                    onChange={(e) => setFormTextContent(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-slate-200 outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-500/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsNewVersionModalOpen(false)}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
                >
                  Enregistrer {calculateNextVersion(uploadFileTarget.currentVersion, formIsMajor)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inspect Snapshot Details */}
      {inspectingSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#061A13] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {inspectingSnapshot.versionNumber}
                </span>
                <h4 className="text-sm font-bold text-white truncate max-w-sm">
                  {inspectingSnapshot.fileName}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSnapshot(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                <div>
                  <span className="text-slate-500 block">Auteur</span>
                  <strong className="text-white">{inspectingSnapshot.authorName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Pôle / Département</span>
                  <strong className="text-emerald-300">{inspectingSnapshot.authorDepartment || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Date et heure</span>
                  <strong className="text-white">
                    {new Date(inspectingSnapshot.createdAt).toLocaleString('fr-FR')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Taille</span>
                  <strong className="text-white">{formatBytes(inspectingSnapshot.sizeBytes)}</strong>
                </div>
                {inspectingSnapshot.checksum && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Empreinte d&apos;intégrité</span>
                    <span className="font-mono text-[10px] text-purple-300 break-all">
                      {inspectingSnapshot.checksum}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-300 block mb-1">Motif de version</span>
                <p className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-slate-200">
                  {inspectingSnapshot.summary}
                </p>
              </div>

              {inspectingSnapshot.textContent && (
                <div>
                  <span className="font-bold text-slate-300 block mb-1">Contenu texte</span>
                  <pre className="p-3 rounded-xl bg-black/60 border border-emerald-500/20 font-mono text-[11px] text-emerald-200 max-h-56 overflow-y-auto whitespace-pre-wrap">
                    {inspectingSnapshot.textContent}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadSnapshotFile(inspectingSnapshot)}
                className="border-emerald-500/30 text-xs bg-emerald-950/40 text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger ce fichier ({inspectingSnapshot.versionNumber})</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInspectingSnapshot(null)}
                className="text-xs text-slate-300 hover:text-white"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Diff comparison between two versions */}
      {diffComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl bg-[#061A13] border border-emerald-500/40 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">
                  Comparaison différentielle : {diffComparison.v1.versionNumber} vs {diffComparison.v2.versionNumber}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDiffComparison(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-400 block mb-0.5">
                    Ancienne version ({diffComparison.v1.versionNumber})
                  </span>
                  <span className="text-[11px] text-slate-300 block">
                    Par {diffComparison.v1.authorName} le {new Date(diffComparison.v1.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <p className="text-[11px] text-slate-400 italic mt-0.5">
                    « {diffComparison.v1.summary} »
                  </p>
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-300 block mb-0.5">
                    Version active ({diffComparison.v2.versionNumber})
                  </span>
                  <span className="text-[11px] text-slate-300 block">
                    Par {diffComparison.v2.authorName} le {new Date(diffComparison.v2.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <p className="text-[11px] text-slate-400 italic mt-0.5">
                    « {diffComparison.v2.summary} »
                  </p>
                </div>
              </div>

              {/* Text diff rendering if text available */}
              {diffComparison.v1.textContent !== undefined && diffComparison.v2.textContent !== undefined ? (
                <div>
                  <span className="font-bold text-slate-300 block mb-1">Différence de texte</span>
                  <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/20 font-mono text-[11px] max-h-72 overflow-y-auto space-y-0.5">
                    {computeLineDiff(diffComparison.v1.textContent, diffComparison.v2.textContent).map((line, lIdx) => {
                      if (line.type === 'added') {
                        return (
                          <div key={lIdx} className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                            + {line.content}
                          </div>
                        );
                      }
                      if (line.type === 'removed') {
                        return (
                          <div key={lIdx} className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                            - {line.content}
                          </div>
                        );
                      }
                      return (
                        <div key={lIdx} className="text-slate-400 px-2 py-0.5">
                          &nbsp;&nbsp;{line.content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-center text-slate-400 text-xs">
                  <p className="mb-1 font-bold text-white">Fichiers binaires (Word / Excel / PDF / Image)</p>
                  <p>
                    La comparaison textuelle directe n&apos;est pas disponible pour ce type de fichier.
                    Vous pouvez télécharger chaque version séparément pour inspection locale.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-emerald-500/20">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDiffComparison(null)}
                className="text-xs text-slate-300 hover:text-white"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
