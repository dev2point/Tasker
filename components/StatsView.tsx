'use client';

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Bell,
  AlertTriangle,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Sparkles,
  Flame,
} from 'lucide-react';
import { Task, Category, Priority } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench, getReminderTriggerTime } from '@/lib/reminders';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface StatsViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task: Task) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  categories,
  onOpenTaskModal,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const todayCompleted = todayTasks.filter((t) => t.completed).length;

  const overdueTasks = tasks.filter((t) => isTaskOverdue(t));
  const activeReminders = tasks.filter((t) => !t.completed && t.reminderMinutesBefore >= 0);

  // Category distribution
  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catTasks = tasks.filter((t) => t.category === cat.id);
      const catCompleted = catTasks.filter((t) => t.completed).length;
      const pct = catTasks.length > 0 ? Math.round((catCompleted / catTasks.length) * 100) : 0;
      return {
        ...cat,
        total: catTasks.length,
        completed: catCompleted,
        pct,
      };
    });
  }, [tasks, categories]);

  // Priority distribution
  const priorityStats = useMemo(() => {
    const priorities: Priority[] = ['urgent', 'high', 'medium', 'low'];
    return priorities.map((p) => {
      const pTasks = tasks.filter((t) => t.priority === p);
      const pCompleted = pTasks.filter((t) => t.completed).length;
      return {
        priority: p,
        config: PRIORITY_CONFIG[p],
        total: pTasks.length,
        completed: pCompleted,
        pending: pTasks.length - pCompleted,
      };
    });
  }, [tasks]);

  // Upcoming reminders timeline
  const upcomingRemindersList = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && t.reminderMinutesBefore >= 0)
      .map((t) => {
        const trigger = getReminderTriggerTime(t);
        return {
          task: t,
          triggerTime: trigger ? trigger.getTime() : 0,
        };
      })
      .sort((a, b) => a.triggerTime - b.triggerTime)
      .slice(0, 5);
  }, [tasks]);

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      
      {/* Top High-Level KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Completion Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Complétion
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {completionRate}%
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {completedTasks}/{totalTasks} terminées
            </p>
          </div>
          <Progress value={completionRate} className="h-1.5" />
        </div>

        {/* Metric 2: Today Focus */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Aujourd&apos;hui
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {todayCompleted}/{todayTasks.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {todayTasks.length - todayCompleted} restantes
            </p>
          </div>
          <Progress
            value={todayTasks.length > 0 ? (todayCompleted / todayTasks.length) * 100 : 0}
            className="h-1.5"
          />
        </div>

        {/* Metric 3: Active Reminders */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rappels Actifs
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeReminders.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Automatisés et synchronisés
            </p>
          </div>
          <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-full" />
          </div>
        </div>

        {/* Metric 4: Overdue Alert */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              En Retard
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                overdueTasks.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                overdueTasks.length > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {overdueTasks.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {overdueTasks.length > 0 ? 'Nécessite votre attention' : 'Tout est à jour !'}
            </p>
          </div>
          <div
            className={`h-1.5 rounded-full overflow-hidden ${
              overdueTasks.length > 0 ? 'bg-rose-100' : 'bg-slate-100'
            }`}
          >
            <div
              className={`h-full rounded-full ${
                overdueTasks.length > 0 ? 'bg-rose-500 w-full' : 'bg-emerald-500 w-full'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Breakdown Section: Category + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Category Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Répartition par Catégorie</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{categories.length} catégories</span>
          </div>

          <div className="space-y-3.5">
            {categoryStats.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-slate-800">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {cat.completed}/{cat.total}
                    </span>
                    <span className="text-slate-400">({cat.pct}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.pct}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Distribution par Priorité</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{totalTasks} tâches au total</span>
          </div>

          <div className="space-y-3">
            {priorityStats.map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.total / totalTasks) * 100) : 0;
              return (
                <div
                  key={p.priority}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${p.config.badge}`}>
                      {p.config.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {p.total} tâche{p.total > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      <strong className="text-slate-900 font-bold">{p.completed}</strong> terminées
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      {upcomingRemindersList.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">Prochains Rappels Automatiques</h3>
          </div>

          <div className="space-y-2">
            {upcomingRemindersList.map(({ task }) => (
              <div
                key={task.id}
                onClick={() => onOpenTaskModal(task)}
                className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{task.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Échéance : {formatDueDateFrench(task.dueDate, task.dueTime)}
                    </p>
                  </div>
                </div>

                <Badge variant="amber" className="text-[10px] shrink-0 font-bold">
                  {task.reminderMinutesBefore === 0
                    ? 'À l’heure pile'
                    : `${task.reminderMinutesBefore}m avant`}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
