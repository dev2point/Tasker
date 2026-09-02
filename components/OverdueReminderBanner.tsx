'use client';

import React from 'react';
import { AlertCircle, Clock, ArrowRight, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OverdueReminderBannerProps {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  onOpenTask: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
  onRescheduleToToday: (taskId: string) => void;
}

export const OverdueReminderBanner: React.FC<OverdueReminderBannerProps> = ({
  overdueTasks,
  dueTodayTasks,
  onOpenTask,
  onCompleteTask,
  onRescheduleToToday,
}) => {
  if (overdueTasks.length === 0 && dueTodayTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5 mb-5 sm:mb-6">
      {/* Overdue alert banner */}
      {overdueTasks.length > 0 && (
        <div className="bg-rose-50/90 border border-rose-200/90 rounded-2xl p-3.5 sm:p-4 text-rose-950 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100/80 rounded-xl text-rose-600 shrink-0 mt-0.5 border border-rose-200/60">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-rose-950">
                  {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard
                </span>
                <Badge variant="destructive" className="text-[10px] py-0 px-2">
                  Action requise
                </Badge>
              </div>
              <p className="text-xs text-rose-800/90 mt-0.5 truncate font-medium">
                {overdueTasks.map((t) => t.title).join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 justify-end pt-1 sm:pt-0">
            {overdueTasks[0] && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => onRescheduleToToday(overdueTasks[0].id)}
                className="bg-white hover:bg-rose-50 border-rose-200 text-rose-800 text-xs font-semibold flex-1 sm:flex-none"
              >
                Reporter à aujourd&apos;hui
              </Button>
            )}
            <Button
              variant="destructive"
              size="xs"
              onClick={() => onOpenTask(overdueTasks[0])}
              className="gap-1 font-bold flex-1 sm:flex-none"
            >
              <span>Voir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Daily Digest / Today Focus Banner */}
      {dueTodayTasks.length > 0 && overdueTasks.length === 0 && (
        <div className="bg-indigo-50/80 border border-indigo-100/90 rounded-2xl px-4 py-3 text-indigo-950 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-indigo-100/80 rounded-lg text-indigo-700 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-slate-800 truncate">
              <strong className="text-indigo-900 font-bold">{dueTodayTasks.length} tâche{dueTodayTasks.length > 1 ? 's' : ''}</strong> à accomplir aujourd&apos;hui
            </span>
          </div>
          <Badge variant="indigo" className="hidden sm:inline-flex text-[11px] font-semibold py-0.5">
            Rappels automatiques synchronisés
          </Badge>
        </div>
      )}
    </div>
  );
};
