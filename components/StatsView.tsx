'use client';

import React, { useMemo } from 'react';
import {
  Clock,
  Bell,
  AlertTriangle,
  TrendingUp,
  Award,
  Layers,
  Printer,
} from 'lucide-react';
import { Task, Category, Priority } from '@/types/task';
import {
  PRIORITY_CONFIG,
  TASK_STATUS_ORDER,
  TASK_STATUS_CONFIG,
  normalizeTaskStatus,
} from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench, getReminderTriggerTime } from '@/lib/reminders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';

interface StatsViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task: Task) => void;
  onOpenReportModal?: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  categories,
  onOpenTaskModal,
  onOpenReportModal,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const todayCompleted = todayTasks.filter((t) => t.completed).length;

  const overdueTasks = tasks.filter((t) => isTaskOverdue(t));
  const activeReminders = tasks.filter((t) => !t.completed && t.reminderMinutesBefore >= 0);

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

  const statusStats = useMemo(() => {
    return TASK_STATUS_ORDER.map((statusId) => {
      const cfg = TASK_STATUS_CONFIG[statusId];
      const count = tasks.filter(
        (t) => normalizeTaskStatus(t.status, t.completed) === statusId
      ).length;
      const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      return {
        statusId,
        cfg,
        count,
        pct,
      };
    });
  }, [tasks, totalTasks]);

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
      {/* Corporate Cabinet Blue Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#004266] dark:bg-[#0B2438] p-5 sm:p-6 text-white shadow-md border border-[#00314D] dark:border-[#94B8D6]/25">
        <DottedGlowBackground
          className="pointer-events-none absolute inset-0 opacity-35"
          gap={14}
          radius={1.6}
          color="rgba(255, 255, 255, 0.35)"
          glowColor="rgba(247, 127, 0, 0.85)"
          speedMin={0.4}
          speedMax={1.4}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F77F00]/20 text-[#FFB35C] border border-[#F77F00]/40 uppercase tracking-wide">
                Tableau de bord &amp; Pilotage
              </span>
              <span className="text-xs text-white/75 font-medium">Synthèse en temps réel</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Performances &amp; Rythme de Travail
            </h2>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              {completionRate >= 70
                ? 'Excellente cadence ! La majorité des dossiers et objectifs du cabinet sont finalisés.'
                : totalTasks === 0
                ? "Créez vos premières tâches pour activer l'analyse d'activité."
                : `${totalTasks - completedTasks} tâche(s) restent à finaliser pour optimiser votre flux.`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <div className="px-3 sm:px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center flex-1 sm:min-w-[90px]">
                <div className="text-xl font-extrabold text-[#FFB35C] tabular-nums">{completionRate}%</div>
                <div className="text-[10px] font-medium text-white/80 truncate">Succès global</div>
              </div>
              <div className="px-3 sm:px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center flex-1 sm:min-w-[90px]">
                <div className="text-xl font-extrabold text-[#7CC4EB] tabular-nums">
                  {todayCompleted} / {todayTasks.length}
                </div>
                <div className="text-[10px] font-medium text-white/80 truncate">Aujourd&apos;hui</div>
              </div>
            </div>

            {onOpenReportModal && (
              <Button
                type="button"
                variant="accent"
                onClick={onOpenReportModal}
                size="sm"
                className="font-bold text-xs gap-1.5 shadow-md cursor-pointer h-9 px-3.5 rounded-xl shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Rapport PDF Comité</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Top High-Level KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Completion Rate */}
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
              Complétion
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] flex items-center justify-center border border-[#004266]/20 dark:border-[#3895C9]/30">
              <Award className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F30] dark:text-[#F1F5F9] tracking-tight tabular-nums">
              {completionRate}%
            </div>
            <p className="text-xs text-[#486075] dark:text-[#9FB3C8] mt-0.5 font-medium tabular-nums">
              {completedTasks}/{totalTasks} terminées
            </p>
          </div>
          <Progress value={completionRate} className="h-1.5" />
        </div>

        {/* Metric 2: Today Focus */}
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
              Aujourd&apos;hui
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] flex items-center justify-center border border-[#004266]/20 dark:border-[#3895C9]/30">
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F30] dark:text-[#F1F5F9] tracking-tight tabular-nums">
              {todayCompleted}/{todayTasks.length}
            </div>
            <p className="text-xs text-[#486075] dark:text-[#9FB3C8] mt-0.5 font-medium tabular-nums">
              {todayTasks.length - todayCompleted} restantes
            </p>
          </div>
          <Progress
            value={todayTasks.length > 0 ? (todayCompleted / todayTasks.length) * 100 : 0}
            className="h-1.5"
          />
        </div>

        {/* Metric 3: Active Reminders */}
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B85A00] dark:text-[#FFB35C]">
              Rappels Actifs
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F77F00]/12 text-[#B85A00] dark:bg-[#F77F00]/20 dark:text-[#FFB35C] flex items-center justify-center border border-[#F77F00]/30">
              <Bell className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F30] dark:text-[#F1F5F9] tracking-tight tabular-nums">
              {activeReminders.length}
            </div>
            <p className="text-xs text-[#486075] dark:text-[#9FB3C8] mt-0.5 font-medium">
              Automatisés et synchronisés
            </p>
          </div>
          <div className="h-1.5 bg-[#EDF2F7] dark:bg-[#103049] rounded-full overflow-hidden">
            <div className="h-full bg-[#F77F00] rounded-full w-full" />
          </div>
        </div>

        {/* Metric 4: Overdue Alert */}
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
              En Retard
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                overdueTasks.length > 0
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
              }`}
            >
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                overdueTasks.length > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#0B1F30] dark:text-[#F1F5F9]'
              }`}
            >
              {overdueTasks.length}
            </div>
            <p className="text-xs text-[#486075] dark:text-[#9FB3C8] mt-0.5 font-medium">
              {overdueTasks.length > 0 ? 'Nécessite votre attention' : 'Tout est à jour !'}
            </p>
          </div>
          <div
            className={`h-1.5 rounded-full overflow-hidden ${
              overdueTasks.length > 0
                ? 'bg-rose-100 dark:bg-rose-950'
                : 'bg-emerald-100 dark:bg-emerald-950'
            }`}
          >
            <div
              className={`h-full rounded-full ${
                overdueTasks.length > 0 ? 'bg-rose-500 w-full' : 'bg-emerald-600 dark:bg-emerald-400 w-full'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Lifecycle Status Summary Strip */}
      <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 pb-2.5">
          <h3 className="font-bold text-sm text-[#0B1F30] dark:text-[#F1F5F9]">Cycle de vie des tâches</h3>
          <span className="text-xs text-[#486075] dark:text-[#9FB3C8] font-mono tabular-nums">
            {totalTasks} tâche{totalTasks > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statusStats.map(({ statusId, cfg, count, pct }) => (
            <div
              key={statusId}
              className="p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`} />
                  <span className="text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] truncate">
                    {cfg.label}
                  </span>
                </div>
                <span className="text-sm font-extrabold font-mono tabular-nums text-[#004266] dark:text-[#7CC4EB] shrink-0">
                  {count}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#D8E2EC] dark:bg-[#061826] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${cfg.dotColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
              <h3 className="font-bold text-sm text-[#0B1F30] dark:text-[#F1F5F9]">Répartition par Pôle</h3>
            </div>
            <span className="text-xs text-[#486075] dark:text-[#9FB3C8] font-semibold tabular-nums">
              {categories.length} pôles
            </span>
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
                    <span className="font-bold text-[#0B1F30] dark:text-[#F1F5F9]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#486075] dark:text-[#9FB3C8] tabular-nums">
                    <span className="font-semibold text-[#0B1F30] dark:text-[#F1F5F9]">
                      {cat.completed}/{cat.total}
                    </span>
                    <span>({cat.pct}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-[#EDF2F7] dark:bg-[#103049] rounded-full overflow-hidden">
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
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F77F00]" />
              <h3 className="font-bold text-sm text-[#0B1F30] dark:text-[#F1F5F9]">Distribution par Priorité</h3>
            </div>
            <span className="text-xs text-[#486075] dark:text-[#9FB3C8] font-semibold tabular-nums">
              {totalTasks} tâches au total
            </span>
          </div>

          <div className="space-y-3">
            {priorityStats.map((p) => {
              const pct = totalTasks > 0 ? Math.round((p.total / totalTasks) * 100) : 0;
              return (
                <div
                  key={p.priority}
                  className="p-3 rounded-xl bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${p.config.badge}`}>
                      {p.config.label}
                    </span>
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] tabular-nums">
                      {p.total} tâche{p.total > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs tabular-nums">
                    <span className="text-[#486075] dark:text-[#9FB3C8]">
                      <strong className="text-[#0B1F30] dark:text-[#F1F5F9] font-bold">{p.completed}</strong> terminées
                    </span>
                    <span className="text-[#004266] dark:text-[#7CC4EB] font-mono text-[11px] font-bold">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      {upcomingRemindersList.length > 0 && (
        <div className="bg-white dark:bg-[#0B2438] p-4 sm:p-5 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-[#D8E2EC] dark:border-[#94B8D6]/20 pb-3">
            <Bell className="w-4 h-4 text-[#F77F00]" />
            <h3 className="font-bold text-sm text-[#0B1F30] dark:text-[#F1F5F9]">Prochains Rappels Automatiques</h3>
          </div>

          <div className="space-y-2">
            {upcomingRemindersList.map(({ task }) => (
              <div
                key={task.id}
                onClick={() => onOpenTaskModal(task)}
                className="p-3 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#103049] hover:border-[#004266]/45 dark:hover:border-[#3895C9]/45 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] flex items-center justify-center shrink-0 border border-[#004266]/20 dark:border-[#3895C9]/30">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#0B1F30] dark:text-[#F1F5F9] truncate">{task.title}</h4>
                    <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8] font-medium">
                      Échéance : {formatDueDateFrench(task.dueDate, task.dueTime)}
                    </p>
                  </div>
                </div>

                <Badge variant="apricot" className="text-[10px] shrink-0 font-bold tabular-nums">
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
