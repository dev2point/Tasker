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
  Flame,
} from 'lucide-react';
import { Task, Category, Priority } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench, getReminderTriggerTime } from '@/lib/reminders';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';

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
      
      {/* Productivity Intelligence Ambient Banner with Dotted Glow Background */}
      <div className="relative overflow-hidden rounded-2xl bg-[#061A13]/90 backdrop-blur-2xl p-5 sm:p-6 text-white shadow-md border border-emerald-500/30">
        <DottedGlowBackground
          className="pointer-events-none absolute inset-0 opacity-40"
          gap={14}
          radius={1.8}
          color="rgba(255, 255, 255, 0.4)"
          glowColor="rgba(16, 185, 129, 0.9)"
          speedMin={0.4}
          speedMax={1.5}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                Tableau de bord & IA
              </span>
              <span className="text-xs text-slate-400 font-medium">Synthèse en temps réel</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Performances & Rythme de Travail
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {completionRate >= 70
                ? "Excellente cadence ! La majorité de vos objectifs sont atteints avec succès."
                : totalTasks === 0
                ? "Créez vos premières tâches pour activer l'analyse d'activité."
                : `${totalTasks - completedTasks} tâche(s) restent à finaliser pour optimiser votre flux.`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <div className="text-xl font-extrabold text-emerald-400">{completionRate}%</div>
              <div className="text-[10px] font-medium text-slate-300">Succès global</div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <div className="text-xl font-extrabold text-emerald-300">{todayCompleted} / {todayTasks.length}</div>
              <div className="text-[10px] font-medium text-slate-300">Aujourd&apos;hui</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top High-Level KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Completion Rate */}
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Complétion
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <Award className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {completionRate}%
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {completedTasks}/{totalTasks} terminées
            </p>
          </div>
          <Progress value={completionRate} className="h-1.5 bg-emerald-950 border border-emerald-500/20" />
        </div>

        {/* Metric 2: Today Focus */}
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Aujourd&apos;hui
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {todayCompleted}/{todayTasks.length}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {todayTasks.length - todayCompleted} restantes
            </p>
          </div>
          <Progress
            value={todayTasks.length > 0 ? (todayCompleted / todayTasks.length) * 100 : 0}
            className="h-1.5 bg-emerald-950 border border-emerald-500/20"
          />
        </div>

        {/* Metric 3: Active Reminders */}
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Rappels Actifs
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
              <Bell className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeReminders.length}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Automatisés et synchronisés
            </p>
          </div>
          <div className="h-1.5 bg-emerald-950 rounded-full overflow-hidden border border-emerald-500/20">
            <div className="h-full bg-emerald-400 rounded-full w-full" />
          </div>
        </div>

        {/* Metric 4: Overdue Alert */}
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              En Retard
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                overdueTasks.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                overdueTasks.length > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {overdueTasks.length}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {overdueTasks.length > 0 ? 'Nécessite votre attention' : 'Tout est à jour !'}
            </p>
          </div>
          <div
            className={`h-1.5 rounded-full overflow-hidden border ${
              overdueTasks.length > 0 ? 'bg-rose-950 border-rose-500/30' : 'bg-emerald-950 border-emerald-500/20'
            }`}
          >
            <div
              className={`h-full rounded-full ${
                overdueTasks.length > 0 ? 'bg-rose-500 w-full' : 'bg-emerald-400 w-full'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Breakdown Section: Category + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Category Breakdown */}
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Répartition par Catégorie</h3>
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
                    <span className="font-bold text-slate-200">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="font-semibold text-white">
                      {cat.completed}/{cat.total}
                    </span>
                    <span className="text-slate-400">({cat.pct}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-500/20">
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
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Distribution par Priorité</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{totalTasks} tâches au total</span>
          </div>

          <div className="space-y-3">
            {priorityStats.map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.total / totalTasks) * 100) : 0;
              return (
                <div
                  key={p.priority}
                  className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${p.config.badge}`}>
                      {p.config.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {p.total} tâche{p.total > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-300">
                      <strong className="text-white font-bold">{p.completed}</strong> terminées
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px]">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      {upcomingRemindersList.length > 0 && (
        <div className="bg-[#061A13]/85 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-md space-y-3">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Prochains Rappels Automatiques</h3>
          </div>

          <div className="space-y-2">
            {upcomingRemindersList.map(({ task }) => (
              <div
                key={task.id}
                onClick={() => onOpenTaskModal(task)}
                className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{task.title}</h4>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Échéance : {formatDueDateFrench(task.dueDate, task.dueTime)}
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] shrink-0 font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
