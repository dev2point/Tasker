'use client';

import React from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { TaskNotification, Task } from '@/types/task';
import { formatDueDateFrench } from '@/lib/reminders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NotificationDropdownProps {
  notifications: TaskNotification[];
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectTask: (taskId: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  tasks,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearAll,
  onSelectTask,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Centre de notifications"
        className="bg-[#061A13]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-500/30 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-150 mt-12 sm:mt-14 text-slate-100"
      >
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Centre de Rappels</h3>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-black h-4.5 flex items-center shadow-xs bg-rose-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                {unreadCount > 0 ? `${unreadCount} non lu(s)` : 'Tous les rappels sont lus'}
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
                  className="text-slate-400 hover:text-amber-300 hover:bg-emerald-500/20"
                >
                  <CheckCheck className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClearAll}
                  title="Tout effacer"
                  className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-emerald-500/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2.5">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-bold text-white">Aucun rappel pour le moment</p>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                Vos alertes et échéances automatiques apparaîtront ici.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const matchedTask = tasks.find((t) => t.id === notif.taskId);
              const isOverdue = notif.type === 'overdue';

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onSelectTask(notif.taskId);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-xs flex items-start gap-3 ${
                    notif.read
                      ? 'bg-emerald-950/30 border-emerald-500/20 opacity-75 hover:opacity-100'
                      : isOverdue
                      ? 'bg-rose-950/60 border-rose-500/40'
                      : 'bg-emerald-950/60 border-emerald-500/40'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                      isOverdue
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isOverdue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-white truncate">
                        {notif.taskTitle}
                      </span>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                      {isOverdue ? 'Échéance dépassée' : 'Rappel d’échéance'} :{' '}
                      {matchedTask ? formatDueDateFrench(matchedTask.dueDate, matchedTask.dueTime) : ''}
                    </p>

                    <span className="text-[10px] text-amber-300 font-mono mt-1 block">
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
  );
};
