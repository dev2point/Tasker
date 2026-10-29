'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  CalendarDays,
  Calendar,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';

interface OverdueReminderBannerProps {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  onOpenTask: (task: Task, mode?: 'view' | 'edit') => void;
  onCompleteTask: (taskId: string) => void;
  onRescheduleToToday: (taskId: string) => void;
  onPostponeTask?: (taskId: string, days?: number) => void;
}

export const OverdueReminderBanner: React.FC<OverdueReminderBannerProps> = ({
  overdueTasks,
  dueTodayTasks,
  onOpenTask,
  onCompleteTask,
  onRescheduleToToday,
  onPostponeTask,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  if (overdueTasks.length === 0 && dueTodayTasks.length === 0) {
    return null;
  }

  const primaryOverdue = overdueTasks[0];

  const handlePostpone = (days: number) => {
    if (!primaryOverdue) return;
    if (days === 0) {
      onRescheduleToToday(primaryOverdue.id);
    } else if (onPostponeTask) {
      onPostponeTask(primaryOverdue.id, days);
    } else {
      onRescheduleToToday(primaryOverdue.id);
    }
    setIsMenuOpen(false);
  };

  return (
    <div
      className={`w-full mb-5 sm:mb-6 transition-all duration-150 ${
        isMenuOpen ? 'relative z-50' : 'relative z-20'
      }`}
    >
      {/* Overdue alert banner */}
      {overdueTasks.length > 0 && (
        <div className="bg-rose-950/85 backdrop-blur-xl border border-rose-500/40 rounded-2xl p-3.5 sm:p-4 text-rose-100 shadow-xl flex flex-col gap-3 relative z-30">
          {/* Header Row: Count, Status badge and global Postpone Menu */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 bg-rose-500/20 rounded-xl text-rose-300 shrink-0 border border-rose-500/30">
                <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-rose-100 leading-tight">
                    {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard
                  </span>
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold bg-rose-500 text-white">
                    Action requise
                  </Badge>
                </div>
              </div>
            </div>

            {/* Reporter Action Dropdown Menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-rose-900/70 hover:bg-rose-900 border-rose-500/50 text-rose-100 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3 h-3 text-rose-300" />
                <span>Reporter</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${isMenuOpen ? 'rotate-180' : ''}`}
                />
              </Button>

              {/* Postpone Options Dropdown */}
              {isMenuOpen && primaryOverdue && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2.5rem)] bg-slate-900/98 backdrop-blur-2xl border border-rose-500/50 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ring-1 ring-rose-500/30">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300/90 border-b border-rose-500/20 mb-1">
                    Reporter « {primaryOverdue.title.slice(0, 24)}
                    {primaryOverdue.title.length > 24 ? '...' : ''} »
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePostpone(0)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/25 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-medium">À aujourd&apos;hui</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Ce jour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostpone(1)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/25 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium">À demain (+1 jour)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">+1j</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostpone(3)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/25 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-medium">Dans 3 jours</span>
                    </div>
                    <span className="text-[10px] text-slate-400">+3j</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostpone(7)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/25 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-medium">Dans 1 semaine (+7 jours)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">+7j</span>
                  </button>

                  <div className="border-t border-rose-500/20 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenTask(primaryOverdue, 'view');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-300 hover:text-rose-100 hover:bg-rose-500/25 text-left transition-colors cursor-pointer font-medium"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Consulter la tâche...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive List of Overdue Tasks (Individual click opens consultation view) */}
          <div className="divide-y divide-rose-500/20 rounded-xl bg-rose-950/60 border border-rose-500/30 overflow-hidden">
            {overdueTasks.map((task) => (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  soundManager.playClickSound();
                  onOpenTask(task, 'view');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    soundManager.playClickSound();
                    onOpenTask(task, 'view');
                  }
                }}
                className="w-full flex items-center justify-between gap-3 p-2.5 sm:px-3 text-left hover:bg-rose-900/40 transition-colors cursor-pointer group"
                title="Cliquer pour afficher la tâche en mode consultation"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 group-hover:scale-125 transition-transform" />
                  <span className="text-xs sm:text-sm font-semibold text-rose-100 truncate group-hover:text-white">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono font-medium text-rose-300/90 whitespace-nowrap">
                    {formatDueDateFrench(task.dueDate, task.dueTime)}
                  </span>

                  {/* Inline quick +1j postpone shortcut */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.playClickSound();
                      if (onPostponeTask) {
                        onPostponeTask(task.id, 1);
                      } else {
                        onRescheduleToToday(task.id);
                      }
                    }}
                    title="Reporter de 1 jour (+1j)"
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 hover:text-white transition-colors cursor-pointer"
                  >
                    +1j
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Digest / Today Focus Banner */}
      {dueTodayTasks.length > 0 && (
        <div className={`bg-[#061A13]/85 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-4 py-3 text-emerald-100 flex items-center justify-between gap-3 text-xs shadow-md ${overdueTasks.length > 0 ? 'mt-3' : ''}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-300 border border-amber-500/30 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-emerald-200 truncate">
              <strong className="text-amber-300 font-bold">{dueTodayTasks.length} tâche{dueTodayTasks.length > 1 ? 's' : ''}</strong>{' '}
              <span className="text-emerald-100 font-medium">à accomplir aujourd&apos;hui</span>
            </span>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-bold py-0.5 border-emerald-500/40 text-emerald-300 bg-emerald-500/20">
            Rappels synchronisés
          </Badge>
        </div>
      )}
    </div>
  );
};
