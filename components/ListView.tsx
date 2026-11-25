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
  SlidersHorizontal,
  FolderPlus,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Category, Priority, FilterType, GroupByType, TaskStatus } from '@/types/task';
import {
  PRIORITY_CONFIG,
  TASK_STATUS_ORDER,
  TASK_STATUS_CONFIG,
  normalizeTaskStatus,
} from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { CategoryIcon } from '@/components/CategoryIcon';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User } from '@/types/user';
import { canUserCompleteTask, canUserDeleteTask, canUserEditTask } from '@/lib/rbac';
import {
  getDefaultDueDateTime,
  getMinDateStr,
  getMinTimeForDate,
  isDueDateTimeInPast,
} from '@/lib/due-date-utils';

interface ListViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task?: Task, mode?: 'view' | 'edit') => void;
  onToggleComplete: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task) => void;
  onQuickAdd: (title: string, dueDate: string, dueTime?: string, category?: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onPostponeTask: (taskId: string, days: number) => void;
  onOpenCategoryTagManager?: (initialTab?: 'categories' | 'tags') => void;
  currentUser?: User | null;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  categories,
  onOpenTaskModal,
  onToggleComplete,
  onUpdateTaskStatus,
  onDeleteTask,
  onDuplicateTask,
  onQuickAdd,
  onToggleSubtask,
  onPostponeTask,
  onOpenCategoryTagManager,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupByType>('dueDate');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Quick inline add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [quickTime, setQuickTime] = useState('');
  const [quickCategory, setQuickCategory] = useState(categories[0]?.id || 'fiscalite');
  const [showAdvancedQuickAdd, setShowAdvancedQuickAdd] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const allAvailableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      if (t.tags && Array.isArray(t.tags)) {
        t.tags.forEach((tag) => {
          const clean = tag.trim().toLowerCase();
          if (clean) {
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [tasks]);

  const getCategory = (catId: string) =>
    categories.find((c) => c.id === catId) || {
      id: catId,
      name: catId,
      color: '#004266',
      bgLight: 'bg-[#004266]/10 text-[#004266] border-[#004266]/25',
      iconName: 'Folder',
    };

  const toggleTaskExpand = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTagFilter = (tag: string) => {
    const normalized = tag.toLowerCase();
    setSelectedTags((prev) =>
      prev.includes(normalized) ? prev.filter((t) => t !== normalized) : [...prev, normalized]
    );
    soundManager.playClickSound();
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setSelectedCategory('all');
    setSelectedTags([]);
    setSelectedPriority('all');
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    if (isDueDateTimeInPast(quickDate, quickTime)) {
      soundManager.playClickSound();
      setQuickAddError("L'échéance d'une nouvelle tâche ne peut pas être fixée dans le passé.");
      return;
    }

    setQuickAddError(null);
    soundManager.playClickSound();
    onQuickAdd(
      quickTitle.trim(),
      quickDate,
      quickTime || undefined,
      quickCategory
    );
    setQuickTitle('');
    setQuickDate('');
    setQuickTime('');
    setShowAdvancedQuickAdd(false);
  };

  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.filter((task) => {
      const normalizedStatus = normalizeTaskStatus(task.status, task.completed);
      if (activeFilter === 'today' && (task.dueDate !== todayStr || task.completed)) {
        return false;
      }
      if (activeFilter === 'upcoming' && (task.dueDate <= todayStr || task.completed)) {
        return false;
      }
      if (activeFilter === 'overdue' && !isTaskOverdue(task)) {
        return false;
      }
      if (activeFilter === 'completed' && normalizedStatus !== 'completed') {
        return false;
      }
      if (activeFilter === 'todo' && normalizedStatus !== 'todo') {
        return false;
      }
      if (activeFilter === 'in_progress' && normalizedStatus !== 'in_progress') {
        return false;
      }
      if (activeFilter === 'waiting' && normalizedStatus !== 'waiting') {
        return false;
      }
      if (activeFilter === 'urgent' && (task.priority !== 'urgent' || task.completed)) {
        return false;
      }

      if (selectedCategory !== 'all' && task.category !== selectedCategory) {
        return false;
      }

      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      if (selectedTags.length > 0) {
        const taskTagsLower = (task.tags || []).map((t) => t.toLowerCase());
        const hasAllSelected = selectedTags.every((st) => taskTagsLower.includes(st));
        if (!hasAllSelected) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q) || false;
        const matchesTags = (task.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesAssignee = task.assigneeName?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesAssignee) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, activeFilter, selectedCategory, selectedPriority, selectedTags, searchQuery]);

  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    const priorityWeights: Record<Priority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return list.sort((a, b) => {
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
        result.push({ id: 'overdue', title: 'En retard', tasks: groups.overdue, badge: 'text-rose-600 dark:text-rose-400' });
      }
      if (groups.today.length > 0) {
        result.push({ id: 'today', title: "Aujourd'hui", tasks: groups.today, badge: 'text-[#B85A00] dark:text-[#FFB35C]' });
      }
      if (groups.tomorrow.length > 0) {
        result.push({ id: 'tomorrow', title: 'Demain', tasks: groups.tomorrow, badge: 'text-[#004266] dark:text-[#7CC4EB]' });
      }
      if (groups.later.length > 0) {
        result.push({ id: 'later', title: 'À venir plus tard', tasks: groups.later, badge: 'text-[#486075] dark:text-[#9FB3C8]' });
      }
      if (groups.completed.length > 0) {
        result.push({ id: 'completed', title: 'Terminées', tasks: groups.completed, badge: 'text-emerald-700 dark:text-emerald-400' });
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
          badge: 'text-[#486075] dark:text-[#9FB3C8]',
        }))
        .filter((g) => g.tasks.length > 0);
    }

    if (groupBy === 'category') {
      return categories
        .map((cat) => ({
          id: cat.id,
          title: cat.name,
          tasks: sortedTasks.filter((t) => t.category === cat.id),
          badge: 'text-[#486075] dark:text-[#9FB3C8]',
        }))
        .filter((g) => g.tasks.length > 0);
    }

    if (groupBy === 'tag') {
      const tagMap: Record<string, Task[]> = {};
      const noTagTasks: Task[] = [];

      sortedTasks.forEach((t) => {
        if (!t.tags || t.tags.length === 0) {
          noTagTasks.push(t);
        } else {
          t.tags.forEach((tag) => {
            const clean = tag.trim().toLowerCase();
            if (!tagMap[clean]) tagMap[clean] = [];
            tagMap[clean].push(t);
          });
        }
      });

      const result = Object.entries(tagMap)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([tag, list]) => ({
          id: `tag-${tag}`,
          title: `#${tag}`,
          tasks: list,
          badge: 'text-[#004266] dark:text-[#7CC4EB]',
        }));

      if (noTagTasks.length > 0) {
        result.push({
          id: 'no-tag',
          title: 'Sans étiquette',
          tasks: noTagTasks,
          badge: 'text-[#64748B] dark:text-[#9FB3C8]',
        });
      }

      return result;
    }

    if (groupBy === 'status') {
      return TASK_STATUS_ORDER.map((statusId) => {
        const cfg = TASK_STATUS_CONFIG[statusId];
        return {
          id: `status-${statusId}`,
          title: cfg.label,
          tasks: sortedTasks.filter(
            (t) => normalizeTaskStatus(t.status, t.completed) === statusId
          ),
          badge: cfg.badgeClass,
        };
      }).filter((g) => g.tasks.length > 0);
    }

    return [{ id: 'all', title: 'Tâches', tasks: sortedTasks }];
  }, [sortedTasks, groupBy, categories]);

  const handleCheckboxClick = (taskId: string, currentCompleted: boolean) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && currentUser && !canUserCompleteTask(task, currentUser)) {
      soundManager.playClickSound();
      return;
    }
    if (!currentCompleted) {
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
    onToggleComplete(taskId);
  };

  const handleStatusSelectChange = (task: Task, newStatus: TaskStatus) => {
    const currentStatus = normalizeTaskStatus(task.status, task.completed);
    if (currentStatus === newStatus) return;

    if (currentUser) {
      if (newStatus === 'completed' && !canUserCompleteTask(task, currentUser)) {
        soundManager.playClickSound();
        return;
      }
      if (!canUserEditTask(task, currentUser) && !canUserCompleteTask(task, currentUser)) {
        soundManager.playClickSound();
        return;
      }
    }

    if (newStatus === 'completed') {
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

    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(task.id, newStatus);
    } else if (newStatus === 'completed' || currentStatus === 'completed') {
      onToggleComplete(task.id);
    }
  };

  const filterCounts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      all: tasks.length,
      today: tasks.filter((t) => t.dueDate === todayStr && !t.completed).length,
      upcoming: tasks.filter((t) => t.dueDate > todayStr && !t.completed).length,
      overdue: tasks.filter((t) => isTaskOverdue(t)).length,
      todo: tasks.filter((t) => normalizeTaskStatus(t.status, t.completed) === 'todo').length,
      in_progress: tasks.filter((t) => normalizeTaskStatus(t.status, t.completed) === 'in_progress').length,
      waiting: tasks.filter((t) => normalizeTaskStatus(t.status, t.completed) === 'waiting').length,
      completed: tasks.filter((t) => normalizeTaskStatus(t.status, t.completed) === 'completed').length,
      urgent: tasks.filter((t) => t.priority === 'urgent' && !t.completed).length,
    };
  }, [tasks]);

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedTags.length > 0 ||
    selectedPriority !== 'all' ||
    searchQuery.trim().length > 0 ||
    activeFilter !== 'all';

  return (
    <div className="space-y-3.5 pb-16 md:pb-6">
      {/* Quick Add Form */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-2.5 sm:p-3 shadow-sm transition-all focus-within:border-[#004266] dark:focus-within:border-[#3895C9] focus-within:ring-1 focus-within:ring-[#004266]/20 dark:focus-within:ring-[#3895C9]/30 text-[#0B1F30] dark:text-[#F1F5F9]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] flex items-center justify-center shrink-0 border border-[#004266]/20 dark:border-[#3895C9]/30">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <input
            type="text"
            id="quick-add-task-input"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onFocus={() => {
              if (!quickDate) {
                const nextDefault = getDefaultDueDateTime();
                setQuickDate(nextDefault.dueDate);
                setQuickTime(nextDefault.dueTime);
              }
              setShowAdvancedQuickAdd(true);
            }}
            placeholder="Créer une tâche rapidement... (Appuyez sur Entrée)"
            className="w-full text-xs sm:text-sm font-medium text-[#0B1F30] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#9FB3C8]/70 focus:outline-hidden bg-transparent"
          />
          <Button
            type="submit"
            id="quick-add-submit-btn"
            variant="accent"
            size="xs"
            disabled={!quickTitle.trim()}
            className="shrink-0 font-bold shadow-xs cursor-pointer rounded-lg px-3"
          >
            Créer
          </Button>
        </div>

        {/* Quick Add Error banner */}
        {quickAddError && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{quickAddError}</span>
          </div>
        )}

        {/* Expandable options row */}
        {showAdvancedQuickAdd && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15 text-xs animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-1.5 bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1 text-[#486075] dark:text-[#9FB3C8]">
              <Calendar className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
              <input
                type="date"
                min={getMinDateStr()}
                value={quickDate}
                onChange={(e) => {
                  setQuickDate(e.target.value);
                  setQuickAddError(null);
                }}
                className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1 text-[#486075] dark:text-[#9FB3C8]">
              <Clock className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
              <input
                type="time"
                min={getMinTimeForDate(quickDate)}
                value={quickTime}
                onChange={(e) => {
                  setQuickTime(e.target.value);
                  setQuickAddError(null);
                }}
                className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden cursor-pointer"
              />
            </div>

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onOpenTaskModal()}
              className="text-[11px] font-semibold text-[#004266] hover:text-[#00314D] dark:text-[#7CC4EB] dark:hover:text-white ml-auto flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Plus d&apos;options</span>
            </button>
          </div>
        )}
      </form>

      {/* Unified Filter & Command Toolbar */}
      <div className="bg-white dark:bg-[#0B2438] p-2.5 sm:p-3 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-sm space-y-2.5 text-[#0B1F30] dark:text-[#F1F5F9]">
        {/* Row 1: Segmented Status Controls */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1 text-xs">
            {[
              { id: 'all', label: 'Toutes', count: filterCounts.all },
              { id: 'today', label: "Aujourd'hui", count: filterCounts.today },
              { id: 'upcoming', label: 'À venir', count: filterCounts.upcoming },
              { id: 'overdue', label: 'En retard', count: filterCounts.overdue, alert: filterCounts.overdue > 0 },
              { id: 'urgent', label: 'Urgentes', count: filterCounts.urgent },
              { id: 'todo', label: 'Non démarrée', count: filterCounts.todo },
              { id: 'in_progress', label: 'En cours', count: filterCounts.in_progress },
              { id: 'waiting', label: 'En attente', count: filterCounts.waiting },
              { id: 'completed', label: 'Terminées', count: filterCounts.completed },
            ].map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as FilterType)}
                  className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                    active
                      ? 'bg-[#004266] text-white font-bold shadow-xs dark:bg-[#3895C9] dark:text-[#061826]'
                      : f.alert
                      ? 'text-rose-600 hover:bg-rose-50 border border-rose-200 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:border-rose-500/30'
                      : 'text-[#486075] hover:text-[#0B1F30] hover:bg-[#EDF2F7] border border-transparent dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#103049]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums font-semibold ${
                      active
                        ? 'text-white/85 dark:text-[#061826]/80'
                        : f.alert
                        ? 'text-rose-600 dark:text-rose-300'
                        : 'text-[#64748B] dark:text-[#9FB3C8]/70'
                    }`}
                  >
                    · {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Réinitialiser les filtres"
              >
                <X className="w-3 h-3" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}

            {onOpenCategoryTagManager && (
              <button
                type="button"
                onClick={() => onOpenCategoryTagManager('categories')}
                className="px-2 py-1 rounded-lg text-xs font-medium gap-1 text-[#486075] hover:text-[#004266] hover:bg-[#EDF2F7] border border-[#D8E2EC] dark:text-[#9FB3C8] dark:hover:text-[#7CC4EB] dark:hover:bg-[#103049] dark:border-[#94B8D6]/20 cursor-pointer flex items-center transition-colors"
                title="Gérer les catégories et étiquettes"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                <span className="hidden md:inline">Catégories</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search + Dropdown Filters + Group/Sort */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#9FB3C8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une tâche, un pôle..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#103049] text-xs font-medium text-[#0B1F30] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#9FB3C8]/70 focus:ring-1 focus:ring-[#004266] focus:border-[#004266] dark:focus:ring-[#3895C9] dark:focus:border-[#3895C9] outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0B1F30] dark:text-[#9FB3C8] dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9] shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden pr-1 cursor-pointer max-w-[140px] truncate"
            >
              <option value="all" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Tous les Pôles</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {allAvailableTags.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1">
              <Tag className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9] shrink-0" />
              <select
                value={selectedTags[0] || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTags(val === 'all' ? [] : [val]);
                }}
                className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden pr-1 cursor-pointer max-w-[120px] truncate"
              >
                <option value="all" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Tous les Tags</option>
                {allAvailableTags.map((t) => (
                  <option key={t.name} value={t.name} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">
                    #{t.name} ({t.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9] shrink-0" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByType)}
              className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden pr-1 cursor-pointer max-w-[130px] truncate"
            >
              <option value="dueDate" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Grouper: Date</option>
              <option value="status" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Grouper: Statut</option>
              <option value="category" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Grouper: Pôle</option>
              <option value="tag" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Grouper: Tag</option>
              <option value="priority" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Grouper: Priorité</option>
              <option value="none" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Sans groupe</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4F7FA] dark:bg-[#103049] border border-[#D8E2EC] dark:border-[#94B8D6]/20 rounded-lg px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'title')}
              className="bg-transparent text-xs font-semibold text-[#0B1F30] dark:text-[#F1F5F9] outline-hidden pr-1 cursor-pointer max-w-[120px] truncate"
            >
              <option value="dueDate" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Trier: Échéance</option>
              <option value="priority" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Trier: Priorité</option>
              <option value="title" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-[#F1F5F9]">Trier: Titre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Groups */}
      {groupedTasks.length === 0 || sortedTasks.length === 0 ? (
        <div className="bg-white dark:bg-[#0B2438] rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 p-10 text-center text-[#486075] dark:text-[#9FB3C8] shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#004266]/10 text-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-bold text-[#0B1F30] dark:text-[#F1F5F9]">Aucune tâche trouvée</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Aucune tâche ne correspond aux filtres actifs.'
              : 'Aucune tâche enregistrée pour le moment.'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="font-semibold text-xs cursor-pointer">
                Effacer les filtres
              </Button>
            )}
            <Button
              variant="accent"
              onClick={() => onOpenTaskModal()}
              size="sm"
              className="font-bold text-xs cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Créer une tâche</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTasks.map((group) => (
            <div key={group.id} className="space-y-1.5">
              {groupBy !== 'none' && (
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0B1F30] dark:text-[#F1F5F9]">
                      {group.title}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-[#004266] dark:text-[#7CC4EB] font-bold">
                      {group.tasks.length}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15 overflow-hidden bg-white dark:bg-[#0B2438] shadow-sm">
                <AnimatePresence initial={false}>
                  {group.tasks.map((task) => {
                    const cat = getCategory(task.category);
                    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const isOverdue = isTaskOverdue(task);
                    const isExpanded = Boolean(expandedTasks[task.id]);
                    const taskStatus = normalizeTaskStatus(task.status, task.completed);
                    const statusCfg = TASK_STATUS_CONFIG[taskStatus];
                    const canComplete = canUserCompleteTask(task, currentUser || null);
                    const canEditStatus = currentUser
                      ? canUserEditTask(task, currentUser) || canComplete
                      : true;
                    const canDelete = canUserDeleteTask(task, currentUser || null);
                    const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
                    const totalSubtasks = task.subtasks?.length || 0;
                    const subtaskProgress =
                      totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className={`group p-3 sm:p-3.5 transition-colors hover:bg-[#F4F7FA] dark:hover:bg-[#103049]/80 ${
                          task.completed
                            ? 'bg-[#F4F7FA]/60 dark:bg-[#061826]/30 opacity-70'
                            : isOverdue
                            ? 'bg-rose-50/50 dark:bg-rose-950/15'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Checkbox and main details */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              disabled={!canComplete}
                              onClick={() => handleCheckboxClick(task.id, task.completed)}
                              className={`mt-0.5 transition-colors shrink-0 focus:outline-hidden ${
                                !canComplete
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : 'text-[#64748B] hover:text-[#004266] dark:text-[#9FB3C8] dark:hover:text-[#7CC4EB] cursor-pointer'
                              }`}
                              title={
                                !canComplete
                                  ? "Seul l'assigné, le créateur ou un administrateur peut marquer cette tâche comme terminée"
                                  : task.completed
                                  ? 'Marquer comme non terminée'
                                  : 'Marquer comme terminée'
                              }
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Circle className="w-4.5 h-4.5" />
                              )}
                            </button>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4
                                  onClick={() => onOpenTaskModal(task, 'view')}
                                  className={`text-xs sm:text-sm font-semibold cursor-pointer hover:text-[#004266] dark:hover:text-[#7CC4EB] transition-colors leading-snug ${
                                    task.completed
                                      ? 'line-through text-[#64748B] dark:text-[#9FB3C8]/70'
                                      : 'text-[#0B1F30] dark:text-[#F1F5F9]'
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                <div className="flex items-center gap-1.5 text-[11px] text-[#486075] dark:text-[#9FB3C8] font-medium">
                                  <span>·</span>
                                  <div className="flex items-center gap-1">
                                    <CategoryIcon name={cat.iconName} className="w-2.5 h-2.5" style={{ color: cat.color }} />
                                    <span className="text-[#0B1F30] dark:text-[#F1F5F9] font-semibold">{cat.name}</span>
                                  </div>
                                  <span>·</span>
                                  <span
                                    className={`inline-flex items-center gap-1 font-semibold ${
                                      task.priority === 'urgent'
                                        ? 'text-rose-600 dark:text-rose-300'
                                        : task.priority === 'high'
                                        ? 'text-[#B85A00] dark:text-[#FFB35C]'
                                        : 'text-[#486075] dark:text-[#9FB3C8]'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                                    {priority.label}
                                  </span>
                                </div>
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8] line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-xs text-[#486075] dark:text-[#9FB3C8] pt-0.5">
                                <span
                                  className={`flex items-center gap-1 font-mono tabular-nums text-[11px] ${
                                    isOverdue
                                      ? 'text-rose-600 dark:text-rose-300 font-bold'
                                      : task.dueDate === new Date().toISOString().split('T')[0]
                                      ? 'text-[#B85A00] dark:text-[#FFB35C] font-bold'
                                      : 'text-[#486075] dark:text-[#9FB3C8]'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 text-[#004266] dark:text-[#3895C9]" />
                                  {formatDueDateFrench(task.dueDate, task.dueTime)}
                                </span>

                                {task.reminderMinutesBefore >= 0 && !task.completed && (
                                  <span className="flex items-center gap-1 text-[11px] text-[#004266] dark:text-[#7CC4EB] font-mono tabular-nums">
                                    <Bell className="w-3 h-3" />
                                    {task.reminderMinutesBefore === 0
                                      ? 'Rappel à l’heure'
                                      : `${task.reminderMinutesBefore}m`}
                                  </span>
                                )}

                                {task.assigneeName && (
                                  <span className="text-[#486075] dark:text-[#9FB3C8] text-[11px] flex items-center gap-1">
                                    <span>·</span>
                                    <span>{task.assigneeName.split(' ')[0]}</span>
                                  </span>
                                )}

                                {totalSubtasks > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskExpand(task.id)}
                                    className="flex items-center gap-1 text-[#004266] hover:text-[#00314D] dark:text-[#7CC4EB] dark:hover:text-white font-mono text-[11px] tabular-nums cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
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

                                {task.trackedFiles && task.trackedFiles.length > 0 && (
                                  <span
                                    onClick={() => onOpenTaskModal(task)}
                                    className="flex items-center gap-1 text-[#B85A00] dark:text-[#FFB35C] text-[11px] font-mono cursor-pointer hover:underline tabular-nums"
                                    title={`${task.trackedFiles.length} document(s)`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>{task.trackedFiles.length} doc</span>
                                  </span>
                                )}

                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#004266] dark:text-[#7CC4EB]">
                                    {task.tags.map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleTagFilter(t)}
                                        className="hover:underline cursor-pointer"
                                      >
                                        #{t}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center opacity-95 group-hover:opacity-100 transition-opacity">
                            <select
                              aria-label={`Statut de ${task.title}`}
                              value={taskStatus}
                              disabled={!canEditStatus || !onUpdateTaskStatus}
                              onChange={(e) =>
                                handleStatusSelectChange(task, e.target.value as TaskStatus)
                              }
                              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold outline-hidden cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${statusCfg.selectClass}`}
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

                            {!task.completed && (
                              <button
                                type="button"
                                onClick={() => onPostponeTask(task.id, 1)}
                                title="Reporter à demain (+1 jour)"
                                className="px-2 py-0.5 rounded text-[#004266] hover:bg-[#004266]/10 dark:text-[#7CC4EB] dark:hover:bg-[#3895C9]/20 transition-colors font-mono text-[11px] font-semibold border border-[#D8E2EC] dark:border-[#94B8D6]/25 cursor-pointer shrink-0"
                              >
                                +1j
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenTaskModal(task, 'edit')}
                              title="Modifier la tâche"
                              className="p-1 rounded text-[#486075] hover:text-[#004266] hover:bg-[#004266]/10 dark:text-[#9FB3C8] dark:hover:text-[#7CC4EB] dark:hover:bg-[#3895C9]/15 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDuplicateTask(task)}
                              title="Dupliquer la tâche"
                              className="p-1 rounded text-[#486075] hover:text-[#004266] hover:bg-[#004266]/10 dark:text-[#9FB3C8] dark:hover:text-white dark:hover:bg-[#3895C9]/15 transition-colors hidden sm:inline-flex cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => {
                                if (canDelete) {
                                  onDeleteTask(task.id);
                                }
                              }}
                              title={
                                canDelete
                                  ? 'Supprimer la tâche'
                                  : "Seul le créateur ou l'administrateur peut supprimer cette tâche"
                              }
                              className={`p-1 rounded transition-colors ${
                                canDelete
                                  ? 'text-[#486075] hover:text-rose-600 hover:bg-rose-50 dark:text-[#9FB3C8] dark:hover:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer'
                                  : 'text-slate-400 opacity-25 cursor-not-allowed'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Subtasks Inline Checklist */}
                        {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                          <div className="mt-2.5 pl-7 pr-2 pt-2.5 border-t border-[#D8E2EC] dark:border-[#94B8D6]/15 space-y-2 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#004266] dark:text-[#7CC4EB]">
                              <span className="uppercase tracking-wider">Sous-tâches</span>
                              <span className="font-mono tabular-nums">{Math.round(subtaskProgress)}%</span>
                            </div>

                            <Progress value={subtaskProgress} className="h-1.5" />

                            <div className="space-y-1 pt-0.5">
                              {task.subtasks.map((st) => (
                                <label
                                  key={st.id}
                                  className="flex items-center gap-2 p-1.5 rounded-lg bg-[#F4F7FA] hover:bg-[#EDF2F7] dark:bg-[#103049] dark:hover:bg-[#143B59] text-xs font-medium text-[#0B1F30] dark:text-[#F1F5F9] cursor-pointer transition-colors border border-[#D8E2EC] dark:border-[#94B8D6]/20"
                                >
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => onToggleSubtask(task.id, st.id)}
                                    className="rounded text-[#004266] focus:ring-[#004266] w-3.5 h-3.5 cursor-pointer accent-[#004266] dark:accent-[#3895C9]"
                                  />
                                  <span className={st.completed ? 'line-through text-[#64748B]' : ''}>
                                    {st.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
