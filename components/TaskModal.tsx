'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Bell,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Tag,
  Repeat,
  Folder,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Task, Priority, Recurrence, Category, Subtask } from '@/types/task';
import { REMINDER_OPTIONS, PRIORITY_CONFIG } from '@/lib/constants';
import { soundManager } from '@/lib/sound';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Partial<Task>) => void;
  initialTask?: Task | null;
  categories: Category[];
  defaultDate?: string; // If opened from a specific calendar date click
}

const TaskModalInner: React.FC<Omit<TaskModalProps, 'isOpen'>> = ({
  onClose,
  onSaveTask,
  initialTask,
  categories,
  defaultDate,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || defaultDate || getTodayStr());
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || '14:00');
  const [hasTime, setHasTime] = useState(Boolean(initialTask?.dueTime || !initialTask));
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || 'medium');
  const [category, setCategory] = useState(initialTask?.category || 'travail');
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

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const formatted = tagInput.trim().replace(/^#/, '');
    if (!tags.includes(formatted)) {
      setTags([...tags, formatted]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
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

    const taskPayload: Partial<Task> = {
      ...(initialTask ? { id: initialTask.id } : {}),
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || getTodayStr(),
      dueTime: hasTime ? dueTime : undefined,
      priority,
      category,
      reminderMinutesBefore: Number(reminderMinutesBefore),
      reminderTriggered: false, // reset trigger so new reminder can fire
      recurrence,
      status,
      completed: status === 'completed',
      subtasks,
      tags,
    };

    onSaveTask(taskPayload);
    soundManager.playClickSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 id="task-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {initialTask ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Définissez l&apos;échéance, la priorité et les alertes automatiques.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Titre de la tâche <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rédiger le compte-rendu, Faire du sport..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm text-slate-900 transition-all font-medium outline-hidden"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={2}
              id="task-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Précisions, liens, contexte ou détails..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-xs text-slate-900 transition-all outline-hidden resize-y"
            />
          </div>

          {/* Date & Time with Shortcuts */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Date & Heure d&apos;échéance
              </span>
              {/* Quick shortcuts */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickDate(0)}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200/70 border border-slate-200 font-semibold text-slate-700 transition-colors"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200/70 border border-slate-200 font-semibold text-slate-700 transition-colors"
                >
                  Demain
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-200/70 border border-slate-200 font-semibold text-slate-700 transition-colors"
                >
                  +1 Semaine
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="task-date-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-200 outline-hidden"
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
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
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
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium outline-hidden ${
                    hasTime
                      ? 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-200'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Automated Reminder Trigger Setting */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-2">
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
              className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-200 outline-hidden"
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-amber-800/80">
              {reminderMinutesBefore >= 0
                ? 'L’application émettra une notification et un carillon audio automatique au moment choisi.'
                : 'Aucun rappel automatique ne sera déclenché pour cette tâche.'}
            </p>
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
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        selected
                          ? `${cfg.badge} ring-2 ring-indigo-400 font-bold shadow-xs`
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

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Catégorie
              </label>
              <select
                id="task-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-hidden"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-hidden"
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminée</option>
              </select>
            </div>
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition-colors disabled:opacity-50"
              >
                {isGeneratingSubtasks ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                )}
                <span>Générer avec l&apos;IA</span>
              </button>
            </div>

            {/* List of subtasks */}
            <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group"
                >
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
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
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-200 outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Étiquettes (Tags)
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
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
                    handleAddTag();
                  }
                }}
                placeholder="Nouveau tag (ex: Urgent, ProjetX)..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-200 outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                + Tag
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 flex items-center justify-end gap-3 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              id="save-task-submit-btn"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all hover:shadow-indigo-300 active:scale-98"
            >
              {initialTask ? 'Enregistrer les modifications' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TaskModal: React.FC<TaskModalProps> = (props) => {
  if (!props.isOpen) return null;
  const key = props.initialTask ? `edit-${props.initialTask.id}-${props.initialTask.updatedAt}` : `new-${props.defaultDate || 'default'}`;
  return <TaskModalInner key={key} {...props} />;
};
