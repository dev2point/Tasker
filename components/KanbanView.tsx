'use client';

import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Category, TaskStatus } from '@/types/task';
import { User } from '@/types/user';
import {
  PRIORITY_CONFIG,
  TASK_STATUS_ORDER,
  TASK_STATUS_CONFIG,
  normalizeTaskStatus,
} from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { canUserCompleteTask, canUserEditTask } from '@/lib/rbac';
import { CategoryIcon } from '@/components/CategoryIcon';
import confetti from 'canvas-confetti';

interface KanbanViewProps {
  tasks: Task[];
  categories: Category[];
  currentUser?: User | null;
  onOpenTaskModal: (task?: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  categories,
  currentUser,
  onOpenTaskModal,
  onUpdateTaskStatus,
}) => {
  const [activeMobileColumn, setActiveMobileColumn] = useState<TaskStatus>('todo');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const getCategory = (catId: string) =>
    categories.find((c) => c.id === catId) || {
      id: catId,
      name: catId,
      color: '#004266',
      bgLight: 'bg-[#004266]/10 text-[#004266] border-[#004266]/25',
      iconName: 'Folder',
    };

  const columns = TASK_STATUS_ORDER.map((statusId) => {
    const cfg = TASK_STATUS_CONFIG[statusId];
    return {
      id: statusId,
      title: cfg.label,
      dotColor: cfg.dotColor,
      accentBorder: cfg.accentBorder,
      selectClass: cfg.selectClass,
    };
  });

  const canModifyTaskStatus = (task: Task, targetStatus?: TaskStatus) => {
    if (!currentUser) return true;
    if (targetStatus === 'completed') {
      return canUserCompleteTask(task, currentUser);
    }
    return canUserEditTask(task, currentUser) || canUserCompleteTask(task, currentUser);
  };

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    if (!canModifyTaskStatus(task, status)) {
      soundManager.playClickSound();
      return;
    }

    const currentStatus = normalizeTaskStatus(task.status, task.completed);
    if (currentStatus === status) return;

    if (status === 'completed') {
      soundManager.playCompleteSound();
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#004266', '#F77F00', '#3895C9'],
      });
    } else {
      soundManager.playClickSound();
    }
    onUpdateTaskStatus(task.id, status);
  };

  const getColumnTasks = (colId: TaskStatus) => {
    return tasks.filter((t) => normalizeTaskStatus(t.status, t.completed) === colId);
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Mobile Column Segment Switcher */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-none bg-white dark:bg-[#0B2438] p-1 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm">
        {columns.map((col) => {
          const count = getColumnTasks(col.id).length;
          const active = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveMobileColumn(col.id)}
              className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-[#004266] text-white font-bold shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
                  : 'text-[#486075] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  active ? 'bg-[#F77F00]' : col.dotColor
                }`}
              />
              <span>{col.title}</span>
              <span
                className={`font-mono text-[11px] tabular-nums font-semibold px-1.5 py-0.2 rounded-md ${
                  active
                    ? 'bg-white/20 text-white dark:bg-[#061826]/20 dark:text-[#061826]'
                    : 'bg-[#EDF2F7] text-[#004266] dark:bg-[#103049] dark:text-[#7CC4EB]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Desktop Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {columns.map((col, colIndex) => {
          const columnTasks = getColumnTasks(col.id);
          const isHiddenOnMobile = activeMobileColumn !== col.id;
          const prevStatus = colIndex > 0 ? TASK_STATUS_ORDER[colIndex - 1] : null;
          const nextStatus =
            colIndex < TASK_STATUS_ORDER.length - 1 ? TASK_STATUS_ORDER[colIndex + 1] : null;
          const isDropTarget = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedTaskId) {
                  setDragOverColumn(col.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverColumn === col.id) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                setDragOverColumn(null);
                setDraggedTaskId(null);
                if (!droppedId) return;
                const task = tasks.find((t) => t.id === droppedId);
                if (task) {
                  handleStatusChange(task, col.id);
                }
              }}
              className={`bg-[#EDF2F7]/80 dark:bg-[#0B2438]/90 rounded-2xl p-3 sm:p-3.5 border flex flex-col min-h-[480px] border-t-2 ${
                col.accentBorder
              } shadow-sm transition-colors ${
                isDropTarget
                  ? 'border-[#004266] bg-[#004266]/5 dark:border-[#3895C9] dark:bg-[#103049]/80'
                  : 'border-[#D8E2EC] dark:border-[#94B8D6]/20'
              } ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1 pb-2 border-b border-[#D8E2EC] dark:border-[#94B8D6]/15">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotColor}`} />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-[#0B1F30] dark:text-[#F1F5F9] truncate">
                    {col.title}
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-[#004266] dark:text-[#7CC4EB] font-bold ml-0.5 shrink-0">
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenTaskModal()}
                  className="p-1 rounded-lg text-[#486075] hover:text-[#004266] hover:bg-[#004266]/10 dark:text-[#9FB3C8] dark:hover:text-[#7CC4EB] dark:hover:bg-[#3895C9]/15 transition-colors cursor-pointer shrink-0"
                  title="Ajouter une tâche"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
                {columnTasks.length === 0 ? (
                  <div className="h-44 border border-dashed border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl flex flex-col items-center justify-center text-[#64748B] dark:text-[#9FB3C8] text-xs p-4 text-center bg-white/50 dark:bg-[#061826]/40">
                    <p className="font-medium text-[#486075] dark:text-[#9FB3C8]">Aucune tâche</p>
                    <p className="text-[11px] text-[#64748B] dark:text-[#9FB3C8]/80 mt-1">
                      Glissez ou déplacez une tâche ici
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => {
                      const cat = getCategory(task.category);
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                      const overdue = isTaskOverdue(task);
                      const taskStatus = normalizeTaskStatus(task.status, task.completed);
                      const canEditStatus = canModifyTaskStatus(task);
                      const canComplete = canModifyTaskStatus(task, 'completed');

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          draggable={canEditStatus}
                          onDragStart={(e) => {
                            if (!canEditStatus) return;
                            const dragEvent = e as unknown as React.DragEvent<HTMLDivElement>;
                            if (dragEvent.dataTransfer) {
                              dragEvent.dataTransfer.setData('text/plain', task.id);
                              dragEvent.dataTransfer.effectAllowed = 'move';
                            }
                            setDraggedTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverColumn(null);
                          }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className={`group relative rounded-xl p-3 border transition-all flex flex-col justify-between gap-2.5 shadow-xs cursor-pointer ${
                            task.completed
                              ? 'bg-white/70 border-[#D8E2EC] opacity-75 dark:bg-[#103049]/50 dark:border-[#94B8D6]/15'
                              : overdue
                              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300 dark:bg-rose-950/25 dark:border-rose-500/40'
                              : 'bg-white hover:bg-[#F8FAFC] border-[#D8E2EC] hover:border-[#004266]/40 dark:bg-[#103049] dark:hover:bg-[#143B59] dark:border-[#94B8D6]/20 dark:hover:border-[#3895C9]/45'
                          }`}
                          onClick={() => onOpenTaskModal(task)}
                        >
                          {/* Card Top */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-medium gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <CategoryIcon
                                  name={cat.iconName}
                                  className="w-3 h-3 shrink-0"
                                  style={{ color: cat.color }}
                                />
                                <span className="text-[#486075] dark:text-[#9FB3C8] font-semibold truncate">
                                  {cat.name}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold shrink-0 ${
                                  task.priority === 'urgent'
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : task.priority === 'high'
                                    ? 'text-[#B85A00] dark:text-[#FFB35C]'
                                    : 'text-[#486075] dark:text-[#9FB3C8]'
                                }`}
                              >
                                {priority.label}
                              </span>
                            </div>

                            {/* Title */}
                            <h4
                              className={`text-xs font-semibold leading-snug transition-colors group-hover:text-[#004266] dark:group-hover:text-[#7CC4EB] ${
                                task.completed
                                  ? 'line-through text-[#64748B] dark:text-[#9FB3C8]/70'
                                  : 'text-[#0B1F30] dark:text-[#F1F5F9]'
                              }`}
                            >
                              {task.title}
                            </h4>

                            {/* Description preview */}
                            {task.description && (
                              <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8] line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Tags inline */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-[#004266] dark:text-[#7CC4EB] font-mono">
                                {task.tags.map((t) => (
                                  <span key={t}>#{t}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div
                            className="pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15 flex flex-col gap-2 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span
                                className={`flex items-center gap-1 font-mono tabular-nums truncate ${
                                  overdue
                                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                                    : 'text-[#486075] dark:text-[#9FB3C8]'
                                }`}
                              >
                                <Calendar className="w-3 h-3 text-[#004266] dark:text-[#3895C9] shrink-0" />
                                <span className="truncate">
                                  {formatDueDateFrench(task.dueDate, task.dueTime)}
                                </span>
                              </span>

                              {task.assigneeName && (
                                <span className="text-[#486075] dark:text-[#9FB3C8] text-[10px] flex items-center gap-1 shrink-0">
                                  <span>·</span>
                                  <span>{task.assigneeName.split(' ')[0]}</span>
                                </span>
                              )}
                            </div>

                            {/* Quick Status Selector + Adjacent Step Buttons */}
                            <div className="flex items-center justify-between gap-1.5">
                              <select
                                aria-label={`Statut de ${task.title}`}
                                value={taskStatus}
                                disabled={!canEditStatus}
                                onChange={(e) =>
                                  handleStatusChange(task, e.target.value as TaskStatus)
                                }
                                className={`flex-1 min-w-0 px-2 py-1 rounded-lg border text-[11px] font-semibold outline-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  TASK_STATUS_CONFIG[taskStatus].selectClass
                                }`}
                              >
                                {TASK_STATUS_ORDER.map((statusOption) => (
                                  <option
                                    key={statusOption}
                                    value={statusOption}
                                    disabled={statusOption === 'completed' && !canComplete}
                                    className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]"
                                  >
                                    {TASK_STATUS_CONFIG[statusOption].label}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {prevStatus && (
                                  <button
                                    type="button"
                                    disabled={!canModifyTaskStatus(task, prevStatus)}
                                    onClick={() => handleStatusChange(task, prevStatus)}
                                    className="p-1 rounded-md text-[#486075] hover:text-[#004266] hover:bg-[#004266]/10 dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#3895C9]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    title={`Passer à ${TASK_STATUS_CONFIG[prevStatus].label}`}
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}

                                {nextStatus && (
                                  <button
                                    type="button"
                                    disabled={!canModifyTaskStatus(task, nextStatus)}
                                    onClick={() => handleStatusChange(task, nextStatus)}
                                    className="p-1 rounded-md text-[#486075] hover:text-[#004266] hover:bg-[#004266]/10 dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#3895C9]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    title={`Passer à ${TASK_STATUS_CONFIG[nextStatus].label}`}
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
