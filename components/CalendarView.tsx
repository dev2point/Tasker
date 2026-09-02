'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Bell,
  Calendar as CalendarIcon,
  Tag,
  AlertCircle,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Task, Category, CalendarViewType, Priority } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface CalendarViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task?: Task, defaultDate?: string) => void;
  onToggleComplete: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  categories,
  onOpenTaskModal,
  onToggleComplete,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );

  const getCategory = (catId: string) =>
    categories.find((c) => c.id === catId) || {
      id: catId,
      name: catId,
      color: '#64748b',
      bgLight: 'bg-slate-50 text-slate-700 border-slate-200',
      iconName: 'Folder',
    };

  // Filter tasks if category filter is set
  const filteredTasks = useMemo(() => {
    if (selectedCategoryFilter === 'all') return tasks;
    return tasks.filter((t) => t.category === selectedCategoryFilter);
  }, [tasks, selectedCategoryFilter]);

  // Group tasks by date string YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      if (!map[task.dueDate]) {
        map[task.dueDate] = [];
      }
      map[task.dueDate].push(task);
    });
    // Sort tasks in each date by completion status and time
    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
        if (a.dueTime) return -1;
        if (b.dueTime) return 1;
        return 0;
      });
    });
    return map;
  }, [filteredTasks]);

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewType === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewType === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewType === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewType === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedMobileDate(now.toISOString().split('T')[0]);
  };

  // Month navigation title
  const monthTitle = useMemo(() => {
    const formatted = currentDate.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [currentDate]);

  // Week Title
  const weekTitle = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const endStr = endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [currentDate]);

  // Generate Month Grid Matrix
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek < 0) startingDayOfWeek = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(i).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month trailing days (42 cells matrix)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(i).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate]);

  // Week Grid Days
  const weekGridDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - dayOfWeek);

    const days = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const yyyy = dayDate.getFullYear();
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      days.push({
        date: dayDate,
        dateStr,
        dayName: dayDate.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNumber: dayDate.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  const handleTaskCheckbox = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    soundManager.playCompleteSound();
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
    });
    onToggleComplete(taskId);
  };

  const selectedMobileTasks = tasksByDate[selectedMobileDate] || [];

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      
      {/* Calendar Control Header Card */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Navigation & Month Title */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handlePrev}
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={handleToday}
              className="font-bold text-xs"
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleNext}
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight pl-2">
            {viewType === 'month' && monthTitle}
            {viewType === 'week' && weekTitle}
            {viewType === 'day' &&
              currentDate.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
              })}
          </h2>
        </div>

        {/* View Mode Switcher (Month / Week / Day) */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewType('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewType === 'month'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mois
            </button>
            <button
              type="button"
              onClick={() => setViewType('week')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewType === 'week'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semaine
            </button>
            <button
              type="button"
              onClick={() => setViewType('day')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewType === 'day'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jour
            </button>
          </div>

          <Button
            size="xs"
            onClick={() => onOpenTaskModal(undefined, selectedMobileDate)}
            className="font-bold shrink-0 shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MONTH VIEW */}
      {/* ========================================================================= */}
      {viewType === 'month' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 text-center text-[11px] sm:text-xs font-bold text-slate-500 py-2.5">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="tracking-tight">{day}</div>
              ))}
            </div>

            {/* Calendar Grid 7x6 */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {monthGridDays.map((cell) => {
                const dayTasks = tasksByDate[cell.dateStr] || [];
                const isSelected = cell.dateStr === selectedMobileDate;
                const pendingTasks = dayTasks.filter((t) => !t.completed);
                const completedTasks = dayTasks.filter((t) => t.completed);
                const hasOverdue = dayTasks.some((t) => isTaskOverdue(t));

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      setSelectedMobileDate(cell.dateStr);
                      if (window.innerWidth >= 768 && dayTasks.length === 0) {
                        onOpenTaskModal(undefined, cell.dateStr);
                      }
                    }}
                    className={`min-h-[70px] sm:min-h-[110px] p-1.5 sm:p-2.5 transition-all cursor-pointer select-none flex flex-col justify-between ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-400'
                        : isSelected
                        ? 'bg-indigo-50/40 ring-2 ring-indigo-500/20 ring-inset'
                        : 'bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Top Day Number & Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-indigo-100 text-indigo-700 font-extrabold'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Mobile Task Counter Pill */}
                      {dayTasks.length > 0 && (
                        <div className="flex items-center gap-1 sm:hidden">
                          {hasOverdue && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              pendingTasks.length === 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {dayTasks.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Desktop Task Chips List */}
                    <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden flex-1">
                      {dayTasks.slice(0, 3).map((task) => {
                        const cat = getCategory(task.category);
                        const isOverdue = isTaskOverdue(task);

                        return (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTaskModal(task);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate border flex items-center gap-1 transition-transform hover:scale-[1.02] ${
                              task.completed
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50/90 text-slate-800 border-slate-200/80 hover:border-indigo-300'
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            {task.dueTime && (
                              <span className="font-mono text-[9px] text-slate-500 shrink-0">
                                {task.dueTime}
                              </span>
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        );
                      })}

                      {dayTasks.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-bold px-1">
                          +{dayTasks.length - 3} autre{dayTasks.length - 3 > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Mobile Color Dots indicator */}
                    <div className="flex sm:hidden items-center gap-1 mt-auto pt-1 overflow-hidden">
                      {dayTasks.slice(0, 4).map((t) => {
                        const cat = getCategory(t.category);
                        return (
                          <span
                            key={t.id}
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              t.completed ? 'bg-slate-300' : ''
                            }`}
                            style={!t.completed ? { backgroundColor: cat.color } : {}}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Details Panel (Essential for Mobile touch UX & Quick Review) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 capitalize">
                  {new Date(selectedMobileDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => onOpenTaskModal(undefined, selectedMobileDate)}
                className="font-bold text-xs gap-1 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Planifier</span>
              </Button>
            </div>

            {selectedMobileTasks.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-600">Aucune tâche pour cette date</p>
                <p className="text-slate-400 mt-0.5">Appuyez sur Planifier pour créer une tâche pour ce jour.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedMobileTasks.map((task) => {
                  const cat = getCategory(task.category);
                  const isOverdue = isTaskOverdue(task);
                  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTaskModal(task)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        task.completed
                          ? 'bg-slate-50 border-slate-200/80 opacity-60'
                          : isOverdue
                          ? 'bg-rose-50/60 border-rose-200'
                          : 'bg-white border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => handleTaskCheckbox(e, task.id)}
                          className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-4.5 h-4.5 hover:text-indigo-600" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`text-xs font-bold leading-tight truncate ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            {task.dueTime ? (
                              <span className="font-mono font-medium text-slate-700 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {task.dueTime}
                              </span>
                            ) : (
                              <span>Toute la journée</span>
                            )}
                            <span
                              className="px-1.5 py-0.2 rounded font-bold"
                              style={{
                                backgroundColor: `${cat.color}15`,
                                color: cat.color,
                              }}
                            >
                              {cat.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${priority.badge}`}>
                        {priority.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WEEK VIEW */}
      {/* ========================================================================= */}
      {viewType === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekGridDays.map((day) => {
            const dayTasks = tasksByDate[day.dateStr] || [];

            return (
              <div
                key={day.dateStr}
                className={`bg-white rounded-2xl border p-3.5 shadow-2xs flex flex-col min-h-[300px] ${
                  day.isToday
                    ? 'border-indigo-300 ring-2 ring-indigo-500/10'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      {day.dayName}
                    </span>
                    <span
                      className={`text-base font-extrabold ${
                        day.isToday ? 'text-indigo-600' : 'text-slate-900'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onOpenTaskModal(undefined, day.dateStr)}
                    className="text-slate-400 hover:text-indigo-600"
                    title="Ajouter pour ce jour"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Day Tasks List */}
                <div className="space-y-1.5 flex-1 overflow-y-auto">
                  {dayTasks.length === 0 ? (
                    <div className="py-8 text-center text-slate-300 text-[11px] font-medium">
                      Aucune tâche
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      const cat = getCategory(task.category);
                      const overdue = isTaskOverdue(task);

                      return (
                        <div
                          key={task.id}
                          onClick={() => onOpenTaskModal(task)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer hover:shadow-xs space-y-1 ${
                            task.completed
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : overdue
                              ? 'bg-rose-50/60 border-rose-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleTaskCheckbox(e, task.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Circle className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span
                              className={`text-xs font-semibold leading-tight flex-1 line-clamp-2 ${
                                task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            {task.dueTime ? (
                              <span className="font-mono text-slate-600 font-medium">
                                {task.dueTime}
                              </span>
                            ) : (
                              <span className="text-slate-400">Jour</span>
                            )}
                            <span
                              className="px-1 py-0.2 rounded text-[9px] font-bold"
                              style={{
                                backgroundColor: `${cat.color}15`,
                                color: cat.color,
                              }}
                            >
                              {cat.name}
                            </span>
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
      )}

      {/* ========================================================================= */}
      {/* 3. DAY / AGENDA VIEW */}
      {/* ========================================================================= */}
      {viewType === 'day' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">
                Agenda du jour
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 capitalize">
                {currentDate.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
            </div>

            <Button
              size="sm"
              onClick={() => onOpenTaskModal(undefined, currentDate.toISOString().split('T')[0])}
              className="font-bold gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ajouter pour ce jour</span>
            </Button>
          </div>

          {/* Timeline Tasks */}
          <div className="space-y-3">
            {(() => {
              const dayStr = currentDate.toISOString().split('T')[0];
              const dayTasks = tasksByDate[dayStr] || [];

              if (dayTasks.length === 0) {
                return (
                  <div className="py-14 text-center text-slate-400">
                    <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Aucune tâche planifiée pour ce jour</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Cliquez sur &quot;Ajouter pour ce jour&quot; pour organiser votre planning.
                    </p>
                  </div>
                );
              }

              return dayTasks.map((task) => {
                const cat = getCategory(task.category);
                const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const overdue = isTaskOverdue(task);

                return (
                  <div
                    key={task.id}
                    onClick={() => onOpenTaskModal(task)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      task.completed
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : overdue
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => handleTaskCheckbox(e, task.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 hover:text-indigo-600" />
                        )}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-sm font-bold ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${priority.badge}`}>
                            {priority.label}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-xs">
                      {task.dueTime && (
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {task.dueTime}
                        </span>
                      )}
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: `${cat.color}15`,
                          color: cat.color,
                        }}
                      >
                        {cat.name}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
