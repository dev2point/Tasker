'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Bell,
  Wand2,
  Plus,
  Trash2,
  CheckCircle2,
  Tag,
  Repeat,
  Folder,
  AlertCircle,
  Loader2,
  User as UserIcon,
  FolderPlus,
  Hash,
  Check,
} from 'lucide-react';
import { Task, Priority, Recurrence, Category, Subtask } from '@/types/task';
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

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Partial<Task>) => void;
  initialTask?: Task | null;
  categories: Category[];
  teamUsers?: User[];
  defaultDate?: string;
  allExistingTags?: string[];
  onQuickCreateCategory?: (category: Category) => void;
}

const DEFAULT_POPULAR_TAGS = ['urgent', 'projet', 'client', 'design', 'bug', 'réunion', 'important', 'revue'];

const TaskModalInner: React.FC<Omit<TaskModalProps, 'isOpen'>> = ({
  onClose,
  onSaveTask,
  initialTask,
  categories,
  teamUsers = [],
  defaultDate,
  allExistingTags = [],
  onQuickCreateCategory,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || defaultDate || getTodayStr());
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || '14:00');
  const [hasTime, setHasTime] = useState(Boolean(initialTask?.dueTime || !initialTask));
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || 'medium');
  const [category, setCategory] = useState(initialTask?.category || (categories[0]?.id || 'travail'));
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

  const handleToggleSubtask = (id: string) => {
    soundManager.playClickSound();
    setSubtasks(
      subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  // Tag Handlers (Support multi-tags, comma separated, space or Enter)
  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
      soundManager.playClickSound();
    }
  };

  const handleAddTagFromInput = () => {
    if (!tagInput.trim()) return;
    const parts = tagInput.split(/[,;\s]+/);
    parts.forEach((p) => addTag(p));
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const toggleSuggestedTag = (tagName: string) => {
    if (tags.includes(tagName)) {
      handleRemoveTag(tagName);
    } else {
      addTag(tagName);
    }
  };

  // Handle Quick Create Category Inline
  const handleCreateCategoryInline = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const id =
      trimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'cat-' + Date.now();

    const matchedPreset = PRESET_CATEGORY_COLORS.find((p) => p.hex === newCatColor);
    const bgLight = matchedPreset ? matchedPreset.bgLight : 'bg-slate-50 text-slate-700 border-slate-200';

    const newCategory: Category = {
      id,
      name: trimmed,
      color: newCatColor,
      bgLight,
      iconName: newCatIcon,
      isDefault: false,
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
    };

    soundManager.playClickSound();
    onSaveTask(taskPayload);
    onClose();
  };

  // Suggested tags to display (combining app tags + default popular tags)
  const suggestedTags = useMemo(() => {
    const set = new Set([...allExistingTags, ...DEFAULT_POPULAR_TAGS]);
    return Array.from(set).slice(0, 12);
  }, [allExistingTags]);

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: `${selectedCategoryObj.color}20`,
                color: selectedCategoryObj.color,
              }}
            >
              <CategoryIcon name={selectedCategoryObj.iconName} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {initialTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {initialTask
                  ? 'Modifiez les échéances, rappels, catégories ou tags'
                  : 'Planifiez une tâche avec catégorie, étiquettes et alertes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Titre de la tâche <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Préparer la réunion de projet, payer les factures..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#F7C59F]/50 focus:border-[#F7C59F] outline-hidden"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description & Notes
            </label>
            <textarea
              id="task-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Détails, liens, contexte ou consignes spécifiques..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#F7C59F]/50 focus:border-[#F7C59F] outline-hidden resize-y min-h-[60px]"
            />
          </div>

          {/* Due Date & Time */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#BA5316]" />
                Échéance & Horaires
              </span>

              {/* Quick Date Shortcuts */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  Aujourd’hui
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  Demain
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  +1 Semaine
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1 block">
                  Date d’échéance
                </label>
                <input
                  type="date"
                  id="task-due-date-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    Heure
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasTime}
                      onChange={(e) => setHasTime(e.target.checked)}
                      className="rounded accent-[#EE8D4B] focus:ring-[#F7C59F] w-3 h-3"
                    />
                    <span>Heure précise</span>
                  </label>
                </div>
                <input
                  type="time"
                  id="task-time-input"
                  disabled={!hasTime}
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium outline-hidden ${
                    hasTime
                      ? 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-[#F7C59F]/40'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Automated Reminder Trigger Setting */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-600" />
                Rappel Automatique
              </span>
              <span className="text-[11px] text-amber-700 font-medium">
                Notification sonore & visuelle
              </span>
            </div>

            <select
              id="task-reminder-select"
              value={reminderMinutesBefore}
              onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-200 outline-hidden"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Priorité
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const selected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        selected
                          ? `${cfg.badge} ring-2 ring-[#F7C59F] font-bold shadow-2xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selector + Quick Add Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Catégorie
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryCreator((prev) => !prev)}
                  className="text-[11px] font-bold text-[#BA5316] hover:text-[#933F15] flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Nouvelle</span>
                </button>
              </div>

              {/* Inline Quick Category Creator Popup */}
              {showQuickCategoryCreator ? (
                <div className="p-3 rounded-2xl bg-[#F7C59F]/20 border border-[#F7C59F] space-y-2.5 mb-2 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#59240A]">Créer une catégorie</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryCreator(false)}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nom (ex: Marketing, Sport...)"
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                    autoFocus
                  />
                  {/* Colors */}
                  <div className="flex items-center gap-1.5">
                    {PRESET_CATEGORY_COLORS.slice(0, 7).map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setNewCatColor(color.hex)}
                        className={`w-5 h-5 rounded-md ${
                          newCatColor === color.hex ? 'ring-2 ring-slate-800 scale-110' : 'opacity-85'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowQuickCategoryCreator(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs font-bold"
                      onClick={handleCreateCategoryInline}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="task-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Team Member Assignee Selector */}
          {teamUsers.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#BA5316]" />
                <span>Membre Assigné (Équipe)</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
              >
                <option value="">Non assigné (Libre)</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role.toUpperCase()} ({u.department || 'Équipe'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recurrence & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                Répétition
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
              >
                <option value="none">Ne pas répéter</option>
                <option value="daily">Tous les jours</option>
                <option value="weekdays">Du lundi au vendredi</option>
                <option value="weekly">Toutes les semaines</option>
                <option value="monthly">Tous les mois</option>
                <option value="yearly">Tous les ans</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'todo' | 'in_progress' | 'completed')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminée</option>
              </select>
            </div>
          </div>

          {/* Tags / Étiquettes Section (Multi-Tagging & Suggestions) */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#BA5316]" />
                Étiquettes Multiples (Tags)
              </label>
              <span className="text-[11px] text-slate-400">
                {tags.length} assigné{tags.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Currently assigned tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                {tags.map((t) => {
                  const style = getTagColor(t);
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-2xs animate-in zoom-in-95"
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderColor: style.border,
                      }}
                    >
                      <Hash className="w-3 h-3 opacity-70" />
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="p-0.5 rounded-full hover:bg-black/10 transition-colors ml-0.5"
                        title="Retirer ce tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Tag Input Field */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTagFromInput();
                    }
                  }}
                  placeholder="Tapez un tag et appuyez sur Entrée ou virgule..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTagFromInput}
                className="font-bold text-xs"
              >
                + Ajouter
              </Button>
            </div>

            {/* Suggested / Common Tags to Quick-Toggle */}
            {suggestedTags.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Suggestions rapides :
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {suggestedTags.map((st) => {
                    const isSelected = tags.includes(st);
                    const style = getTagColor(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleSuggestedTag(st)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                          isSelected
                            ? 'font-bold ring-1'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: style.bg,
                                color: style.text,
                                borderColor: style.text,
                              }
                            : {}
                        }
                      >
                        #{st}
                        {isSelected && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Subtasks / Checklist */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Sous-tâches ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </label>
              <button
                type="button"
                onClick={handleGenerateAISubtasks}
                disabled={isGeneratingSubtasks}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 transition-colors disabled:opacity-50"
              >
                {isGeneratingSubtasks ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-orange-600" />
                )}
                <span>Suggérer sous-tâches</span>
              </button>
            </div>

            {/* List of subtasks */}
            <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 group"
                >
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="rounded accent-[#EE8D4B] focus:ring-[#F7C59F] w-4 h-4 cursor-pointer"
                    />
                    <span className={st.completed ? 'line-through text-slate-400' : ''}>
                      {st.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="text-slate-300 hover:text-red-500 p-1 transition-colors"
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
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#F7C59F]/40 outline-hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSubtask}
                className="font-bold text-xs"
              >
                Ajouter
              </Button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 flex items-center justify-end gap-3 sticky bottom-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              id="save-task-submit-btn"
              size="sm"
              className="font-bold shadow-md shadow-[#F7C59F]/40"
            >
              {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TaskModal: React.FC<TaskModalProps> = (props) => {
  if (!props.isOpen) return null;
  const key = props.initialTask
    ? `edit-${props.initialTask.id}-${props.initialTask.updatedAt}`
    : `new-${props.defaultDate || 'default'}`;
  return <TaskModalInner key={key} {...props} />;
};
