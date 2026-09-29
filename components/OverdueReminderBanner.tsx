'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  CalendarDays,
  Calendar,
  ChevronDown,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OverdueReminderBannerProps {
  overdueTasks: Task[];
  dueTodayTasks: Task[];
  onOpenTask: (task: Task) => void;
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
    <div className="space-y-2.5 mb-5 sm:mb-6">
      {/* Overdue alert banner */}
      {overdueTasks.length > 0 && primaryOverdue && (
        <div className="bg-rose-950/80 backdrop-blur-xl border border-rose-500/40 rounded-2xl p-3.5 sm:p-4 text-rose-100 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-300 shrink-0 mt-0.5 border border-rose-500/30">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-rose-100">
                  {overdueTasks.length} tâche{overdueTasks.length > 1 ? 's' : ''} en retard
                </span>
                <Badge variant="destructive" className="text-[10px] py-0 px-2 font-bold bg-rose-500 text-white">
                  Action requise
                </Badge>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5 truncate font-medium">
                {overdueTasks.map((t) => t.title).join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0 justify-end pt-1 sm:pt-0">
            {/* Reporter Action Dropdown Menu */}
            <div className="relative flex-1 sm:flex-none" ref={menuRef}>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-full sm:w-auto bg-rose-900/70 hover:bg-rose-900 border-rose-500/50 text-rose-100 text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3 h-3 text-rose-300" />
                <span>Reporter</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Postpone Options Dropdown */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-900/95 backdrop-blur-xl border border-rose-500/40 rounded-xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300/80 border-b border-rose-500/20 mb-1">
                    Reporter « {primaryOverdue.title.slice(0, 24)}{primaryOverdue.title.length > 24 ? '...' : ''} »
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePostpone(0)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/20 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>À aujourd&apos;hui</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Ce jour</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostpone(1)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/20 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>À demain (+1 jour)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">+1j</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostpone(3)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/20 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dans 3 jours</span>
                    </div>
                    <span className="text-[10px] text-slate-400">+3j</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePostpone(7)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-rose-500/20 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Dans 1 semaine (+7 jours)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">+7j</span>
                  </button>

                  <div className="border-t border-rose-500/20 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenTask(primaryOverdue);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 text-left transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Choisir une autre date...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="destructive"
              size="xs"
              onClick={() => onOpenTask(primaryOverdue)}
              className="gap-1 font-bold flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm"
            >
              <span>Voir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Daily Digest / Today Focus Banner */}
      {dueTodayTasks.length > 0 && overdueTasks.length === 0 && (
        <div className="bg-[#061A13]/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-4 py-3 text-emerald-100 flex items-center justify-between gap-3 text-xs shadow-md">
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
            Rappels automatiques synchronisés
          </Badge>
        </div>
      )}
    </div>
  );
};
