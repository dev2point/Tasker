'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Bell,
  Search,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
  AlertCircle,
  Tag,
  ArrowUpDown,
  Layers,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { Task, Category, Priority, FilterType, GroupByType } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface ListViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task?: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onQuickAdd: (title: string, dueDate: string, dueTime?: string, category?: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onPostponeTask: (taskId: string, days: number) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  categories,
  onOpenTaskModal,
  onToggleComplete,
  onDeleteTask,
  onDuplicateTask,
  onQuickAdd,
  onToggleSubtask,
  onPostponeTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupByType>('dueDate');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Quick inline add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickTime, setQuickTime] = useState('14:00');
  const [quickCategory, setQuickCategory] = useState('travail');
  const [showAdvancedQuickAdd, setShowAdvancedQuickAdd] = useState(false);

  const getCategory = (catId: string) =>
    categories.find((c) => c.id === catId) || {
      id: catId,
      name: catId,
      color: '#64748b',
      bgLight: 'bg-slate-50 text-slate-700 border-slate-200',
      iconName: 'Folder',
    };

  const toggleTaskExpand = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAdd(quickTitle.trim(), quickDate, quickTime, quickCategory);
    setQuickTitle('');
    setShowAdvancedQuickAdd(false);
    soundManager.playClickSound();
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.filter((task) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesTag = task.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }

      // Filter tabs
      if (activeFilter === 'today') {
        if (task.dueDate !== todayStr || task.completed) return false;
      } else if (activeFilter === 'upcoming') {
        if (task.dueDate <= todayStr || task.completed) return false;
      } else if (activeFilter === 'overdue') {
        if (!isTaskOverdue(task)) return false;
      } else if (activeFilter === 'completed') {
        if (!task.completed) return false;
      } else if (activeFilter === 'urgent') {
        if (task.priority !== 'urgent' || task.completed) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && task.category !== selectedCategory) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, activeFilter, selectedCategory, selectedPriority]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    const priorityWeights: Record<Priority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return list.sort((a, b) => {
      // Completed always down
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'priority') {
        const diff = priorityWeights[b.priority] - priorityWeights[a.priority];
        if (diff !== 0) return diff;
      }

      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      // Default by dueDate & dueTime
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueTime && b.dueTime) {
        return a.dueTime.localeCompare(b.dueTime);
      }
      if (a.dueTime) return -1;
      if (b.dueTime) return 1;
      return 0;
    });
  }, [filteredTasks, sortBy]);

  // Group tasks
  const groupedTasks = useMemo<{ id: string; title: string; tasks: Task[]; badge?: string }[]>(() => {
    if (groupBy === 'none') {
      return [{ id: 'all', title: 'Toutes les tâches', tasks: sortedTasks, badge: '' }];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (groupBy === 'dueDate') {
      const groups: Record<string, Task[]> = {
        overdue: [],
        today: [],
        tomorrow: [],
        later: [],
        completed: [],
      };

      sortedTasks.forEach((t) => {
        if (t.completed) {
          groups.completed.push(t);
        } else if (isTaskOverdue(t)) {
          groups.overdue.push(t);
        } else if (t.dueDate === todayStr) {
          groups.today.push(t);
        } else if (t.dueDate === tomorrowStr) {
          groups.tomorrow.push(t);
        } else {
          groups.later.push(t);
        }
      });

      const result = [];
      if (groups.overdue.length > 0) {
        result.push({ id: 'overdue', title: 'En retard', tasks: groups.overdue, badge: 'text-rose-700 bg-rose-50 border-rose-200' });
      }
      if (groups.today.length > 0) {
        result.push({ id: 'today', title: "Aujourd'hui", tasks: groups.today, badge: 'text-indigo-700 bg-indigo-50 border-indigo-200' });
      }
      if (groups.tomorrow.length > 0) {
        result.push({ id: 'tomorrow', title: 'Demain', tasks: groups.tomorrow, badge: 'text-sky-700 bg-sky-50 border-sky-200' });
      }
      if (groups.later.length > 0) {
        result.push({ id: 'later', title: 'À venir plus tard', tasks: groups.later, badge: 'text-slate-700 bg-slate-100 border-slate-200' });
      }
      if (groups.completed.length > 0) {
        result.push({ id: 'completed', title: 'Terminées', tasks: groups.completed, badge: 'text-emerald-700 bg-emerald-50 border-emerald-200' });
      }
      return result;
    }

    if (groupBy === 'priority') {
      const priorities: Priority[] = ['urgent', 'high', 'medium', 'low'];
      return priorities
        .map((p) => ({
          id: p,
          title: `Priorité ${PRIORITY_CONFIG[p]?.label}`,
          tasks: sortedTasks.filter((t) => t.priority === p),
          badge: PRIORITY_CONFIG[p]?.badge,
        }))
        .filter((g) => g.tasks.length > 0);
    }

    if (groupBy === 'category') {
      return categories
        .map((cat) => ({
          id: cat.id,
          title: cat.name,
          tasks: sortedTasks.filter((t) => t.category === cat.id),
          badge: `${cat.bgLight}`,
        }))
        .filter((g) => g.tasks.length > 0);
    }

    return [{ id: 'all', title: 'Tâches', tasks: sortedTasks }];
  }, [sortedTasks, groupBy, categories]);

  const handleCheckboxClick = (taskId: string, currentCompleted: boolean) => {
    if (!currentCompleted) {
      soundManager.playCompleteSound();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      soundManager.playClickSound();
    }
    onToggleComplete(taskId);
  };

  const filterCounts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      all: tasks.length,
      today: tasks.filter((t) => t.dueDate === todayStr && !t.completed).length,
      upcoming: tasks.filter((t) => t.dueDate > todayStr && !t.completed).length,
      overdue: tasks.filter((t) => isTaskOverdue(t)).length,
      completed: tasks.filter((t) => t.completed).length,
      urgent: tasks.filter((t) => t.priority === 'urgent' && !t.completed).length,
    };
  }, [tasks]);

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      
      {/* Mobile-First Quick Add Card */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="bg-white p-3 sm:p-4 rounded-2xl border border-indigo-100/90 shadow-sm shadow-indigo-100/40 transition-all focus-within:border-indigo-300 focus-within:shadow-md"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>
          <input
            type="text"
            id="quick-add-task-input"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onFocus={() => setShowAdvancedQuickAdd(true)}
            placeholder="Ajouter une tâche rapidement (ex: Préparer le rapport)..."
            className="w-full text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden bg-transparent"
          />
          <Button
            type="submit"
            id="quick-add-submit-btn"
            size="xs"
            disabled={!quickTitle.trim()}
            className="shrink-0 font-bold"
          >
            Ajouter
          </Button>
        </div>

        {/* Expandable options row */}
        {showAdvancedQuickAdd && (
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-2.5 border-t border-slate-100 text-xs animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="time"
                value={quickTime}
                onChange={(e) => setQuickTime(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden"
              />
            </div>

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-hidden"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onOpenTaskModal()}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 ml-auto flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Options avancées</span>
            </button>
          </div>
        )}
      </form>

      {/* Filter Chips & Horizontal Scroll Navigation */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        
        {/* Horizontal Status Chips Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold -mx-1 px-1">
          {[
            { id: 'all', label: 'Toutes', count: filterCounts.all },
            { id: 'today', label: "Aujourd'hui", count: filterCounts.today },
            { id: 'upcoming', label: 'À venir', count: filterCounts.upcoming },
            { id: 'overdue', label: 'En retard', count: filterCounts.overdue, alert: filterCounts.overdue > 0 },
            { id: 'urgent', label: 'Urgentes', count: filterCounts.urgent },
            { id: 'completed', label: 'Terminées', count: filterCounts.completed },
          ].map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as FilterType)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 select-none ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : f.alert
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : f.alert
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-slate-200/90 text-slate-700'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] -mx-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Toutes catégories
          </button>
          {categories.map((c) => {
            const active = selectedCategory === c.id;
            const count = tasks.filter((t) => t.category === c.id && !t.completed).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(active ? 'all' : c.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap border ${
                  active
                    ? 'shadow-2xs text-white border-transparent'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                style={active ? { backgroundColor: c.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? '#ffffff' : c.color }}
                />
                <span>{c.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1 rounded-full font-bold ${active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search, Grouping & Sort Options */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher tâche, tag..."
              className="w-full pl-8.5 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
            {/* Group By selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByType)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden pr-1 cursor-pointer"
              >
                <option value="dueDate">Grouper par Date</option>
                <option value="priority">Grouper par Priorité</option>
                <option value="category">Grouper par Catégorie</option>
                <option value="none">Sans groupement</option>
              </select>
            </div>

            {/* Sort By selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'title')}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-hidden pr-1 cursor-pointer"
              >
                <option value="dueDate">Trier par Échéance</option>
                <option value="priority">Trier par Priorité</option>
                <option value="title">Trier par Titre</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Task Groups and Items */}
      {groupedTasks.length === 0 || sortedTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-10 sm:p-14 text-center text-slate-400 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
            <Calendar className="w-7 h-7 stroke-[1.7]" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aucune tâche à afficher</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? 'Aucune tâche ne correspond à votre recherche.'
              : activeFilter === 'completed'
              ? 'Aucune tâche terminée pour le moment.'
              : 'Toutes vos tâches sont à jour ou aucune tâche n’a encore été planifiée.'}
          </p>
          <Button
            onClick={() => onOpenTaskModal()}
            size="sm"
            className="mt-4 font-bold shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Créer une tâche</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedTasks.map((group) => (
            <div key={group.id} className="space-y-2">
              
              {/* Group Header */}
              {groupBy !== 'none' && (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border shadow-2xs ${group.badge || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {group.title}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      ({group.tasks.length})
                    </span>
                  </div>
                </div>
              )}

              {/* Tasks List Container */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                {group.tasks.map((task) => {
                  const cat = getCategory(task.category);
                  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                  const isOverdue = isTaskOverdue(task);
                  const isExpanded = Boolean(expandedTasks[task.id]);
                  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;
                  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 sm:p-4 transition-colors hover:bg-slate-50/80 border-l-4 ${
                        task.completed
                          ? 'border-l-slate-300 bg-slate-50/40'
                          : isOverdue
                          ? 'border-l-rose-500 bg-rose-50/20'
                          : priority.border
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        
                        {/* Checkbox and main details */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleCheckboxClick(task.id, task.completed)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0 focus:outline-hidden"
                            title={task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="w-5 h-5 hover:text-indigo-600 transition-colors" />
                            )}
                          </button>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <h4
                                onClick={() => onOpenTaskModal(task)}
                                className={`text-sm font-bold cursor-pointer hover:text-indigo-600 transition-colors leading-snug ${
                                  task.completed
                                    ? 'line-through text-slate-400 font-medium'
                                    : 'text-slate-900'
                                }`}
                              >
                                {task.title}
                              </h4>

                              {/* Priority pill */}
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${priority.badge}`}>
                                {priority.label}
                              </span>

                              {/* Category pill */}
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${cat.color}15`,
                                  color: cat.color,
                                }}
                              >
                                {cat.name}
                              </span>
                            </div>

                            {/* Description preview */}
                            {task.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                                {task.description}
                              </p>
                            )}

                            {/* Meta Tags, Date, Time & Reminders */}
                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-500 pt-1">
                              {/* Due Date & Time */}
                              <span
                                className={`flex items-center gap-1 font-semibold ${
                                  isOverdue
                                    ? 'text-rose-600 font-bold'
                                    : task.dueDate === new Date().toISOString().split('T')[0]
                                    ? 'text-indigo-600 font-bold'
                                    : 'text-slate-600'
                                }`}
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDueDateFrench(task.dueDate, task.dueTime)}
                              </span>

                              {/* Automated Reminder indicator */}
                              {task.reminderMinutesBefore >= 0 && !task.completed && (
                                <span className="flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <Bell className="w-3 h-3 text-amber-500" />
                                  {task.reminderMinutesBefore === 0
                                    ? 'À l’heure'
                                    : `${task.reminderMinutesBefore}m avant`}
                                </span>
                              )}

                              {/* Subtasks pill & toggle */}
                              {totalSubtasks > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleTaskExpand(task.id)}
                                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] bg-indigo-50/70 px-2 py-0.5 rounded-md border border-indigo-100"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                  <span>
                                    {completedSubtasks}/{totalSubtasks}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                </button>
                              )}

                              {/* Tags */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {task.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Touch-friendly & Desktop hover) */}
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 self-start sm:self-center">
                          {/* Quick Postpone +1 day */}
                          {!task.completed && (
                            <button
                              type="button"
                              onClick={() => onPostponeTask(task.id, 1)}
                              title="Reporter à demain (+1 jour)"
                              className="px-2 py-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors text-[11px] font-bold border border-slate-200/60"
                            >
                              +1j
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => onOpenTaskModal(task)}
                            title="Modifier la tâche"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => onDuplicateTask(task)}
                            title="Dupliquer la tâche"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors hidden sm:inline-flex"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            title="Supprimer la tâche"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Subtasks Inline Checklist */}
                      {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-3 pl-8 pr-2 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in-50 duration-150">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span className="uppercase tracking-wider">Sous-tâches & Étapes</span>
                            <span>{Math.round(subtaskProgress)}%</span>
                          </div>
                          
                          {/* Mini Progress Bar */}
                          <Progress value={subtaskProgress} className="h-1.5" />

                          <div className="space-y-1.5 pt-1">
                            {task.subtasks.map((st) => (
                              <label
                                key={st.id}
                                className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/90 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer transition-colors border border-slate-200/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => onToggleSubtask(task.id, st.id)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                                />
                                <span className={st.completed ? 'line-through text-slate-400' : 'text-slate-800'}>
                                  {st.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
