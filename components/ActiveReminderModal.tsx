'use client';

import React from 'react';
import {
  BellRing,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  X,
  RotateCcw,
} from 'lucide-react';
import { Task } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { formatDueDateFrench } from '@/lib/reminders';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ActiveReminderModalProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onSnoozeTomorrow: (taskId: string) => void;
}

export const ActiveReminderModal: React.FC<ActiveReminderModalProps> = ({
  task,
  onClose,
  onComplete,
  onSnooze,
  onSnoozeTomorrow,
}) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-title"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 p-5 sm:p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mb-3 shadow-inner">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>

          <Badge variant="amber" className="text-[10px] font-bold uppercase tracking-wide mb-1.5">
            Rappel automatique
          </Badge>
          <h2 id="reminder-title" className="text-lg sm:text-xl font-bold tracking-tight text-white line-clamp-2 px-2">
            {task.title}
          </h2>
        </div>

        {/* Task Details Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {task.description && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
              {task.description}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] font-medium">Échéance</span>
                <span className="font-bold text-slate-800">
                  {formatDueDateFrench(task.dueDate, task.dueTime)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className={`w-2.5 h-2.5 rounded-full ${priorityInfo.dot}`} />
              <div>
                <span className="text-slate-500 block text-[10px] font-medium">Priorité</span>
                <span className="font-bold text-slate-800">
                  {priorityInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Subtasks summary if any */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="text-xs border border-slate-200/80 rounded-xl p-3 bg-slate-50/50">
              <span className="font-bold text-slate-700 block mb-1.5">
                Sous-tâches ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 text-slate-600 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.completed ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={st.completed ? 'line-through text-slate-400' : 'font-medium'}>{st.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Complete Primary Button */}
            <Button
              variant="default"
              size="lg"
              onClick={handleCompleteWithCelebration}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Marquer comme terminée</span>
            </Button>

            {/* Snooze Options */}
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Reporter le rappel
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnooze(task.id, 10)}
                  className="text-xs font-semibold"
                >
                  +10 min
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnooze(task.id, 60)}
                  className="text-xs font-semibold"
                >
                  +1 heure
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onSnoozeTomorrow(task.id)}
                  className="text-xs font-semibold"
                >
                  À demain
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
