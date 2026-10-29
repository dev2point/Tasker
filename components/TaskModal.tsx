'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Bell,
  Wand2,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Tag,
  Repeat,
  Folder,
  AlertCircle,
  Loader2,
  User as UserIcon,
  FolderPlus,
  Hash,
  Check,
  Edit3,
  ArrowLeft,
  FileText,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';
import { Task, Priority, Recurrence, Category, Subtask } from '@/types/task';
import { TrackedFile } from '@/types/file-version';
import { FileVersionManager } from '@/components/FileVersionManager';
import { User } from '@/types/user';
import { REMINDER_OPTIONS, PRIORITY_CONFIG } from '@/lib/constants';
import {
  CategoryIcon,
  getTagColor,
  AVAILABLE_CATEGORY_ICONS,
  PRESET_CATEGORY_COLORS,
} from '@/components/CategoryIcon';
import { soundManager } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDueDateFrench, isTaskOverdue } from '@/lib/reminders';
import { canUserCompleteTask, canUserEditTask } from '@/lib/rbac';

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Partial<Task>) => void;
  initialTask?: Task | null;
  initialMode?: 'view' | 'edit';
  onToggleComplete?: (taskId: string) => void;
  onPostponeTask?: (taskId: string, days?: number) => void;
  categories: Category[];
  teamUsers?: User[];
  defaultDate?: string;
  allExistingTags?: string[];
  onQuickCreateCategory?: (category: Category) => void;
  currentUser?: User | null;
}

const DEFAULT_POPULAR_TAGS = ['urgent', 'projet', 'client', 'design', 'bug', 'réunion', 'important', 'revue'];

