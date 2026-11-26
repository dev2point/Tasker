'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  X,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { User, UserRole } from '@/types/user';
import { Task } from '@/types/task';

interface PostgresTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSelectUser: (user: User) => void;
  tasks: Task[];
  onTasksSynced?: (tasks: Task[]) => void;
  isSidebarCollapsed?: boolean;
}

const ROLE_LABELS_FR: Record<UserRole, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  member: 'Collaborateur',
  guest: 'Invité',
};

export const PostgresTeamModal: React.FC<PostgresTeamModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  tasks,
  onTasksSynced,
}) => {
  const [cloudStatus, setCloudStatus] = useState<{
    connected?: boolean;
    loading: boolean;
  }>({ loading: true });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    fetch('/api/db/status')
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          setCloudStatus({ connected: Boolean(data?.connected), loading: false });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCloudStatus({ connected: false, loading: false });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
      });
      const data = await res.json();
      if (data.synced) {
        setSyncFeedback({
          message: `Synchronisation réussie : ${data.count} tâche${data.count > 1 ? 's' : ''} à jour sur l'espace cloud.`,
        });
        if (onTasksSynced && data.tasks) {
          onTasksSynced(data.tasks);
        }
      } else {
        setSyncFeedback({
          message: 'Sauvegarde locale conservée sur cet appareil (espace cloud indisponible).',
        });
      }
    } catch {
      setSyncFeedback({
        message: 'Impossible de synchroniser pour le moment. Vos données locales restent intactes.',
        isError: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md p-4 animate-in fade-in duration-150 cursor-pointer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-sync-modal-title"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0B2438] text-[#0B1F30] dark:text-slate-100 shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 cursor-default"
        >
          {/* Header */}
          <div className="bg-[#F4F7FA] dark:bg-[#061826] border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/35 flex items-center justify-center text-[#004266] dark:text-[#7CC4EB] shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="cloud-sync-modal-title"
                    className="font-bold text-base sm:text-lg text-[#0B1F30] dark:text-white"
                  >
                    Sauvegarde &amp; Synchronisation
                  </h2>
                  {!cloudStatus.loading && (
                    <Badge
                      variant={cloudStatus.connected ? 'success' : 'orange'}
                      className="text-[10px] font-bold"
                    >
                      {cloudStatus.connected ? 'Cloud actif' : 'Sauvegarde locale'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#486075] dark:text-[#9FB3C8] font-medium">
                  État de vos données et synchronisation de l&apos;espace de travail
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 rounded-lg text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 text-[#0B1F30] dark:text-slate-200">
            {/* Cloud Status Card */}
            <div
              className={`p-4 rounded-2xl border ${
                cloudStatus.connected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/35'
                  : 'bg-[#F4F7FA] dark:bg-[#061826] border-[#D8E2EC] dark:border-[#94B8D6]/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {cloudStatus.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <HardDrive className="w-5 h-5 text-[#004266] dark:text-[#7CC4EB] shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-[#0B1F30] dark:text-white">
                    {cloudStatus.loading
                      ? 'Vérification de la sauvegarde en cours...'
                      : cloudStatus.connected
                      ? 'Sauvegarde automatique cloud active'
                      : 'Sauvegarde locale active sur cet appareil'}
                  </h4>
                  <p className="text-xs text-[#486075] dark:text-slate-300 mt-1 leading-relaxed">
                    {cloudStatus.loading
                      ? 'Un instant pendant la vérification de votre espace partagé.'
                      : cloudStatus.connected
                      ? 'Vos tâches, dossiers et modifications sont enregistrés automatiquement sur l’espace sécurisé du cabinet.'
                      : 'Vos tâches restent enregistrées sur votre navigateur en toute sécurité et pourront être synchronisées dès que l’espace cloud sera disponible.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Manual Sync Card */}
            <div className="p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826] border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div>
                  <h4 className="text-xs font-bold text-[#0B1F30] dark:text-white">
                    Synchroniser mes tâches
                  </h4>
                  <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8] mt-0.5">
                    Met à jour les {tasks.length} tâche{tasks.length > 1 ? 's' : ''} de votre espace avec la sauvegarde partagée.
                  </p>
                </div>
                <Button
                  variant="accent"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  size="sm"
                  className="gap-1.5 font-bold text-xs cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser'}</span>
                </Button>
              </div>

              {syncFeedback && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-medium ${
                    syncFeedback.isError
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-500/35 text-rose-700 dark:text-rose-200'
                      : 'bg-[#EBF4FA] dark:bg-[#103049] border-[#004266]/20 dark:border-[#3895C9]/35 text-[#004266] dark:text-[#7CC4EB]'
                  }`}
                >
                  {syncFeedback.message}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:px-5 bg-[#F4F7FA] dark:bg-[#061826] border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#486075] dark:text-slate-300 min-w-0">
              {currentUser ? (
                <>
                  <span className="font-semibold text-[#0B1F30] dark:text-white truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[#8599AD]">•</span>
                  <span className="text-[#004266] dark:text-[#7CC4EB] font-bold shrink-0">
                    {ROLE_LABELS_FR[currentUser.role] || currentUser.role}
                  </span>
                </>
              ) : (
                <span className="text-[#8599AD] italic">Session locale</span>
              )}
            </div>
            <Button onClick={onClose} variant="default" size="sm" className="text-xs font-semibold cursor-pointer shrink-0">
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
