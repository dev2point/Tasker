'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogIn,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Building,
  HelpCircle,
  Download,
} from 'lucide-react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { soundManager } from '@/lib/sound';
import {
  generateExcelReport,
  generateWordDossier,
  downloadBlob,
} from '@/lib/microsoft/documentGenerators';
import {
  getMsalInstance,
  GRAPH_SCOPES,
  isMsalConfigured,
} from '@/lib/microsoft/msalConfig';
import {
  fetchM365Profile,
  syncTasksToOutlookCalendar,
  uploadDocumentToOneDrive,
  GraphUserProfile,
} from '@/lib/microsoft/graphService';

interface Microsoft365ModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  isSidebarCollapsed?: boolean;
}

export const Microsoft365Modal: React.FC<Microsoft365ModalProps> = ({
  isOpen,
  onClose,
  tasks,
  isSidebarCollapsed = false,
}) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'outlook' | 'onedrive' | 'config'>('docs');
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false);
  const [isUploadingOneDrive, setIsUploadingOneDrive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [m365User, setM365User] = useState<GraphUserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Check existing session if MSAL configured
  useEffect(() => {
    if (!isOpen || !isMsalConfigured) return;

    let mounted = true;
    (async () => {
      try {
        const msal = await getMsalInstance();
        const accounts = msal.getAllAccounts();
        if (accounts.length > 0) {
          const silentToken = await msal.acquireTokenSilent({
            account: accounts[0],
            scopes: GRAPH_SCOPES,
          });
          if (mounted) {
            setAccessToken(silentToken.accessToken);
            const profile = await fetchM365Profile(silentToken.accessToken);
            setM365User(profile);
          }
        }
      } catch {
        // Silent token acquire failure - user can log in manually
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    if (type === 'success') {
      soundManager.playCompleteSound();
    } else if (type === 'error') {
      soundManager.playClickSound();
    }
    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  const handleLogin = async () => {
    if (!isMsalConfigured) {
      showFeedback(
        'info',
        'Pour vous connecter en direct avec votre compte pro, configurez NEXT_PUBLIC_AZURE_CLIENT_ID dans vos paramètres. Les exports Excel et Word fonctionnent immédiatement sans configuration !'
      );
      setActiveTab('config');
      return;
    }

    setIsConnecting(true);
    try {
      const msal = await getMsalInstance();
      const loginResponse = await msal.loginPopup({
        scopes: GRAPH_SCOPES,
        prompt: 'select_account',
      });
      setAccessToken(loginResponse.accessToken);
      const profile = await fetchM365Profile(loginResponse.accessToken);
      setM365User(profile);
      showFeedback('success', `Connecté avec succès : ${profile.displayName} (${profile.mail || profile.userPrincipalName})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion Microsoft';
      showFeedback('error', `Échec de l'authentification Microsoft 365 : ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const msal = await getMsalInstance();
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        await msal.logoutPopup({ account: accounts[0] });
      }
      setM365User(null);
      setAccessToken(null);
      showFeedback('info', 'Déconnecté du compte Microsoft 365');
    } catch {
      setM365User(null);
      setAccessToken(null);
    }
  };

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const blob = await generateExcelReport(tasks, 'Cabinet Juridique & Fiscal');
      const filename = `Rapport_Dossiers_Cabinet_${new Date().toISOString().split('T')[0]}.xlsx`;
      downloadBlob(blob, filename);
      showFeedback('success', `Classeur Excel natif (.xlsx) généré et téléchargé avec succès ! (${tasks.length} dossiers inclus)`);
    } catch (err) {
      showFeedback('error', 'Erreur lors de la création du fichier Excel.');
      console.error(err);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleDownloadWord = async () => {
    setIsGeneratingWord(true);
    try {
      const blob = await generateWordDossier(tasks, 'Cabinet Juridique & Fiscal');
      const filename = `Synthese_Juridique_Cabinet_${new Date().toISOString().split('T')[0]}.docx`;
      downloadBlob(blob, filename);
      showFeedback('success', `Document Word officiel (.docx) généré et téléchargé avec succès !`);
    } catch (err) {
      showFeedback('error', 'Erreur lors de la création du document Word.');
      console.error(err);
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const handleSyncOutlook = async () => {
    if (!accessToken) {
      showFeedback('error', 'Veuillez vous connecter à Microsoft 365 avec votre compte professionnel pour synchroniser votre calendrier Outlook.');
      return;
    }

    setIsSyncingOutlook(true);
    try {
      const result = await syncTasksToOutlookCalendar(accessToken, tasks);
      if (result.syncedCount > 0) {
        showFeedback('success', `${result.syncedCount} échéance(s) ont été synchronisées dans votre calendrier Outlook.`);
      } else {
        showFeedback('info', 'Aucune tâche avec date d’échéance trouvée à synchroniser.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur API Graph';
      showFeedback('error', `Échec de la synchronisation Outlook : ${msg}`);
    } finally {
      setIsSyncingOutlook(false);
    }
  };

  const handleUploadToOneDrive = async (format: 'excel' | 'word') => {
    if (!accessToken) {
      showFeedback('error', 'Veuillez vous connecter à Microsoft 365 pour sauvegarder sur votre OneDrive entreprise.');
      return;
    }

    setIsUploadingOneDrive(true);
    try {
      let blob: Blob;
      let filename: string;

      if (format === 'excel') {
        blob = await generateExcelReport(tasks, 'Cabinet Juridique & Fiscal');
        filename = `Synthese_Dossiers_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        blob = await generateWordDossier(tasks, 'Cabinet Juridique & Fiscal');
        filename = `Rapport_Juridique_${new Date().toISOString().split('T')[0]}.docx`;
      }

      const uploaded = await uploadDocumentToOneDrive(accessToken, {
        fileName: filename,
        content: blob,
        folderName: 'Cabinet_Documents_Metier',
      });

      showFeedback(
        'success',
        `Fichier "${uploaded.name}" déposé avec succès dans votre OneDrive (dossier "Cabinet_Documents_Metier") !`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur OneDrive';
      showFeedback('error', `Échec du téléversement OneDrive : ${msg}`);
    } finally {
      setIsUploadingOneDrive(false);
    }
  };

  const tasksWithDueDatesCount = tasks.filter((t) => t.dueDate).length;

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="m365-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 max-w-2xl w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-[#0B1F30] dark:text-slate-100 flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#004266] via-[#0078D4] to-[#0E5D8A] flex items-center justify-center text-white shadow-md shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="m365-modal-title" className="text-base sm:text-lg font-bold text-[#0B1F30] dark:text-white flex items-center gap-2 flex-wrap">
                Écosystème Microsoft 365
                <Badge className="bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border-[#004266]/20 dark:border-[#3895C9]/35 text-[10px] font-bold py-0.5">
                  Office • Outlook • OneDrive
                </Badge>
              </h2>
              <p className="text-xs text-[#486075] dark:text-slate-300">
                Interopérabilité native pour cabinets juridiques, comptables et fiscaux
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white p-1.5 rounded-xl hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                : feedback.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                : 'bg-[#EBF4FA] dark:bg-[#004266]/55 border-[#004266]/25 dark:border-[#3895C9]/40 text-[#004266] dark:text-[#CBE7F7]'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
            {feedback.type === 'info' && <ShieldCheck className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB] shrink-0 mt-0.5" />}
            <span className="flex-1 leading-relaxed">{feedback.message}</span>
          </div>
        )}

        {/* Status Bar / Account connection */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex rounded-full h-2.5 w-2.5 shrink-0 ${
                m365User ? 'bg-emerald-500' : 'bg-[#F77F00]'
              }`}
            />
            <div className="truncate">
              {m365User ? (
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                  Connecté : <strong className="text-[#0B1F30] dark:text-white">{m365User.displayName}</strong> ({m365User.mail || m365User.userPrincipalName})
                </span>
              ) : (
                <span className="text-[#486075] dark:text-slate-300">
                  Compte M365 : <strong className="text-[#0B1F30] dark:text-slate-100">{isMsalConfigured ? 'Prêt à connecter' : 'Mode Fichiers Directs (Excel/Word)'}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {m365User ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="h-7 px-2.5 text-xs border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-800 dark:hover:text-white cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Déconnexion
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={handleLogin}
                disabled={isConnecting}
                className="h-7 px-3 text-xs font-semibold shadow-sm cursor-pointer"
              >
                {isConnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                )}
                Se connecter à Microsoft 365
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#EDF2F7] dark:bg-[#061826]/75 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/18 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-[#004266] dark:bg-[#0E5D8A] text-white shadow-sm'
                : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#103049]/70'
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'docs' ? 'text-[#F77F00]' : ''}`} />
            <span className="truncate">Excel & Word</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outlook')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              activeTab === 'outlook'
                ? 'bg-[#004266] dark:bg-[#0E5D8A] text-white shadow-sm'
                : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#103049]/70'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'outlook' ? 'text-[#F77F00]' : ''}`} />
            <span className="truncate">Outlook</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('onedrive')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              activeTab === 'onedrive'
                ? 'bg-[#004266] dark:bg-[#0E5D8A] text-white shadow-sm'
                : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#103049]/70'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'onedrive' ? 'text-[#F77F00]' : ''}`} />
            <span className="truncate">OneDrive GED</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`py-2 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all truncate cursor-pointer ${
              activeTab === 'config'
                ? 'bg-[#004266] dark:bg-[#0E5D8A] text-white shadow-sm'
                : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#103049]/70'
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config' ? 'text-[#F77F00]' : ''}`} />
            <span className="truncate">Configuration</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
          {/* TAB 1: EXCEL & WORD */}
          {activeTab === 'docs' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#107C41]/12 dark:bg-[#107C41]/25 border border-[#107C41]/30 dark:border-[#107C41]/50 text-[#107C41] dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2 flex-wrap">
                        Classeur Excel Professionnel (.xlsx)
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                          exceljs
                        </span>
                      </h3>
                      <p className="text-xs text-[#486075] dark:text-slate-300">
                        Génération native avec mise en page du cabinet, formules de calcul, multi-feuilles et filtres automatiques.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15">
                  <span className="text-[11px] text-[#627D98] dark:text-slate-400">
                    Comprend 2 feuilles : <em>Dossiers & Tâches</em> + <em>Synthèse & KPIs</em>
                  </span>
                  <Button
                    onClick={handleDownloadExcel}
                    disabled={isGeneratingExcel}
                    className="bg-[#107C41] hover:bg-[#0E6837] text-white font-bold text-xs h-8 px-3.5 rounded-xl shadow-sm cursor-pointer"
                  >
                    {isGeneratingExcel ? (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Télécharger Excel (.xlsx)
                  </Button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#2B579A]/12 dark:bg-[#2B579A]/25 border border-[#2B579A]/30 dark:border-[#2B579A]/50 text-[#2B579A] dark:text-[#7CC4EB] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-2 flex-wrap">
                        Rapport Juridique & Actes Word (.docx)
                        <span className="text-[10px] bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 px-1.5 py-0.5 rounded font-mono">
                          docx
                        </span>
                      </h3>
                      <p className="text-xs text-[#486075] dark:text-slate-300">
                        Document Word officiel comprenant en-têtes formels, tableaux de suivi et zone de visa / signature pour les associés.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15">
                  <span className="text-[11px] text-[#627D98] dark:text-slate-400">
                    Modèle prêt pour impression, archivage et comités
                  </span>
                  <Button
                    onClick={handleDownloadWord}
                    disabled={isGeneratingWord}
                    className="bg-[#2B579A] hover:bg-[#204070] text-white font-bold text-xs h-8 px-3.5 rounded-xl shadow-sm cursor-pointer"
                  >
                    {isGeneratingWord ? (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Générer Rapport Word (.docx)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OUTLOOK */}
          {activeTab === 'outlook' && (
            <div className="p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0078D4]/12 dark:bg-[#0078D4]/25 border border-[#0078D4]/30 dark:border-[#0078D4]/50 text-[#0078D4] dark:text-[#7CC4EB] flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F30] dark:text-white">Synchronisation Calendrier Outlook</h3>
                  <p className="text-xs text-[#486075] dark:text-slate-300">
                    Publiez automatiquement les échéances fiscales, déclarations et rendez-vous du cabinet dans Outlook.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[#486075] dark:text-slate-300">
                  <span>Tâches avec date d’échéance éligibles :</span>
                  <span className="font-bold text-[#004266] dark:text-[#7CC4EB] tabular-nums">{tasksWithDueDatesCount} / {tasks.length}</span>
                </div>
                <div className="flex items-center justify-between text-[#486075] dark:text-slate-300">
                  <span>Rappels programmés Outlook :</span>
                  <span className="text-[#627D98] dark:text-slate-400">2 heures avant chaque échéance</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15">
                <div className="text-[11px] text-[#627D98] dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
                  Synchronisation directe via Microsoft Graph API
                </div>
                <Button
                  variant="accent"
                  onClick={handleSyncOutlook}
                  disabled={isSyncingOutlook}
                  className="font-bold text-xs h-9 px-4 rounded-xl shadow-sm cursor-pointer"
                >
                  {isSyncingOutlook ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Synchroniser vers Outlook
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: ONEDRIVE */}
          {activeTab === 'onedrive' && (
            <div className="p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0078D4]/12 dark:bg-[#0078D4]/25 border border-[#0078D4]/30 dark:border-[#0078D4]/50 text-[#0078D4] dark:text-[#7CC4EB] flex items-center justify-center shrink-0">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F30] dark:text-white">Archivage GED OneDrive & SharePoint</h3>
                  <p className="text-xs text-[#486075] dark:text-slate-300">
                    Déposez les livrables d’audit et états de synthèse directement dans l’espace cloud sécurisé du cabinet.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-2">
                  <div className="text-xs font-bold text-[#0B1F30] dark:text-emerald-300 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#107C41] dark:text-emerald-400" />
                    Classeur Excel vers OneDrive
                  </div>
                  <p className="text-[11px] text-[#486075] dark:text-slate-400">
                    Envoi instantané dans le dossier <code className="px-1 py-0.5 rounded bg-[#EDF2F7] dark:bg-[#061826] text-[#004266] dark:text-[#7CC4EB]">Cabinet_Documents_Metier</code>.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleUploadToOneDrive('excel')}
                    disabled={isUploadingOneDrive}
                    className="w-full bg-[#107C41] hover:bg-[#0E6837] text-white font-semibold text-xs h-8 rounded-lg cursor-pointer"
                  >
                    Sauvegarder Excel sur OneDrive
                  </Button>
                </div>

                <div className="p-3 bg-white dark:bg-[#0B2438] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-2">
                  <div className="text-xs font-bold text-[#0B1F30] dark:text-[#7CC4EB] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#2B579A] dark:text-[#7CC4EB]" />
                    Document Word vers OneDrive
                  </div>
                  <p className="text-[11px] text-[#486075] dark:text-slate-400">
                    Archivage du dossier juridique pour co-édition dans Word Online.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleUploadToOneDrive('word')}
                    disabled={isUploadingOneDrive}
                    className="w-full bg-[#2B579A] hover:bg-[#204070] text-white font-semibold text-xs h-8 rounded-lg cursor-pointer"
                  >
                    Sauvegarder Word sur OneDrive
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURATION AZURE */}
          {activeTab === 'config' && (
            <div className="p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3 text-xs leading-relaxed">
              <h3 className="text-sm font-bold text-[#0B1F30] dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#F77F00]" />
                Guide d’intégration Microsoft Entra ID (Azure AD)
              </h3>
              
              <ol className="list-decimal pl-4 space-y-2 text-[#486075] dark:text-slate-300">
                <li>
                  Connectez-vous avec un <strong className="text-[#0B1F30] dark:text-white">compte professionnel Microsoft 365</strong> sur{' '}
                  <a
                    href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#004266] dark:text-[#7CC4EB] font-bold underline inline-flex items-center gap-0.5"
                  >
                    Microsoft Entra admin center <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  <span className="text-[11px] text-[#627D98] dark:text-slate-400">
                    (Pas de compte pro ? Obtenez un tenant gratuit via le{' '}
                    <a
                      href="https://developer.microsoft.com/microsoft-365/dev-program"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#DE7200] dark:text-[#FFB35C] font-semibold underline"
                    >
                      M365 Developer Program
                    </a>
                    ).
                  </span>
                </li>
                <li>
                  Créez une nouvelle application (ex: <em>« Cabinet Applet M365 »</em>) et sélectionnez <em>« Comptes dans un annuaire organisationnel »</em>.
                </li>
                <li>
                  Dans <strong className="text-[#0B1F30] dark:text-white">Authentification</strong>, ajoutez une plateforme <strong className="text-[#0B1F30] dark:text-white">Application monopage (SPA)</strong> et définissez l&apos;URL de redirection sur :
                  <div className="mt-1 p-2 bg-white dark:bg-[#04101A]/80 border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg font-mono text-[11px] text-[#004266] dark:text-[#7CC4EB] select-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://votre-domaine.com'}
                  </div>
                </li>
                <li>
                  Dans <strong className="text-[#0B1F30] dark:text-white">Autorisations de l’API</strong>, ajoutez les autorisations déléguées Microsoft Graph :
                  <div className="mt-1 flex flex-wrap gap-1">
                    {GRAPH_SCOPES.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 rounded font-mono text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </li>
                <li>
                  Copiez l&apos;<strong className="text-[#0B1F30] dark:text-white">ID d’application (client)</strong> et l&apos;<strong className="text-[#0B1F30] dark:text-white">ID de l&apos;annuaire (locataire)</strong> puis déclarez-les dans votre fichier <code className="px-1 py-0.5 rounded bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-[#004266] dark:text-[#7CC4EB]">.env</code> :
                  <div className="mt-1 p-2 bg-white dark:bg-[#04101A]/80 border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg font-mono text-[11px] text-[#0B1F30] dark:text-slate-200 space-y-1">
                    <div>NEXT_PUBLIC_AZURE_CLIENT_ID=&quot;votre-client-id-azure&quot;</div>
                    <div>NEXT_PUBLIC_AZURE_TENANT_ID=&quot;common&quot; <span className="text-[#627D98] dark:text-slate-400 font-sans text-[10px]">(ou l&apos;ID de locataire de votre cabinet)</span></div>
                  </div>
                  <div className="mt-1.5 text-[11px] text-[#004266] dark:text-[#7CC4EB]">
                    Consultez également le guide complet dans <code className="px-1 py-0.5 rounded bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/20">docs/guides/azure-entra-id-setup.md</code>.
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 text-xs">
          <span className="text-[#627D98] dark:text-slate-400 text-[11px]">
            Formats conformes aux standards Office Open XML (ISO/IEC 29500)
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 text-xs cursor-pointer"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