const TaskModalInner: React.FC<Omit<TaskModalProps, 'isOpen'>> = ({
  onClose,
  onSaveTask,
  initialTask,
  initialMode,
  onToggleComplete,
  onPostponeTask,
  categories,
  teamUsers = [],
  defaultDate,
  allExistingTags = [],
  onQuickCreateCategory,
  currentUser,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Mode state: 'view' for inspection / read-only, 'edit' for the form
  const [mode, setMode] = useState<'view' | 'edit'>(() => {
    if (initialMode) return initialMode;
    return initialTask ? 'view' : 'edit';
  });

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || defaultDate || getTodayStr());
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || '14:00');
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
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'completed'>(
    initialTask?.status || (initialTask?.completed ? 'completed' : 'todo')
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
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatIcon, setNewCatIcon] = useState('Folder');

  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === category) || categories[0] || {
      id: category,
      name: category,
      color: '#3b82f6',
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
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

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
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
      bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
    if (onToggleComplete) {
      onToggleComplete(initialTask.id);
      onClose();
    } else {
      const newCompleted = !initialTask.completed;
      onSaveTask({
        id: initialTask.id,
        completed: newCompleted,
        status: newCompleted ? 'completed' : 'todo',
      });
      onClose();
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
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#061A13]/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-500/30 text-slate-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================== */}
        {/* VIEW MODE: Clean Consultation / Read-Only Display                   */}
        {/* =================================================================== */}
        {mode === 'view' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 sm:px-6 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md border border-emerald-500/30 shrink-0"
                  style={{
                    backgroundColor: `${selectedCategoryObj.color}25`,
                    color: selectedCategoryObj.color,
                  }}
                >
                  <CategoryIcon name={selectedCategoryObj.iconName} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-200">
                      {selectedCategoryObj.name}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        priority === 'urgent'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                          : priority === 'high'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {priorityConfig.label}
                    </span>
                    {initialTask?.completed ? (
                      <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                        Terminée
                      </Badge>
                    ) : isOverdue ? (
                      <Badge variant="destructive" className="bg-rose-600 text-white font-bold text-[10px]">
                        En retard
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-300 border-emerald-500/40 text-[10px]">
                        {status === 'in_progress' ? 'En cours' : 'À faire'}
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
                    className="border-emerald-500/30 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-500/20 hover:text-white text-xs font-semibold gap-1.5 cursor-pointer rounded-xl"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Modifier</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
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
                  className={`text-lg sm:text-xl font-black text-white tracking-tight leading-snug ${
                    initialTask?.completed ? 'line-through text-slate-400' : ''
                  }`}
                >
                  {title}
                </h2>
              </div>

              {/* Key Metadata Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Due Date & Time */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Échéance
                    </span>
                    <span className="text-xs font-semibold text-white font-mono">
                      {formatDueDateFrench(dueDate, hasTime ? dueTime : undefined)}
                    </span>
                  </div>
                </div>

                {/* Reminder Setting */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Rappel automatique
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {reminderMinutesBefore >= 0
                        ? reminderMinutesBefore === 0
                          ? 'À l’heure exacte'
                          : `${reminderMinutesBefore} minutes avant`
                        : 'Désactivé'}
                    </span>
                  </div>
                </div>

                {/* Assignee */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Collaborateur assigné
                    </span>
                    <span className="text-xs font-semibold text-white truncate block">
                      {assignedUserObj ? assignedUserObj.name : initialTask?.assigneeName || 'Non assigné'}
                    </span>
                  </div>
                </div>

                {/* Recurrence & Creator */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Récurrence & Créateur
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate block">
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
                <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Description
                </span>
                {description ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {description}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-950/20 border border-dashed border-emerald-500/20 text-xs text-slate-400 italic">
                    Aucune description détaillée renseignée pour cette tâche.
                  </div>
                )}
              </div>

              {/* Subtasks (Interactive Checklist) */}
              {subtasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Sous-tâches & Étapes ({completedSubtasksCount}/{subtasks.length})
                    </span>
                    <span className="text-xs font-mono text-emerald-300">
                      {Math.round((completedSubtasksCount / subtasks.length) * 100)}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-emerald-950 rounded-full overflow-hidden border border-emerald-500/20">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                      style={{
                        width: `${(completedSubtasksCount / subtasks.length) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="divide-y divide-emerald-500/15 rounded-2xl border border-emerald-500/25 bg-emerald-950/40 overflow-hidden">
                    {subtasks.map((st) => (
                      <label
                        key={st.id}
                        className="flex items-center gap-3 p-3 text-xs text-slate-200 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => handleToggleSubtaskInView(st.id)}
                          className="w-4 h-4 rounded accent-emerald-400 cursor-pointer shrink-0"
                        />
                        <span
                          className={`flex-1 min-w-0 ${
                            st.completed ? 'line-through text-slate-500' : 'text-slate-100 font-medium'
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
                  <span className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                    Documents attachés ({trackedFiles.length})
                  </span>
                  <div className="divide-y divide-emerald-500/15 rounded-2xl border border-emerald-500/25 bg-emerald-950/40 overflow-hidden">
                    {trackedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 text-xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {file.versions?.length || 1} version(s) • {file.fileType?.toUpperCase() || 'DOCUMENT'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
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
                  <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Étiquettes
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-emerald-950/80 border border-emerald-500/30 text-emerald-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Consultation Actions */}
            <div className="p-4 bg-emerald-950/80 border-t border-emerald-500/20 flex items-center justify-between gap-2.5 sticky bottom-0 backdrop-blur-md">
              <div className="flex items-center gap-2">
                {canComplete && initialTask && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleToggleCompleteInView}
                    className={`font-bold text-xs gap-1.5 cursor-pointer rounded-xl ${
                      initialTask.completed
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400 shadow-md'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{initialTask.completed ? 'Rouvrir la tâche' : 'Marquer comme terminée'}</span>
                  </Button>
                )}

                {onPostponeTask && initialTask && !initialTask.completed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePostponeInView(1)}
                    className="border-emerald-500/30 bg-emerald-950/60 text-slate-200 hover:bg-emerald-500/20 text-xs font-semibold gap-1 rounded-xl hidden sm:inline-flex cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
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
                    className="border-emerald-500/40 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-500/20 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Modifier la tâche</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20 text-xs rounded-xl"
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
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 sm:px-6 border-b border-emerald-500/20 flex items-center justify-between bg-emerald-950/40">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md border border-emerald-500/30"
                  style={{
                    backgroundColor: `${selectedCategoryObj.color}25`,
                    color: selectedCategoryObj.color,
                  }}
                >
                  <CategoryIcon name={selectedCategoryObj.iconName} className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                      {initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
                    </h2>
                    {currentUser?.role === 'admin' && initialTask && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {initialTask
                      ? `Créée par ${initialTask.creatorName || "l'équipe"} • Modifiez les échéances et détails`
                      : 'Planifiez une tâche avec catégorie, étiquettes et alertes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {initialTask && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      soundManager.playClickSound();
                      setMode('view');
                    }}
                    className="border-emerald-500/30 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-500/20 text-xs font-semibold gap-1 cursor-pointer rounded-xl"
                    title="Revenir à la vue consultation"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Consultation</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs (Détails vs Fichiers versionnés) */}
            <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 bg-emerald-950/60 border-b border-emerald-500/20">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-[#061A13] text-emerald-300 border-emerald-500/40 shadow-md -mb-px'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-emerald-500/10'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-emerald-400" />
                <span>Paramètres de la tâche</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
                  activeTab === 'files'
                    ? 'bg-[#061A13] text-amber-300 border-emerald-500/40 shadow-md -mb-px'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-emerald-500/10'
                }`}
              >
                <Repeat className="w-3.5 h-3.5 text-amber-400" />
                <span>Documents &amp; Suivi des Versions</span>
                {trackedFiles.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {trackedFiles.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
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
                <>
                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                      Titre de la tâche <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Déclaration TVA mensuelle..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden transition-all"
                    />
                  </div>

                  {/* Category & Status Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Category Selection */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Pôle / Catégorie
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowQuickCategoryCreator(!showQuickCategoryCreator)}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nouveau pôle</span>
                        </button>
                      </div>

                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>

                      {/* Inline Quick Category Creator Popover */}
                      {showQuickCategoryCreator && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-900/98 backdrop-blur-2xl rounded-2xl shadow-2xl border border-emerald-500/40 z-30 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                              Créer un nouveau pôle
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowQuickCategoryCreator(false)}
                              className="text-slate-400 hover:text-white"
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
                              className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">Couleur :</span>
                            <div className="flex items-center gap-1.5">
                              {PRESET_CATEGORY_COLORS.slice(0, 5).map((col) => (
                                <button
                                  key={col.hex}
                                  type="button"
                                  onClick={() => setNewCatColor(col.hex)}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    newCatColor === col.hex
                                      ? 'border-white scale-110 shadow-sm'
                                      : 'border-transparent opacity-70 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: col.hex }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 border-t border-emerald-500/10">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => setShowQuickCategoryCreator(false)}
                              className="text-xs"
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              onClick={handleCreateCategoryInline}
                              disabled={!newCatName.trim()}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                            >
                              Créer et assigner
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                        Statut
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
                      >
                        <option value="todo" className="bg-slate-900 text-white">À faire</option>
                        <option value="in_progress" className="bg-slate-900 text-white">En cours</option>
                        <option value="completed" className="bg-slate-900 text-white">Terminée</option>
                      </select>
                    </div>
                  </div>

                  {/* Priority & Assignee Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                        Priorité
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
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
                              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                                active
                                  ? p === 'urgent'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                                    : p === 'high'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-sm'
                                  : 'bg-emerald-950/30 text-slate-400 border-emerald-500/20 hover:text-white hover:bg-emerald-500/10'
                              }`}
                            >
                              {conf.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team Assignee */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                        Assigner à un membre
                      </label>
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">
                          Non assigné (Toute l&apos;équipe)
                        </option>
                        {teamUsers.map((u) => (
                          <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                            {u.name} {u.department ? `(${u.department})` : ''} - {u.role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Due Date & Time */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Date & Heure d&apos;échéance</span>
                      </label>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleQuickDate(0)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20 transition-colors"
                        >
                          Aujourd&apos;hui
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickDate(1)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20 transition-colors"
                        >
                          Demain
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={dueTime}
                          disabled={!hasTime}
                          onChange={(e) => setDueTime(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-xs text-white disabled:opacity-40 focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasTime}
                            onChange={(e) => setHasTime(e.target.checked)}
                            className="rounded accent-emerald-400"
                          />
                          <span>Heure</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Automated Reminder & Recurrence */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Rappel automatique</span>
                      </label>
                      <select
                        value={reminderMinutesBefore}
                        onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
                      >
                        {REMINDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-blue-400" />
                        <span>Récurrence</span>
                      </label>
                      <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white focus:ring-2 focus:ring-emerald-400/50 outline-hidden font-medium"
                      >
                        <option value="none" className="bg-slate-900 text-white">Aucune récurrence</option>
                        <option value="daily" className="bg-slate-900 text-white">Tous les jours</option>
                        <option value="weekdays" className="bg-slate-900 text-white">Jours ouvrés (Lun - Ven)</option>
                        <option value="weekly" className="bg-slate-900 text-white">Toutes les semaines</option>
                        <option value="monthly" className="bg-slate-900 text-white">Tous les mois</option>
                        <option value="yearly" className="bg-slate-900 text-white">Tous les ans</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">
                      Description détaillée
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Détails, pièces comptables à réunir, contexte..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden resize-none"
                    />
                  </div>

                  {/* Subtasks (Checklist) & AI breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Étapes &amp; Sous-tâches ({subtasks.length})</span>
                      </label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={handleGenerateAISubtasks}
                        disabled={isGeneratingSubtasks}
                        className="text-[11px] text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 gap-1"
                      >
                        {isGeneratingSubtasks ? (
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                        ) : (
                          <Wand2 className="w-3 h-3 text-amber-400" />
                        )}
                        <span>Découper avec l&apos;IA</span>
                      </Button>
                    </div>

                    {/* Subtasks List */}
                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 group"
                        >
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-200 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => handleToggleSubtask(st.id)}
                              className="rounded accent-emerald-400 focus:ring-emerald-400 w-4 h-4 cursor-pointer"
                            />
                            <span className={st.completed ? 'line-through text-slate-500' : ''}>
                              {st.title}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(st.id)}
                            className="text-slate-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add subtask input */}
                    <div className="flex items-center gap-2">
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
                        className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSubtask}
                        className="font-bold text-xs border-emerald-500/30 bg-emerald-950/40 text-slate-200 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Étiquettes &amp; Mots-clés
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-lg text-xs font-mono font-medium bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-rose-400 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

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
                        className="flex-1 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 outline-hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTag(tagInput)}
                        className="font-bold text-xs border-emerald-500/30 bg-emerald-950/40 text-slate-200 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        + Tag
                      </Button>
                    </div>

                    {suggestedTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-500">Suggestions :</span>
                        {suggestedTags.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAddTag(st)}
                            className="px-1.5 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-500/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            #{st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Form Footer Actions */}
              <div className="p-4 bg-emerald-950/80 border-t border-emerald-500/20 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 flex items-center justify-between gap-3 sticky bottom-0 backdrop-blur-md">
                {initialTask ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      soundManager.playClickSound();
                      setMode('view');
                    }}
                    className="border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20 gap-1 rounded-xl text-xs"
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
                    className="border-emerald-500/30 text-slate-300 hover:text-white hover:bg-emerald-500/20 rounded-xl text-xs"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    id="save-task-submit-btn"
                    size="sm"
                    className="font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 shadow-md cursor-pointer rounded-xl text-xs"
                  >
                    {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskModal: React.FC<TaskModalProps> = (props) => {
  if (!props.isOpen) return null;
  const key = props.initialTask
    ? `task-${props.initialTask.id}-${props.initialTask.updatedAt}-${props.initialMode || 'default'}`
    : `new-${props.defaultDate || 'default'}`;
  return <TaskModalInner key={key} {...props} />;
};
