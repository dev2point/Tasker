'use client';

import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  X,
  RotateCcw,
  CalendarDays,
} from 'lucide-react';
import { Task } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { formatDueDateFrench } from '@/lib/reminders';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';

interface ActiveReminderModalProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onSnoozeTomorrow: (taskId: string) => void;
  onPostponeDueDate?: (taskId: string, days: number) => void;
  isSidebarCollapsed?: boolean;
}

export const ActiveReminderModal: React.FC<ActiveReminderModalProps> = ({
  task,
  onClose,
  onComplete,
  onSnooze,
  onSnoozeTomorrow,
  onPostponeDueDate,
  isSidebarCollapsed = false,
}) => {
  const [showRescheduleOptions, setShowRescheduleOptions] = useState(false);

  if (!task) return null;

  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const handleCompleteWithCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });
    onComplete(task.id);
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 text-[#0B1F30] dark:text-slate-100 cursor-default"
      >
        {/* Modal Header */}
        <div className="bg-[#F4F7FA] dark:bg-[#061826]/70 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 p-5 sm:p-6 text-center relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFF4E8] dark:bg-[#F77F00]/20 border border-[#F77F00]/35 text-[#F77F00] flex items-center justify-center mb-3 shadow-xs">
            <BellRing className="w-6 h-6 text-[#F77F00]" />
          </div>

          <Badge variant="orange" className="text-[10px] font-bold uppercase tracking-wide mb-1.5">
            Rappel automatique
          </Badge>
          <h2 id="reminder-title" className="text-lg sm:text-xl font-bold tracking-tight text-[#0B1F30] dark:text-white line-clamp-2 px-2">
            {task.title}
          </h2>
        </div>

        {/* Task Details Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {task.description && (
            <div className="bg-[#F4F7FA] dark:bg-[#061826]/55 p-3.5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-xs text-[#486075] dark:text-slate-200 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
              {task.description}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
              <Calendar className="w-4 h-4 text-[#004266] dark:text-[#7CC4EB] shrink-0" />
              <div className="min-w-0">
                <span className="text-[#627D98] dark:text-slate-400 block text-[10px] font-medium">Échéance réelle</span>
                <span className="font-bold text-[#0B1F30] dark:text-white truncate block">
                  {formatDueDateFrench(task.dueDate, task.dueTime)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityInfo.dot}`} />
              <div className="min-w-0">
                <span className="text-[#627D98] dark:text-slate-400 block text-[10px] font-medium">Priorité</span>
                <span className="font-bold text-[#0B1F30] dark:text-white truncate block">
                  {priorityInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Subtasks summary if any */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="text-xs border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-xl p-3 bg-[#F4F7FA] dark:bg-[#061826]/55">
              <span className="font-bold text-[#004266] dark:text-[#7CC4EB] block mb-1.5">
                Sous-tâches ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 text-[#0B1F30] dark:text-slate-200 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.completed ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
                    <span className={st.completed ? 'line-through text-[#627D98] dark:text-slate-400' : 'font-medium'}>{st.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Complete Primary Button */}
            <Button
              variant="accent"
              size="lg"
              onClick={handleCompleteWithCelebration}
              className="w-full font-bold text-sm shadow-sm gap-2 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Marquer comme terminée</span>
            </Button>

            {/* Snooze Reminder (Alarme) Options */}
            <div className="pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#004266] dark:text-[#7CC4EB] uppercase tracking-wider">
                  Reporter le rappel
                </span>
                <button
                  type="button"
                  onClick={() => setShowRescheduleOptions(!showRescheduleOptions)}
                  className="text-[11px] text-[#004266] dark:text-[#7CC4EB] hover:text-[#F77F00] underline font-medium cursor-pointer"
                >
                  {showRescheduleOptions ? 'Masquer dates' : 'Changer date d’échéance'}
                </button>
              </div>

              {/* Snooze notification timers */}
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnooze(task.id, 10)}
                  className="text-xs font-semibold cursor-pointer"
                  title="Sonner à nouveau dans 10 minutes"
                >
                  +10 min
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnooze(task.id, 30)}
                  className="text-xs font-semibold cursor-pointer"
                  title="Sonner à nouveau dans 30 minutes"
                >
                  +30 min
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnooze(task.id, 60)}
                  className="text-xs font-semibold cursor-pointer"
                  title="Sonner à nouveau dans 1 heure"
                >
                  +1h
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnoozeTomorrow(task.id)}
                  className="text-xs font-semibold cursor-pointer"
                  title="Sonner demain matin à 9h00"
                >
                  Demain 9h
                </Button>
              </div>

              {/* Reschedule Task Due Date (Optional expansion) */}
              {showRescheduleOptions && onPostponeDueDate && (
                <div className="p-2.5 rounded-xl bg-[#FFF4E8] dark:bg-[#F77F00]/12 border border-[#F77F00]/30 space-y-1.5 animate-in fade-in duration-100">
                  <span className="text-[10px] font-bold text-[#B85A00] dark:text-[#FFB35C] block uppercase">
                    Décaler l’échéance de la tâche :
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onPostponeDueDate(task.id, 1)}
                      className="text-[11px] font-semibold cursor-pointer"
                    >
                      +1 jour
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onPostponeDueDate(task.id, 3)}
                      className="text-[11px] font-semibold cursor-pointer"
                    >
                      +3 jours
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onPostponeDueDate(task.id, 7)}
                      className="text-[11px] font-semibold cursor-pointer"
                    >
                      +1 semaine
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
