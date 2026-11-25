'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Bell,
  Wand2,
  Plus,
  Trash2,
  CheckCircle2,
  Repeat,
  Folder,
  AlertCircle,
  Loader2,
  User as UserIcon,
  FolderPlus,
  Check,
  Edit3,
  ArrowLeft,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Task, Priority, Recurrence, Category, Subtask, TaskStatus } from '@/types/task';
import { TrackedFile } from '@/types/file-version';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { FileVersionManager } from '@/components/FileVersionManager';
import { User } from '@/types/user';
import {
  REMINDER_OPTIONS,
  PRIORITY_CONFIG,
  TASK_STATUS_ORDER,
  TASK_STATUS_CONFIG,
  normalizeTaskStatus,
} from '@/lib/constants';
import {
  CategoryIcon,
  PRESET_CATEGORY_COLORS,
} from '@/components/CategoryIcon';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDueDateFrench, isTaskOverdue } from '@/lib/reminders';
import { canUserCompleteTask, canUserEditTask } from '@/lib/rbac';
import {
  getDefaultDueDateTime,
  getMinDateStr,
  getMinTimeForDate,
  isDueDateTimeInPast,
  formatLocalDate,
} from '@/lib/due-date-utils';

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Partial<Task>) => void;
  initialTask?: Task | null;
  initialMode?: 'view' | 'edit';
  onToggleComplete?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: TaskStatus) => void;
  onPostponeTask?: (taskId: string, days?: number) => void;
  categories: Category[];
  teamUsers?: User[];
  defaultDate?: string;
  allExistingTags?: string[];
  onQuickCreateCategory?: (category: Category) => void;
  currentUser?: User | null;
  isSidebarCollapsed?: boolean;
}

const DEFAULT_POPULAR_TAGS = ['urgent', 'projet', 'client', 'design', 'bug', 'réunion', 'important', 'revue'];

