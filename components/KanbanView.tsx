'use client';

import React, { useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Bell,
  Calendar,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Hash,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Category, Priority } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { CategoryIcon, getTagColor } from '@/components/CategoryIcon';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

interface KanbanViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task?: Task) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: 'todo' | 'in_progress' | 'completed') => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  categories,
  onOpenTaskModal,
  onUpdateTaskStatus,
}) => {
  const [activeMobileColumn, setActiveMobileColumn] = useState<'todo' | 'in_progress' | 'completed'>('todo');

  const getCategory = (catId: string) =>
    categories.find((c) => c.id === catId) || {
      id: catId,
      name: catId,
      color: '#10b981',
      bgLight: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
      iconName: 'Folder',
    };

  const columns: {
    id: 'todo' | 'in_progress' | 'completed';
    title: string;
    dotColor: string;
    accentBorder: string;
  }[] = [
    {
      id: 'todo',
      title: 'À faire',
      dotColor: 'bg-emerald-400',
      accentBorder: 'border-t-emerald-500/80',
    },
    {
      id: 'in_progress',
      title: 'En cours',
      dotColor: 'bg-amber-400',
      accentBorder: 'border-t-amber-500/80',
    },
    {
      id: 'completed',
      title: 'Terminées',
      dotColor: 'bg-teal-400',
      accentBorder: 'border-t-teal-400/80',
    },
  ];

  const handleStatusChange = (taskId: string, status: 'todo' | 'in_progress' | 'completed') => {
    if (status === 'completed') {
      soundManager.playCompleteSound();
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10B981', '#34D399', '#6EE7B7'],
      });
    } else {
      soundManager.playClickSound();
    }
    onUpdateTaskStatus(taskId, status);
  };

  const getColumnTasks = (colId: 'todo' | 'in_progress' | 'completed') => {
    return tasks.filter((t) => {
      if (colId === 'completed') return t.completed || t.status === 'completed';
      if (colId === 'in_progress') return !t.completed && t.status === 'in_progress';
      return !t.completed && (t.status === 'todo' || !t.status);
    });
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Mobile Column Segment Switcher */}
      <div className="md:hidden flex items-center bg-[#051812] p-1 rounded-xl border border-emerald-500/20 shadow-md">
        {columns.map((col) => {
          const count = getColumnTasks(col.id).length;
          const active = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveMobileColumn(col.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{col.title}</span>
              <span className={`font-mono text-[11px] tabular-nums font-semibold px-1.5 py-0.2 rounded-md ${
                active ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-950/60 text-emerald-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Desktop Grid (Linear-Style High Contrast) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {columns.map((col) => {
          const columnTasks = getColumnTasks(col.id);
          const isHiddenOnMobile = activeMobileColumn !== col.id;

          return (
            <div
              key={col.id}
              className={`bg-[#051812]/90 rounded-2xl p-3 sm:p-3.5 border border-emerald-500/15 flex flex-col min-h-[500px] border-t-2 ${col.accentBorder} shadow-lg ${
                isHiddenOnMobile ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1 pb-2 border-b border-emerald-500/10">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-200">{col.title}</h3>
                  <span className="font-mono text-xs tabular-nums text-emerald-400/80 font-bold ml-1">
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenTaskModal()}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                  title="Ajouter une tâche"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
                {columnTasks.length === 0 ? (
                  <div className="h-44 border border-dashed border-emerald-500/20 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
                    <p className="font-medium text-slate-400">Aucune tâche</p>
                    <p className="text-[11px] text-slate-500 mt-1">Glissez ou déplacez une tâche ici</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {columnTasks.map((task) => {
                      const cat = getCategory(task.category);
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                      const overdue = isTaskOverdue(task);

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className={`group relative bg-[#072219]/90 hover:bg-[#092d21] rounded-xl p-3 border transition-all flex flex-col justify-between gap-2.5 shadow-sm cursor-pointer ${
                            task.completed
                              ? 'border-emerald-500/10 opacity-70'
                              : overdue
                              ? 'border-rose-500/40 bg-rose-950/20'
                              : 'border-emerald-500/20 hover:border-emerald-500/40'
                          }`}
                          onClick={() => onOpenTaskModal(task)}
                        >
                          {/* Card Top: Unboxed Category & Priority Meta */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <CategoryIcon name={cat.iconName} className="w-3 h-3" style={{ color: cat.color }} />
                                <span className="text-slate-300 font-semibold">{cat.name}</span>
                              </div>

                              <span className={`text-[10px] font-bold ${
                                task.priority === 'urgent'
                                  ? 'text-rose-400'
                                  : task.priority === 'high'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}>
                                {priority.label}
                              </span>
                            </div>

                            {/* Title */}
                            <h4
                              className={`text-xs font-semibold leading-snug transition-colors group-hover:text-emerald-300 ${
                                task.completed ? 'line-through text-slate-400' : 'text-slate-100'
                              }`}
                            >
                              {task.title}
                            </h4>

                            {/* Description preview */}
                            {task.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            {/* Tags inline */}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-emerald-300/80 font-mono">
                                {task.tags.map((t) => (
                                  <span key={t} className="hover:text-emerald-200">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Card Footer: Tabular Due Date, Assignee & Quick Move Actions */}
                          <div
                            className="pt-2 border-t border-emerald-500/10 flex items-center justify-between gap-2 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 text-[11px]">
                              <span
                                className={`flex items-center gap-1 font-mono tabular-nums ${
                                  overdue
                                    ? 'text-rose-400 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                <Calendar className="w-3 h-3 text-emerald-400/80" />
                                {formatDueDateFrench(task.dueDate, task.dueTime)}
                              </span>

                              {task.assigneeName && (
                                <span className="text-slate-400 text-[10px] flex items-center gap-1">
                                  <span>·</span>
                                  <span>{task.assigneeName.split(' ')[0]}</span>
                                </span>
                              )}
                            </div>

                            {/* Quick Move State Controls */}
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              {col.id !== 'todo' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(task.id, col.id === 'completed' ? 'in_progress' : 'todo')}
                                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                  title="Reculer d'une colonne"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}

                              {col.id !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(task.id, col.id === 'todo' ? 'in_progress' : 'completed')}
                                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                  title="Avancer vers la colonne suivante"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
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
