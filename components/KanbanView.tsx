'use client';

import React, { useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Bell,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Hash,
} from 'lucide-react';
import { Task, Category, Priority } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { CategoryIcon, getTagColor } from '@/components/CategoryIcon';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    badge: string;
    bgHeader: string;
    accentColor: string;
  }[] = [
    {
      id: 'todo',
      title: 'À faire',
      badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold',
      bgHeader: 'border-t-emerald-500',
      accentColor: 'text-emerald-400',
    },
    {
      id: 'in_progress',
      title: 'En cours',
      badge: 'bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold',
      bgHeader: 'border-t-amber-500',
      accentColor: 'text-amber-300',
    },
    {
      id: 'completed',
      title: 'Terminées',
      badge: 'bg-teal-950/80 text-teal-300 border border-teal-500/40 font-bold',
      bgHeader: 'border-t-teal-400',
      accentColor: 'text-teal-300',
    },
  ];

  const handleStatusChange = (taskId: string, status: 'todo' | 'in_progress' | 'completed') => {
    if (status === 'completed') {
      soundManager.playCompleteSound();
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
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
      
      {/* Mobile Column Segment Bar */}
      <div className="md:hidden flex items-center bg-[#061A13]/90 p-1 rounded-2xl border border-emerald-500/30 shadow-lg">
        {columns.map((col) => {
          const count = getColumnTasks(col.id).length;
          const active = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveMobileColumn(col.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                active
                  ? 'bg-emerald-500 text-emerald-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>{col.title}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                active ? 'bg-emerald-950 text-emerald-200' : 'bg-emerald-950/60 text-emerald-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const columnTasks = getColumnTasks(col.id);
          const isHiddenOnMobile = activeMobileColumn !== col.id;

          return (
            <div
              key={col.id}
              className={`bg-[#061A13]/80 backdrop-blur-xl rounded-2xl p-3.5 sm:p-4 border border-emerald-500/30 flex flex-col min-h-[450px] border-t-4 ${col.bgHeader} ${
                isHiddenOnMobile ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badge}`}>
                    {columnTasks.length}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenTaskModal()}
                  className="text-slate-400 hover:text-white hover:bg-emerald-500/20"
                  title="Ajouter une tâche"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar">
                {columnTasks.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs">
                    <p className="font-semibold text-slate-300">Aucune tâche</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Glissez ou déplacez des cartes ici</p>
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const cat = getCategory(task.category);
                    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const overdue = isTaskOverdue(task);

                    return (
                      <div
                        key={task.id}
                        className={`bg-[#082219]/90 backdrop-blur-xl rounded-2xl p-3.5 border shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 ${
                          task.completed
                            ? 'border-emerald-500/20 opacity-65'
                            : overdue
                            ? 'border-rose-500/40 bg-rose-950/20'
                            : 'border-emerald-500/20 hover:border-emerald-500/50'
                        }`}
                      >
                        {/* Task Card Header & Title */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
                              style={{
                                backgroundColor: `${cat.color}25`,
                                color: cat.color,
                                borderColor: `${cat.color}40`,
                              }}
                            >
                              <CategoryIcon name={cat.iconName} className="w-2.5 h-2.5" />
                              <span>{cat.name}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${priority.badge}`}>
                              {priority.label}
                            </span>
                          </div>

                          <h4
                            onClick={() => onOpenTaskModal(task)}
                            className={`text-xs font-bold leading-snug cursor-pointer hover:text-emerald-300 transition-colors ${
                              task.completed ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {task.tags.map((t) => {
                                const style = getTagColor(t);
                                return (
                                  <span
                                    key={t}
                                    className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold border"
                                    style={{
                                      backgroundColor: style.bg,
                                      color: style.text,
                                      borderColor: style.border,
                                    }}
                                  >
                                    <Hash className="w-2 h-2 opacity-70" />
                                    <span>{t}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Due Date, Reminder & Quick Move Actions */}
                        <div className="pt-2 border-t border-emerald-500/15 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span className={overdue ? 'text-rose-400 font-bold' : 'text-emerald-300/80'}>
                              {formatDueDateFrench(task.dueDate, task.dueTime)}
                            </span>
                          </div>

                          {/* Move Column Actions */}
                          <div className="flex items-center gap-1">
                            {col.id !== 'todo' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task.id, col.id === 'completed' ? 'in_progress' : 'todo')}
                                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                title="Reculer d'une colonne"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {col.id !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(task.id, col.id === 'todo' ? 'in_progress' : 'completed')}
                                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                title="Avancer vers la colonne suivante"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