const TaskModalInner: React.FC<Omit<TaskModalProps, 'isOpen'>> = ({
  onClose,
  onSaveTask,
  initialTask,
  initialMode,
  onToggleComplete,
  onUpdateTaskStatus,
  onPostponeTask,
  categories,
  teamUsers = [],
  defaultDate,
  allExistingTags = [],
  onQuickCreateCategory,
  currentUser,
  isSidebarCollapsed = false,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Mode state: 'view' for inspection / read-only, 'edit' for the form
  const [mode, setMode] = useState<'view' | 'edit'>(() => {
    if (initialMode) return initialMode;
    return initialTask ? 'view' : 'edit';
  });

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const defaultDue = useMemo(() => getDefaultDueDateTime(), []);
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || defaultDate || defaultDue.dueDate);
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || defaultDue.dueTime);
  const [hasTime, setHasTime] = useState(Boolean(initialTask?.dueTime || !initialTask));
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || 'medium');
  const [category, setCategory] = useState(initialTask?.category || (categories[0]?.id || 'fiscalite'));
  const [assigneeId, setAssigneeId] = useState(initialTask?.assigneeId || '');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(
    typeof initialTask?.reminderMinutesBefore === 'number'
      ? initialTask.reminderMinutesBefore
      : 15
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(initialTask?.recurrence || 'none');
  const [status, setStatus] = useState<TaskStatus>(() =>
    normalizeTaskStatus(initialTask?.status, initialTask?.completed)
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(
    initialTask?.subtasks ? [...initialTask.subtasks] : []
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [tags, setTags] = useState<string[]>(initialTask?.tags ? [...initialTask.tags] : []);
  const [tagInput, setTagInput] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>(
    initialTask?.trackedFiles ? [...initialTask.trackedFiles] : []
  );

  // Inline Quick Category Creation Popover State
  const [showQuickCategoryCreator, setShowQuickCategoryCreator] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#004266');
  const [newCatIcon, setNewCatIcon] = useState('Folder');

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === category) || categories[0] || {
      id: category,
      name: category,
      color: '#004266',
      bgLight: 'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30',
      iconName: 'Folder',
    };
  }, [categories, category]);

  const assignedUserObj = useMemo(() => {
    return teamUsers.find((u) => u.id === assigneeId) || null;
  }, [teamUsers, assigneeId]);

  const isOverdue = useMemo(() => {
    return initialTask ? isTaskOverdue(initialTask) : false;
  }, [initialTask]);

  const canComplete = useMemo(() => {
    return initialTask ? canUserCompleteTask(initialTask, currentUser || null) : true;
  }, [initialTask, currentUser]);

  const canEdit = useMemo(() => {
    return initialTask ? canUserEditTask(initialTask, currentUser || null) : true;
  }, [initialTask, currentUser]);

  const completedSubtasksCount = useMemo(() => {
    return subtasks.filter((s) => s.completed).length;
  }, [subtasks]);

  const handleQuickDate = (preset: 'today' | 'tomorrow' | 'monday' | number) => {
    const d = new Date();
    if (typeof preset === 'number') {
      d.setDate(d.getDate() + preset);
    } else if (preset === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (preset === 'monday') {
      const day = d.getDay();
      const diff = (1 + 7 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
    }
    const formatted = formatLocalDate(d);
    setDueDate(formatted);
    setErrorMsg('');

    // If today is chosen for a new task and current time is past dueTime, adapt dueTime to +2h
    if (formatted === getMinDateStr()) {
      if (!dueTime || isDueDateTimeInPast(formatted, dueTime)) {
        const fresh = getDefaultDueDateTime();
        setDueTime(fresh.dueTime);
        setHasTime(true);
      }
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    soundManager.playClickSound();
    setSubtasks([
      ...subtasks,
      {
        id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    soundManager.playClickSound();
    setSubtasks(
      subtasks.map((st) => (st.id === subId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleToggleSubtaskInView = (subId: string) => {
    soundManager.playClickSound();
    const updated = subtasks.map((st) =>
      st.id === subId ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updated);
    if (initialTask) {
      onSaveTask({
        id: initialTask.id,
        subtasks: updated,
      });
    }
  };

  const handleDeleteSubtask = (subId: string) => {
    soundManager.playClickSound();
    setSubtasks(subtasks.filter((st) => st.id !== subId));
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (!clean || tags.includes(clean)) return;
    soundManager.playClickSound();
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    soundManager.playClickSound();
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCreateCategoryInline = () => {
    if (!newCatName.trim()) return;
    const catId = 'cat-' + Date.now();
    const newCategory: Category = {
      id: catId,
      name: newCatName.trim(),
      color: newCatColor,
      bgLight: 'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/30',
      iconName: newCatIcon,
    };

    if (onQuickCreateCategory) {
      onQuickCreateCategory(newCategory);
    }
    setCategory(newCategory.id);
    setShowQuickCategoryCreator(false);
    setNewCatName('');
    soundManager.playClickSound();
  };

  // AI Subtasks generator
  const handleGenerateAISubtasks = async () => {
    if (!title.trim()) {
      setErrorMsg('Veuillez renseigner un titre de tâche pour générer des sous-tâches.');
      return;
    }
    setErrorMsg('');
    setIsGeneratingSubtasks(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'breakdown_subtasks',
          taskTitle: title,
          taskDescription: description,
        }),
      });
      const data = await res.json();
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const generated = data.subtasks.map(
          (st: { title: string }, i: number) => ({
            id: 'sub-ai-' + Date.now() + '-' + i,
            title: st.title,
            completed: false,
          })
        );
        setSubtasks([...subtasks, ...generated]);
        soundManager.playClickSound();
      }
    } catch {
      setErrorMsg('Impossible de générer des sous-tâches pour le moment.');
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Le titre de la tâche est obligatoire.');
      return;
    }

    // Strict constraint: no past date or time allowed for new tasks
    if (!initialTask && isDueDateTimeInPast(dueDate, hasTime ? dueTime : undefined)) {
      setErrorMsg("L'échéance d'une nouvelle tâche ne peut pas être fixée dans le passé.");
      return;
    }

    const assignedUser = teamUsers.find((u) => u.id === assigneeId);

    const taskPayload: Partial<Task> = {
      ...(initialTask ? { id: initialTask.id } : {}),
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || getTodayStr(),
      dueTime: hasTime ? dueTime : undefined,
      priority,
      category,
      assigneeId: assigneeId || undefined,
      assigneeName: assignedUser ? assignedUser.name : undefined,
      reminderMinutesBefore: Number(reminderMinutesBefore),
      reminderTriggered: false,
      recurrence,
      status,
      completed: status === 'completed',
      subtasks,
      tags,
      trackedFiles,
    };

    soundManager.playClickSound();
    onSaveTask(taskPayload);
    onClose();
  };

  const handleToggleCompleteInView = () => {
    if (!initialTask) return;
    soundManager.playCompleteSound();
    const targetStatus: TaskStatus = initialTask.completed ? 'todo' : 'completed';
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(initialTask.id, targetStatus);
      onClose();
    } else if (onToggleComplete) {
      onToggleComplete(initialTask.id);
      onClose();
    } else {
      onSaveTask({
        id: initialTask.id,
        completed: targetStatus === 'completed',
        status: targetStatus,
      });
      onClose();
    }
  };

  const handleStatusChangeInView = (nextStatus: TaskStatus) => {
    if (!initialTask) return;
    if (nextStatus === 'completed' && !canComplete) return;
    setStatus(nextStatus);
    if (nextStatus === 'completed') {
      soundManager.playCompleteSound();
    } else {
      soundManager.playClickSound();
    }
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(initialTask.id, nextStatus);
    } else {
      onSaveTask({
        id: initialTask.id,
        status: nextStatus,
        completed: nextStatus === 'completed',
      });
    }
  };

  const handlePostponeInView = (days: number = 1) => {
    if (!initialTask) return;
    soundManager.playClickSound();
    if (onPostponeTask) {
      onPostponeTask(initialTask.id, days);
      onClose();
    }
  };

  const suggestedTags = useMemo(() => {
    const set = new Set([...allExistingTags, ...DEFAULT_POPULAR_TAGS]);
    return Array.from(set).slice(0, 12);
  }, [allExistingTags]);

  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <ModalPortal>
      <div
        id="task-modal-backdrop"
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 sm:pt-6 bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div
        className="bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#0B1F30] dark:text-slate-100 w-full max-w-2xl lg:max-w-3xl xl:max-w-5xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================== */}
        {/* VIEW MODE: Clean Consultation / Read-Only Display                   */}
        {/* =================================================================== */}
        {mode === 'view' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 sm:px-6 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between bg-[#F4F7FA] dark:bg-[#061826]/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs border border-[#D8E2EC] dark:border-[#94B8D6]/25 shrink-0"
                  style={{
                    backgroundColor: `${selectedCategoryObj.color}18`,
                    color: selectedCategoryObj.color,
                  }}
                >
                  <CategoryIcon name={selectedCategoryObj.iconName} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/35 text-[#004266] dark:text-[#7CC4EB]">
                      {selectedCategoryObj.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        priority === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40'
                          : priority === 'high'
                          ? 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/40'
                          : priority === 'medium'
                          ? 'bg-[#004266]/10 text-[#004266] border-[#004266]/25 dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9]/35'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60'
                      }`}
                    >
                      {priorityConfig.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${TASK_STATUS_CONFIG[status].badgeClass}`}
                    >
                      {TASK_STATUS_CONFIG[status].label}
                    </Badge>
                    {isOverdue && status !== 'completed' && (
                      <Badge variant="destructive" className="bg-rose-600 text-white font-bold text-[10px]">
                        En retard
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      soundManager.playClickSound();
                      setMode('edit');
                    }}
                    className="text-xs font-semibold gap-1.5 cursor-pointer rounded-xl"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
                    <span>Modifier</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Consultation Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              {/* Task Title */}
              <div>
                <h2
                  className={`text-lg sm:text-xl font-black text-[#0B1F30] dark:text-white tracking-tight leading-snug ${
                    initialTask?.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                  }`}
                >
                  {title}
                </h2>
              </div>

              {/* Key Metadata Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Due Date & Time */}
                <div className="p-3 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/15 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                      Échéance
                    </span>
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-white font-mono tabular-nums">
                      {formatDueDateFrench(dueDate, hasTime ? dueTime : undefined)}
                    </span>
                  </div>
                </div>

                {/* Reminder Setting */}
                <div className="p-3 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#F77F00]/12 dark:bg-[#F77F00]/15 text-[#F77F00] dark:text-[#FFB35C] border border-[#F77F00]/25 dark:border-[#F77F00]/30 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                      Rappel automatique
                    </span>
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-slate-200">
                      {reminderMinutesBefore >= 0
                        ? reminderMinutesBefore === 0
                          ? 'À l’heure exacte'
                          : `${reminderMinutesBefore} minutes avant`
                        : 'Désactivé'}
                    </span>
                  </div>
                </div>

                {/* Assignee */}
                <div className="p-3 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/15 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                      Collaborateur assigné
                    </span>
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-white truncate block">
                      {assignedUserObj ? assignedUserObj.name : initialTask?.assigneeName || 'Non assigné'}
                    </span>
                  </div>
                </div>

                {/* Recurrence & Creator */}
                <div className="p-3 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/15 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/30 shrink-0">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                      Récurrence & Créateur
                    </span>
                    <span className="text-xs font-semibold text-[#0B1F30] dark:text-slate-200 truncate block">
                      {recurrence !== 'none'
                        ? recurrence === 'daily'
                          ? 'Quotidienne'
                          : recurrence === 'weekly'
                          ? 'Hebdomadaire'
                          : recurrence === 'monthly'
                          ? 'Mensuelle'
                          : recurrence
                        : 'Aucune récurrence'}{' '}
                      • Créé par {initialTask?.creatorName || 'l’équipe'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                  Description
                </span>
                {description ? (
                  <div className="p-3.5 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/60 border border-[#D8E2EC] dark:border-[#94B8D6]/20 text-xs sm:text-sm text-[#0B1F30] dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {description}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#F4F7FA]/60 dark:bg-[#061826]/35 border border-dashed border-[#D8E2EC] dark:border-[#94B8D6]/20 text-xs text-[#486075] dark:text-slate-400 italic">
                    Aucune description détaillée renseignée pour cette tâche.
                  </div>
                )}
              </div>

              {/* Subtasks (Interactive Checklist) */}
              {subtasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                      Sous-tâches & Étapes ({completedSubtasksCount}/{subtasks.length})
                    </span>
                    <span className="text-xs font-mono font-bold text-[#004266] dark:text-[#7CC4EB] tabular-nums">
                      {Math.round((completedSubtasksCount / subtasks.length) * 100)}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#EDF2F7] dark:bg-[#061826] rounded-full overflow-hidden border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                    <div
                      className="h-full bg-[#F77F00] transition-all duration-300 rounded-full"
                      style={{
                        width: `${(completedSubtasksCount / subtasks.length) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="divide-y divide-[#E6EDF4] dark:divide-[#94B8D6]/15 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 overflow-hidden">
                    {subtasks.map((st) => (
                      <label
                        key={st.id}
                        className="flex items-center gap-3 p-3 text-xs text-[#0B1F30] dark:text-slate-200 hover:bg-[#EDF2F7] dark:hover:bg-[#103049]/60 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => handleToggleSubtaskInView(st.id)}
                          className="w-4 h-4 rounded accent-[#004266] dark:accent-[#F77F00] cursor-pointer shrink-0"
                        />
                        <span
                          className={`flex-1 min-w-0 ${
                            st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-[#0B1F30] dark:text-slate-100 font-medium'
                          }`}
                        >
                          {st.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracked Files & Documents */}
              {trackedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#B85A00] dark:text-[#FFB35C]">
                    Documents attachés ({trackedFiles.length})
                  </span>
                  <div className="divide-y divide-[#E6EDF4] dark:divide-[#94B8D6]/15 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 bg-[#F4F7FA] dark:bg-[#061826]/55 overflow-hidden">
                    {trackedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 text-xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-[#F77F00] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-[#0B1F30] dark:text-white block truncate">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-[#486075] dark:text-slate-400">
                              {file.versions?.length || 1} version(s) • {file.fileType?.toUpperCase() || 'DOCUMENT'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E6] text-[#B85A00] border border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35 uppercase">
                          {file.currentVersion || 'v1.0'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                    Étiquettes
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/35 text-[#004266] dark:text-[#7CC4EB]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Consultation Actions */}
            <div className="p-4 bg-[#F4F7FA] dark:bg-[#061826]/85 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 flex flex-wrap items-center justify-between gap-2.5 sticky bottom-0 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                {initialTask && (canEdit || canComplete) && (
                  <select
                    aria-label="Statut de la tâche"
                    value={status}
                    onChange={(e) => handleStatusChangeInView(e.target.value as TaskStatus)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-hidden cursor-pointer ${TASK_STATUS_CONFIG[status].selectClass}`}
                  >
                    {TASK_STATUS_ORDER.map((statusOption) => (
                      <option
                        key={statusOption}
                        value={statusOption}
                        disabled={statusOption === 'completed' && !canComplete}
                        className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white"
                      >
                        {TASK_STATUS_CONFIG[statusOption].label}
                      </option>
                    ))}
                  </select>
                )}

                {canComplete && initialTask && (
                  <Button
                    type="button"
                    size="sm"
                    variant={status === 'completed' ? 'outline' : 'accent'}
                    onClick={handleToggleCompleteInView}
                    className="font-bold text-xs gap-1.5 cursor-pointer rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{status === 'completed' ? 'Rouvrir la tâche' : 'Marquer comme terminée'}</span>
                  </Button>
                )}

                {onPostponeTask && initialTask && status !== 'completed' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePostponeInView(1)}
                    className="text-xs font-semibold gap-1 rounded-xl hidden sm:inline-flex cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
                    <span>+1j Reporter</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      soundManager.playClickSound();
                      setMode('edit');
                    }}
                    className="text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
                    <span>Modifier la tâche</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs rounded-xl cursor-pointer"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* EDIT MODE: Task Creation or Update Form                             */
          /* =================================================================== */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Modal Header */}
            <div className="px-5 py-4 sm:px-6 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between bg-[#F4F7FA] dark:bg-[#061826]/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs border border-[#D8E2EC] dark:border-[#94B8D6]/25 shrink-0"
                  style={{
                    backgroundColor: `${selectedCategoryObj.color}18`,
                    color: selectedCategoryObj.color,
                  }}
                >
                  <CategoryIcon name={selectedCategoryObj.iconName} className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-[#0B1F30] dark:text-white leading-tight">
                      {initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
                    </h2>
                    {currentUser?.role === 'admin' && initialTask && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#486075] dark:text-slate-300 font-medium">
                    {initialTask
                      ? `Créée par ${initialTask.creatorName || "l'équipe"} • Modifiez les échéances et détails`
                      : 'Planifiez une tâche avec catégorie, étiquettes et alertes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {initialTask && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      soundManager.playClickSound();
                      setMode('view');
                    }}
                    className="text-xs font-semibold gap-1 cursor-pointer rounded-xl"
                    title="Revenir à la vue consultation"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Consultation</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs (Détails vs Fichiers versionnés) */}
            <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 bg-[#F4F7FA]/80 dark:bg-[#061826]/55 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-white dark:bg-[#0B2438] text-[#004266] dark:text-[#7CC4EB] border-[#D8E2EC] dark:border-[#94B8D6]/25 shadow-2xs -mb-px'
                    : 'bg-transparent text-[#486075] dark:text-slate-400 border-transparent hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7]/70 dark:hover:bg-[#103049]/50'
                }`}
              >
                <Folder className={`w-3.5 h-3.5 ${activeTab === 'details' ? 'text-[#004266] dark:text-[#3895C9]' : 'text-[#486075] dark:text-slate-400'}`} />
                <span>Paramètres de la tâche</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
                  activeTab === 'files'
                    ? 'bg-white dark:bg-[#0B2438] text-[#B85A00] dark:text-[#FFB35C] border-[#D8E2EC] dark:border-[#94B8D6]/25 shadow-2xs -mb-px'
                    : 'bg-transparent text-[#486075] dark:text-slate-400 border-transparent hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7]/70 dark:hover:bg-[#103049]/50'
                }`}
              >
                <Repeat className="w-3.5 h-3.5 text-[#F77F00]" />
                <span>Documents &amp; Suivi des Versions</span>
                {trackedFiles.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#FFF4E6] text-[#B85A00] border border-[#F77F00]/35 dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00]/35">
                    {trackedFiles.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'files' ? (
                <div className="space-y-4">
                  <FileVersionManager
                    files={trackedFiles}
                    onChangeFiles={(updatedFiles) => setTrackedFiles(updatedFiles)}
                    currentUser={{
                      name: teamUsers.find((u) => u.id === assigneeId)?.name || 'Collaborateur',
                      email: teamUsers.find((u) => u.id === assigneeId)?.email,
                      role: 'collaborateur',
                    }}
                    contextTitle={title ? `Tâche : ${title}` : 'Nouvelle tâche'}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Left Column (7 cols): Main Content Inputs */}
                  <div className="xl:col-span-7 space-y-5">
                    {/* Title Input */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1.5">
                        Titre de la tâche <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Déclaration TVA mensuelle..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-sm text-[#0B1F30] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 focus:border-[#004266] dark:focus:border-[#3895C9] outline-hidden transition-all font-medium"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1.5">
                        Description détaillée
                      </label>
                      <textarea
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Détails, pièces comptables à réunir, instructions ou contexte..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs sm:text-sm text-[#0B1F30] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 focus:border-[#004266] dark:focus:border-[#3895C9] outline-hidden resize-none leading-relaxed"
                      />
                    </div>

                    {/* Subtasks (Checklist) & AI breakdown */}
                    <div className="space-y-2.5 p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                          <span>Étapes &amp; Sous-tâches ({subtasks.length})</span>
                        </label>

                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={handleGenerateAISubtasks}
                          disabled={isGeneratingSubtasks}
                          className="text-[11px] text-[#B85A00] dark:text-[#FFB35C] hover:text-[#9A4B00] dark:hover:text-[#FFC88A] hover:bg-[#F77F00]/10 gap-1 font-semibold cursor-pointer"
                        >
                          {isGeneratingSubtasks ? (
                            <Loader2 className="w-3 h-3 animate-spin text-[#F77F00]" />
                          ) : (
                            <Wand2 className="w-3 h-3 text-[#F77F00]" />
                          )}
                          <span>Découper avec l&apos;IA</span>
                        </Button>
                      </div>

                      {/* Subtasks List */}
                      {subtasks.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {subtasks.map((st) => (
                            <div
                              key={st.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:border-[#004266]/40 dark:hover:border-[#3895C9]/45 transition-colors group"
                            >
                              <label className="flex items-center gap-2.5 text-xs font-medium text-[#0B1F30] dark:text-slate-200 flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => handleToggleSubtask(st.id)}
                                  className="rounded accent-[#004266] dark:accent-[#F77F00] focus:ring-[#004266] w-4 h-4 cursor-pointer"
                                />
                                <span className={st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-[#0B1F30] dark:text-slate-100'}>
                                  {st.title}
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubtask(st.id)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add subtask input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSubtask();
                            }
                          }}
                          placeholder="Ajouter une étape..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddSubtask}
                          className="font-bold text-xs cursor-pointer rounded-xl"
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2.5 p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                        Étiquettes &amp; Mots-clés
                      </label>
                      
                      {tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/35 text-[#004266] dark:text-[#7CC4EB] flex items-center gap-1.5"
                            >
                              #{t}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer text-[#486075] dark:text-slate-400"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                          placeholder="Nouveau tag..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTag(tagInput)}
                          className="font-bold text-xs cursor-pointer rounded-xl"
                        >
                          + Tag
                        </Button>
                      </div>

                      {suggestedTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] text-[#486075] dark:text-slate-400">
                          <span className="font-semibold text-[#486075] dark:text-slate-400">Suggestions :</span>
                          {suggestedTags.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleAddTag(st)}
                              className="px-1.5 py-0.5 rounded bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:border-[#004266]/40 dark:hover:border-[#3895C9]/50 hover:bg-[#EDF2F7] dark:hover:bg-[#103049] text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white transition-colors cursor-pointer text-[11px]"
                            >
                              #{st}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (5 cols): Metadata, Priority, Assignee & Due Date */}
                  <div className="xl:col-span-5 space-y-5">
                    {/* Category Selection */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB]">
                          Pôle / Catégorie
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowQuickCategoryCreator(!showQuickCategoryCreator)}
                          className="text-[11px] font-semibold text-[#F77F00] hover:text-[#DE7200] dark:text-[#FFB35C] dark:hover:text-[#FFC88A] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nouveau pôle</span>
                        </button>
                      </div>

                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 focus:border-[#004266] dark:focus:border-[#3895C9] outline-hidden font-medium"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>

                      {/* Inline Quick Category Creator Popover */}
                      {showQuickCategoryCreator && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-[#0B2438] backdrop-blur-2xl rounded-2xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/30 z-30 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-1.5">
                            <span className="text-xs font-bold text-[#0B1F30] dark:text-white flex items-center gap-1.5">
                              <FolderPlus className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                              Créer un nouveau pôle
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowQuickCategoryCreator(false)}
                              className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <input
                              type="text"
                              value={newCatName}
                              onChange={(e) => setNewCatName(e.target.value)}
                              placeholder="Nom du pôle (ex: Social & Paie)..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-[#F4F7FA] dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#486075] dark:text-slate-400">Couleur :</span>
                            <div className="flex items-center gap-1.5">
                              {PRESET_CATEGORY_COLORS.slice(0, 5).map((col) => (
                                <button
                                  key={col.hex}
                                  type="button"
                                  onClick={() => setNewCatColor(col.hex)}
                                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                                    newCatColor === col.hex
                                      ? 'border-[#0B1F30] dark:border-white scale-110 shadow-sm'
                                      : 'border-transparent opacity-75 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: col.hex }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 border-t border-[#E6EDF4] dark:border-[#94B8D6]/15">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => setShowQuickCategoryCreator(false)}
                              className="text-xs cursor-pointer"
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              variant="accent"
                              size="xs"
                              onClick={handleCreateCategoryInline}
                              disabled={!newCatName.trim()}
                              className="font-bold text-xs cursor-pointer"
                            >
                              Créer et assigner
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1.5">
                        Statut
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as TaskStatus)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 focus:border-[#004266] dark:focus:border-[#3895C9] outline-hidden font-medium"
                      >
                        {TASK_STATUS_ORDER.map((statusOption) => (
                          <option
                            key={statusOption}
                            value={statusOption}
                            disabled={statusOption === 'completed' && !canComplete}
                            className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white"
                          >
                            {TASK_STATUS_CONFIG[statusOption].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Selector Cards */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1.5">
                        Priorité
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2">
                        {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                          const conf = PRIORITY_CONFIG[p];
                          const active = priority === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                soundManager.playClickSound();
                                setPriority(p);
                              }}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                                active
                                  ? p === 'urgent'
                                    ? 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500 shadow-xs ring-1 ring-rose-500/30'
                                    : p === 'high'
                                    ? 'bg-[#FFF4E6] text-[#B85A00] border-[#F77F00] dark:bg-[#F77F00]/20 dark:text-[#FFB35C] dark:border-[#F77F00] shadow-xs ring-1 ring-[#F77F00]/30'
                                    : p === 'medium'
                                    ? 'bg-[#004266]/10 text-[#004266] border-[#004266] dark:bg-[#3895C9]/20 dark:text-[#7CC4EB] dark:border-[#3895C9] shadow-xs ring-1 ring-[#004266]/25 dark:ring-[#3895C9]/35'
                                    : 'bg-slate-100 text-slate-700 border-slate-400 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-500 shadow-xs ring-1 ring-slate-400/30'
                                  : 'bg-[#F4F7FA] dark:bg-[#061826]/45 text-[#486075] dark:text-slate-400 border-[#D8E2EC] dark:border-[#94B8D6]/20 hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049]'
                              }`}
                            >
                              <span>{conf.label}</span>
                              {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team Assignee */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1.5">
                        Assigner à un membre
                      </label>
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 focus:border-[#004266] dark:focus:border-[#3895C9] outline-hidden font-medium"
                      >
                        <option value="" className="bg-white text-[#486075] dark:bg-[#0B2438] dark:text-slate-400">
                          Non assigné (Toute l&apos;équipe)
                        </option>
                        {teamUsers.map((u) => (
                          <option key={u.id} value={u.id} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">
                            {u.name} {u.department ? `(${u.department})` : ''} - {u.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unified Due Date & Time Block */}
                    <div className="p-4 rounded-2xl bg-[#F4F7FA] dark:bg-[#061826]/55 border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#F77F00]" />
                          <span>Date &amp; Heure d&apos;échéance</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickDate('today')}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#004266] dark:text-[#7CC4EB] hover:bg-[#004266] hover:text-white dark:hover:bg-[#3895C9]/30 transition-colors font-medium text-[11px] cursor-pointer"
                          >
                            Aujourd&apos;hui
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDate('tomorrow')}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#004266] dark:text-[#7CC4EB] hover:bg-[#004266] hover:text-white dark:hover:bg-[#3895C9]/30 transition-colors font-medium text-[11px] cursor-pointer"
                          >
                            Demain
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDate('monday')}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#0B2438] border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#004266] dark:text-[#7CC4EB] hover:bg-[#004266] hover:text-white dark:hover:bg-[#3895C9]/30 transition-colors font-medium text-[11px] cursor-pointer"
                          >
                            Lundi
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <input
                            type="date"
                            min={!initialTask ? getMinDateStr() : undefined}
                            value={dueDate}
                            onChange={(e) => {
                              setDueDate(e.target.value);
                              setErrorMsg('');
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden font-medium"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            min={!initialTask ? getMinTimeForDate(dueDate) : undefined}
                            value={dueTime}
                            disabled={!hasTime}
                            onChange={(e) => {
                              setDueTime(e.target.value);
                              setErrorMsg('');
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#0B2438] text-xs text-[#0B1F30] dark:text-white disabled:opacity-40 focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden font-medium"
                          />
                          <label className="flex items-center gap-1 text-[11px] text-[#486075] dark:text-slate-300 cursor-pointer shrink-0 font-medium">
                            <input
                              type="checkbox"
                              checked={hasTime}
                              onChange={(e) => setHasTime(e.target.checked)}
                              className="rounded accent-[#004266] dark:accent-[#F77F00] w-3.5 h-3.5"
                            />
                            <span>Heure</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Automated Reminder & Recurrence */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-[#F77F00]" />
                          <span>Rappel</span>
                        </label>
                        <select
                          value={reminderMinutesBefore}
                          onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden font-medium"
                        >
                          {REMINDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#004266] dark:text-[#7CC4EB] mb-1 flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-[#004266] dark:text-[#3895C9]" />
                          <span>Récurrence</span>
                        </label>
                        <select
                          value={recurrence}
                          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white dark:bg-[#061826]/70 text-xs text-[#0B1F30] dark:text-white focus:ring-2 focus:ring-[#004266]/30 dark:focus:ring-[#3895C9]/45 outline-hidden font-medium"
                        >
                          <option value="none" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">Aucune</option>
                          <option value="daily" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">Tous les jours</option>
                          <option value="weekdays" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">Jours ouvrés</option>
                          <option value="weekly" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">Toutes les semaines</option>
                          <option value="monthly" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">Tous les mois</option>
                          <option value="yearly" className="bg-white text-[#0B1F30] dark:bg-[#0B2438] dark:text-white">Tous les ans</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Non-Overlapping Footer */}
            <div className="p-4 bg-[#F4F7FA] dark:bg-[#061826]/85 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between gap-3 shrink-0 z-20">
              {initialTask ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    soundManager.playClickSound();
                    setMode('view');
                  }}
                  className="gap-1 rounded-xl text-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour à la consultation</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  id="save-task-submit-btn"
                  variant="accent"
                  size="sm"
                  className="font-bold shadow-md cursor-pointer rounded-xl text-xs"
                >
                  {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

export const TaskModal: React.FC<TaskModalProps> = (props) => {
  if (!props.isOpen) return null;
  const key = props.initialTask
    ? `task-${props.initialTask.id}-${props.initialTask.updatedAt}-${props.initialMode || 'default'}`
    : `new-${props.defaultDate || 'default'}`;
  return <TaskModalInner key={key} {...props} />;
};
