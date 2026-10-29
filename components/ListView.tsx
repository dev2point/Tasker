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
  Hash,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Category, Priority, FilterType, GroupByType } from '@/types/task';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { CategoryIcon, getTagColor } from '@/components/CategoryIcon';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TaskScrollList } from '@/components/TaskScrollList';
import { User } from '@/types/user';
import { canUserCompleteTask, canUserDeleteTask } from '@/lib/rbac';

interface ListViewProps {
  tasks: Task[];
  categories: Category[];
  onOpenTaskModal: (task?: Task, mode?: 'view' | 'edit') => void;
  onToggleComplete: (taskId: string) => void;
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
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickTime, setQuickTime] = useState('14:00');
  const [quickCategory, setQuickCategory] = useState(categories[0]?.id || 'fiscalite');
  const [showAdvancedQuickAdd, setShowAdvancedQuickAdd] = useState(false);

  // Compute all available tags across tasks
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
      color: '#10b981',
      bgLight: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
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

    soundManager.playClickSound();
    onQuickAdd(
      quickTitle.trim(),
      quickDate,
      quickTime || undefined,
      quickCategory
    );
    setQuickTitle('');
    setShowAdvancedQuickAdd(false);
  };

  // Filter tasks based on all active criteria
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.filter((task) => {
      // 1. Completion / status filter
      if (activeFilter === 'today' && (task.dueDate !== todayStr || task.completed)) {
        return false;
      }
      if (activeFilter === 'upcoming' && (task.dueDate <= todayStr || task.completed)) {
        return false;
      }
      if (activeFilter === 'overdue' && !isTaskOverdue(task)) {
        return false;
      }
      if (activeFilter === 'completed' && !task.completed) {
        return false;
      }
      if (activeFilter === 'urgent' && (task.priority !== 'urgent' || task.completed)) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && task.category !== selectedCategory) {
        return false;
      }

      // 3. Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      // 4. Tags filter
      if (selectedTags.length > 0) {
        const taskTagsLower = (task.tags || []).map((t) => t.toLowerCase());
        const hasAllSelected = selectedTags.every((st) => taskTagsLower.includes(st));
        if (!hasAllSelected) return false;
      }

      // 5. Full text search query
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
        result.push({ id: 'overdue', title: 'En retard', tasks: groups.overdue, badge: 'text-rose-400 border-rose-500/30' });
      }
      if (groups.today.length > 0) {
        result.push({ id: 'today', title: "Aujourd'hui", tasks: groups.today, badge: 'text-amber-400 border-amber-500/30' });
      }
      if (groups.tomorrow.length > 0) {
        result.push({ id: 'tomorrow', title: 'Demain', tasks: groups.tomorrow, badge: 'text-sky-400 border-sky-500/30' });
      }
      if (groups.later.length > 0) {
        result.push({ id: 'later', title: 'À venir plus tard', tasks: groups.later, badge: 'text-slate-300 border-emerald-500/20' });
      }
      if (groups.completed.length > 0) {
        result.push({ id: 'completed', title: 'Terminées', tasks: groups.completed, badge: 'text-teal-400 border-teal-500/30' });
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
          badge: 'border-emerald-500/20 text-slate-300',
        }))
        .filter((g) => g.tasks.length > 0);
    }

    if (groupBy === 'category') {
      return categories
        .map((cat) => ({
          id: cat.id,
          title: cat.name,
          tasks: sortedTasks.filter((t) => t.category === cat.id),
          badge: 'border-emerald-500/20 text-slate-300',
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
          badge: 'border-emerald-500/20 text-emerald-300',
        }));

      if (noTagTasks.length > 0) {
        result.push({
          id: 'no-tag',
          title: 'Sans étiquette',
          tasks: noTagTasks,
          badge: 'border-emerald-500/20 text-slate-400',
        });
      }

      return result;
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
        colors: ['#10B981', '#34D399', '#6EE7B7'],
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

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedTags.length > 0 ||
    selectedPriority !== 'all' ||
    searchQuery.trim().length > 0 ||
    activeFilter !== 'all';

  return (
    <div className="space-y-3.5 pb-16 md:pb-6">
      {/* Linear-Style Sleek Quick Add Form */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="bg-[#051812]/95 rounded-2xl border border-emerald-500/20 p-2.5 sm:p-3 shadow-lg shadow-black/40 transition-all focus-within:border-emerald-400/80 focus-within:ring-1 focus-within:ring-emerald-400/30 text-slate-100"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <input
            type="text"
            id="quick-add-task-input"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onFocus={() => setShowAdvancedQuickAdd(true)}
            placeholder="Créer une tâche rapidement... (Appuyez sur Entrée)"
            className="w-full text-xs sm:text-sm font-medium text-white placeholder:text-slate-400 focus:outline-hidden bg-transparent"
          />
          <Button
            type="submit"
            id="quick-add-submit-btn"
            size="xs"
            disabled={!quickTitle.trim()}
            className="shrink-0 font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 shadow-xs cursor-pointer rounded-lg px-3"
          >
            Créer
          </Button>
        </div>

        {/* Expandable options row */}
        {showAdvancedQuickAdd && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-2 border-t border-emerald-500/15 text-xs animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-1.5 bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <input
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white outline-hidden cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <input
                type="time"
                value={quickTime}
                onChange={(e) => setQuickTime(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white outline-hidden cursor-pointer"
              />
            </div>

            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1 text-xs font-semibold text-white outline-hidden cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onOpenTaskModal()}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 ml-auto flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Plus d&apos;options</span>
            </button>
          </div>
        )}
      </form>

      {/* Unified Linear-Style Filter & Command Toolbar */}
      <div className="bg-[#051812]/95 p-2.5 sm:p-3 rounded-xl border border-emerald-500/20 shadow-md space-y-2.5 text-slate-100">
        {/* Row 1: Segmented Status Controls (Zero-Pill Discipline) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1 text-xs">
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
                  className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                      : f.alert
                      ? 'text-rose-300 hover:bg-rose-950/40 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums font-semibold ${
                      active
                        ? 'text-emerald-200'
                        : f.alert
                        ? 'text-rose-300'
                        : 'text-slate-500'
                    }`}
                  >
                    · {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rose-950/30 transition-colors cursor-pointer"
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
                className="px-2 py-1 rounded-lg text-xs font-medium gap-1 text-slate-400 hover:text-slate-200 hover:bg-emerald-500/10 border border-emerald-500/20 cursor-pointer flex items-center transition-colors"
                title="Gérer les catégories et étiquettes"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Catégories</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Consolidated Command Bar (Search + Dropdown Filters + Group/Sort) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/10 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une tâche, un pôle..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-emerald-500/20 bg-[#03140E] text-xs font-medium text-white placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pôle Selector */}
          <div className="flex items-center gap-1.5 bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-300 outline-hidden pr-1 cursor-pointer max-w-[140px] truncate"
            >
              <option value="all" className="bg-slate-900 text-white">Tous les Pôles</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Selector */}
          {allAvailableTags.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1">
              <Tag className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
              <select
                value={selectedTags[0] || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTags(val === 'all' ? [] : [val]);
                }}
                className="bg-transparent text-xs font-semibold text-slate-300 outline-hidden pr-1 cursor-pointer max-w-[120px] truncate"
              >
                <option value="all" className="bg-slate-900 text-white">Tous les Tags</option>
                {allAvailableTags.map((t) => (
                  <option key={t.name} value={t.name} className="bg-slate-900 text-white">
                    #{t.name} ({t.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grouping Selector */}
          <div className="flex items-center gap-1.5 bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByType)}
              className="bg-transparent text-xs font-semibold text-slate-300 outline-hidden pr-1 cursor-pointer max-w-[130px] truncate"
            >
              <option value="dueDate" className="bg-slate-900 text-white">Grouper: Date</option>
              <option value="category" className="bg-slate-900 text-white">Grouper: Pôle</option>
              <option value="tag" className="bg-slate-900 text-white">Grouper: Tag</option>
              <option value="priority" className="bg-slate-900 text-white">Grouper: Priorité</option>
              <option value="none" className="bg-slate-900 text-white">Sans groupe</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#03140E] border border-emerald-500/20 rounded-lg px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'title')}
              className="bg-transparent text-xs font-semibold text-slate-300 outline-hidden pr-1 cursor-pointer max-w-[120px] truncate"
            >
              <option value="dueDate" className="bg-slate-900 text-white">Trier: Échéance</option>
              <option value="priority" className="bg-slate-900 text-white">Trier: Priorité</option>
              <option value="title" className="bg-slate-900 text-white">Trier: Titre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Groups and Linear-Style Items */}
      {groupedTasks.length === 0 || sortedTasks.length === 0 ? (
        <div className="bg-[#051812]/90 rounded-2xl border border-emerald-500/15 p-10 text-center text-slate-400 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-bold text-white">Aucune tâche trouvée</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
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
              onClick={() => onOpenTaskModal()}
              size="sm"
              className="font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-xs"
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
              {/* Group Header */}
              {groupBy !== 'none' && (
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">
                      {group.title}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-emerald-400/80 font-bold">
                      {group.tasks.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Tasks List Container with Linear Styling */}
              <div className="rounded-xl border border-emerald-500/15 divide-y divide-emerald-500/10 overflow-hidden bg-[#051812]/95 shadow-md">
                <AnimatePresence initial={false}>
                  {group.tasks.map((task) => {
                    const cat = getCategory(task.category);
                    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const isOverdue = isTaskOverdue(task);
                    const isExpanded = Boolean(expandedTasks[task.id]);
                    const canComplete = canUserCompleteTask(task, currentUser || null);
                    const canDelete = canUserDeleteTask(task, currentUser || null);
                    const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
                    const totalSubtasks = task.subtasks?.length || 0;
                    const subtaskProgress =
                      totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

                    const priorityStripe =
                      task.priority === 'urgent'
                        ? 'border-l-rose-500'
                        : task.priority === 'high'
                        ? 'border-l-amber-500'
                        : task.priority === 'medium'
                        ? 'border-l-emerald-500/60'
                        : 'border-l-slate-600';

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className={`group p-3 sm:p-3.5 transition-colors hover:bg-[#08241b] border-l-3 ${
                          task.completed
                            ? 'border-l-slate-700 bg-slate-950/20 opacity-70'
                            : isOverdue
                            ? 'border-l-rose-500 bg-rose-950/15'
                            : priorityStripe
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
                                  ? 'opacity-30 cursor-not-allowed text-slate-600'
                                  : 'text-slate-500 hover:text-emerald-400 cursor-pointer'
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
                                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                              ) : (
                                <Circle className="w-4.5 h-4.5 hover:text-emerald-400 transition-colors" />
                              )}
                            </button>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4
                                  onClick={() => onOpenTaskModal(task, 'view')}
                                  className={`text-xs sm:text-sm font-semibold cursor-pointer hover:text-emerald-300 transition-colors leading-snug ${
                                    task.completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-100'
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                {/* Clean Unboxed Metadata Separators */}
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                  <span>·</span>
                                  <div className="flex items-center gap-1">
                                    <CategoryIcon name={cat.iconName} className="w-2.5 h-2.5" style={{ color: cat.color }} />
                                    <span className="text-slate-200 font-semibold">{cat.name}</span>
                                  </div>
                                  <span>·</span>
                                  <span className={`font-semibold ${
                                    task.priority === 'urgent'
                                      ? 'text-rose-300'
                                      : task.priority === 'high'
                                      ? 'text-amber-300'
                                      : 'text-slate-300'
                                  }`}>
                                    {priority.label}
                                  </span>
                                </div>
                              </div>

                              {/* Description preview */}
                              {task.description && (
                                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Tabular Numerals Metadata Bar */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                                {/* Due Date & Time */}
                                <span
                                  className={`flex items-center gap-1 font-mono tabular-nums text-[11px] ${
                                    isOverdue
                                      ? 'text-rose-300 font-bold'
                                      : task.dueDate === new Date().toISOString().split('T')[0]
                                      ? 'text-amber-300 font-bold'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  <Calendar className="w-3 h-3 text-emerald-400" />
                                  {formatDueDateFrench(task.dueDate, task.dueTime)}
                                </span>

                                {/* Automated Reminder */}
                                {task.reminderMinutesBefore >= 0 && !task.completed && (
                                  <span className="flex items-center gap-1 text-[11px] text-emerald-300 font-mono">
                                    <Bell className="w-3 h-3 text-emerald-400" />
                                    {task.reminderMinutesBefore === 0
                                      ? 'Rappel à l’heure'
                                      : `${task.reminderMinutesBefore}m`}
                                  </span>
                                )}

                                {/* Assignee Name */}
                                {task.assigneeName && (
                                  <span className="text-slate-300 text-[11px] flex items-center gap-1">
                                    <span>·</span>
                                    <span>{task.assigneeName.split(' ')[0]}</span>
                                  </span>
                                )}

                                {/* Subtasks progress indicator */}
                                {totalSubtasks > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskExpand(task.id)}
                                    className="flex items-center gap-1 text-emerald-300 hover:text-white font-mono text-[11px] tabular-nums cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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

                                {/* Tracked files */}
                                {task.trackedFiles && task.trackedFiles.length > 0 && (
                                  <span
                                    onClick={() => onOpenTaskModal(task)}
                                    className="flex items-center gap-1 text-amber-300 text-[11px] font-mono cursor-pointer hover:underline"
                                    title={`${task.trackedFiles.length} document(s)`}
                                  >
                                    <FileText className="w-3 h-3 text-amber-400" />
                                    <span>{task.trackedFiles.length} doc</span>
                                  </span>
                                )}

                                {/* Tags */}
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-emerald-300">
                                    {task.tags.map((t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleTagFilter(t)}
                                        className="hover:text-emerald-100 cursor-pointer"
                                      >
                                        #{t}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions (Linear-Style Hover Buttons) */}
                          <div className="flex items-center gap-1 shrink-0 self-start sm:self-center opacity-85 group-hover:opacity-100 transition-opacity">
                            {!task.completed && (
                              <button
                                type="button"
                                onClick={() => onPostponeTask(task.id, 1)}
                                title="Reporter à demain (+1 jour)"
                                className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-emerald-500/20 transition-colors font-mono text-[11px] font-semibold border border-emerald-500/20 cursor-pointer"
                              >
                                +1j
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenTaskModal(task, 'edit')}
                              title="Modifier la tâche"
                              className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDuplicateTask(task)}
                              title="Dupliquer la tâche"
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-emerald-500/15 transition-colors hidden sm:inline-flex cursor-pointer"
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
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer'
                                  : 'text-slate-700 opacity-20 cursor-not-allowed'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Subtasks Inline Checklist */}
                        {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                          <div className="mt-2.5 pl-7 pr-2 pt-2.5 border-t border-emerald-500/10 space-y-2 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                              <span className="uppercase tracking-wider">Sous-tâches</span>
                              <span className="font-mono tabular-nums">{Math.round(subtaskProgress)}%</span>
                            </div>

                            <Progress value={subtaskProgress} className="h-1 bg-slate-900" />

                            <div className="space-y-1 pt-0.5">
                              {task.subtasks.map((st) => (
                                <label
                                  key={st.id}
                                  className="flex items-center gap-2 p-1.5 rounded-lg bg-[#03140E]/80 hover:bg-emerald-950/40 text-xs font-medium text-slate-300 cursor-pointer transition-colors border border-emerald-500/15"
                                >
                                  <input
                                    type="checkbox"
                                    checked={st.completed}
                                    onChange={() => onToggleSubtask(task.id, st.id)}
                                    className="rounded text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 cursor-pointer accent-emerald-500"
                                  />
                                  <span className={st.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
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
