'use client';

import React from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Trash2,
  Clock,
  AlertTriangle,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { TaskNotification, Task } from '@/types/task';
import { formatDueDateFrench } from '@/lib/reminders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface NotificationDropdownProps {
  notifications: TaskNotification[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectTask: (taskId: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  tasks,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectTask,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ModalPortal>
      <div
        id="notifications-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-[95] flex items-start justify-end p-3 sm:p-6 bg-[#061826]/65 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Centre de notifications"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-150 mt-12 sm:mt-14 text-[#0B1F30] dark:text-slate-100 cursor-default"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between bg-[#F4F7FA] dark:bg-[#061826]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F77F00]/15 text-[#F77F00] border border-[#F77F00]/30 flex items-center justify-center shrink-0">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#0B1F30] dark:text-white">Centre de Notifications</h3>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] py-0 px-1.5 font-black tabular-nums h-4.5 flex items-center shadow-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[#486075] dark:text-slate-300 font-medium tabular-nums">
                {unreadCount > 0
                  ? `${unreadCount} non lue(s)`
                  : 'Toutes les notifications sont lues'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onMarkAllAsRead}
                  title="Tout marquer comme lu"
                  className="text-[#486075] dark:text-slate-400 hover:text-[#004266] dark:hover:text-[#7CC4EB]"
                >
                  <CheckCheck className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClearAll}
                  title="Tout effacer"
                  className="text-[#486075] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[#486075] dark:text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-[#EDF2F7] dark:bg-[#061826]/70 text-[#004266] dark:text-[#3895C9] border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center justify-center mx-auto mb-2.5">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-bold text-[#0B1F30] dark:text-white">Aucune notification pour le moment</p>
              <p className="text-xs text-[#486075] dark:text-slate-300 mt-1 max-w-xs mx-auto">
                Vos assignations, validations de tâches et rappels d&apos;échéance apparaîtront ici.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const matchedTask = tasks.find((t) => t.id === notif.taskId);
              const isOverdue = notif.type === 'overdue';
              const isAssigned = notif.type === 'assigned';
              const isTaskCompleted = notif.type === 'task_completed';
              const isAdminAction =
                notif.type === 'admin_update' ||
                notif.type === 'admin_completed' ||
                notif.type === 'admin_delete';

              const getNotificationIcon = () => {
                if (isAssigned) {
                  return <UserCheck className="w-4 h-4 text-[#004266] dark:text-sky-300" />;
                }
                if (isTaskCompleted) {
                  return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />;
                }
                if (notif.type === 'admin_completed') {
                  return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />;
                }
                if (notif.type === 'admin_delete') {
                  return <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-300" />;
                }
                if (notif.type === 'admin_update') {
                  return <Shield className="w-4 h-4 text-purple-600 dark:text-purple-300" />;
                }
                if (isOverdue) {
                  return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-300" />;
                }
                return <Clock className="w-4 h-4 text-[#F77F00] dark:text-amber-300" />;
              };

              const getKindTag = () => {
                if (isAssigned) return { label: 'Assignation', cls: 'text-[#004266] dark:text-sky-300' };
                if (isTaskCompleted) return { label: 'Terminée', cls: 'text-emerald-700 dark:text-emerald-300' };
                if (isAdminAction) return { label: 'Admin', cls: 'text-purple-700 dark:text-purple-300' };
                if (isOverdue) return { label: 'Retard', cls: 'text-rose-700 dark:text-rose-300' };
                return null;
              };

              const kindTag = getKindTag();

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read && onMarkAsRead) {
                      onMarkAsRead(notif.id);
                    }
                    if (notif.type !== 'admin_delete' && notif.taskId) {
                      onSelectTask(notif.taskId);
                    }
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-xs flex items-start gap-3 ${
                    notif.read
                      ? 'bg-[#F4F7FA] dark:bg-[#061826]/40 border-[#D8E2EC] dark:border-[#94B8D6]/15 opacity-75 hover:opacity-100'
                      : isAssigned
                      ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-500/40'
                      : isTaskCompleted
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-400/40'
                      : isAdminAction
                      ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-500/40'
                      : isOverdue
                      ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-200 dark:border-rose-500/40'
                      : 'bg-[#004266]/5 dark:bg-[#103049]/70 border-[#004266]/20 dark:border-[#3895C9]/40'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                      isAssigned
                        ? 'bg-sky-100 dark:bg-sky-500/20 border-sky-200 dark:border-sky-500/30'
                        : isTaskCompleted
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-400/30'
                        : isAdminAction
                        ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30'
                        : isOverdue
                        ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30'
                        : 'bg-[#F77F00]/15 dark:bg-amber-500/20 border-[#F77F00]/30 dark:border-amber-500/30'
                    }`}
                  >
                    {getNotificationIcon()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {kindTag && (
                          <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${kindTag.cls}`}>
                            {kindTag.label} ·
                          </span>
                        )}
                        <span className="font-bold text-xs text-[#0B1F30] dark:text-white truncate">
                          {notif.taskTitle}
                        </span>
                      </div>
                      {!notif.read && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#F77F00] shrink-0"
                          title="Non lue"
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-[#486075] dark:text-slate-300 mt-0.5 font-medium leading-relaxed">
                      {notif.message ? (
                        notif.message
                      ) : (
                        <>
                          {isOverdue ? 'Échéance dépassée' : 'Rappel d’échéance'} :{' '}
                          {matchedTask ? formatDueDateFrench(matchedTask.dueDate, matchedTask.dueTime) : ''}
                        </>
                      )}
                    </p>

                    <span className="text-[10px] text-[#C26200] dark:text-amber-300/90 font-mono tabular-nums mt-1 block">
                      {new Date(notif.triggerTime).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      ·{' '}
                      {new Date(notif.triggerTime).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
