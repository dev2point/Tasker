'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  Bell,
  Lightbulb,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { Task, Category } from '@/types/task';
import { soundManager } from '@/lib/sound';
import { PRIORITY_CONFIG } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Partial<Task>) => void;
  existingTasks: Task[];
  categories: Category[];
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  existingTasks,
  categories,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'plan'>('create');
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Result of parsed task
  const [parsedTask, setParsedTask] = useState<Partial<Task> | null>(null);

  // Result of daily advice
  const [dailyAdvice, setDailyAdvice] = useState<{
    summary: string;
    recommendedOrder: string[];
    tips: string[];
    focusQuote: string;
  } | null>(null);

  if (!isOpen) return null;

  const examplePrompts = [
    'Préparer le rapport financier vendredi à 14h30 priorité haute avec rappel 30 min',
    'Faire 45 min de cardio demain à 18h catégorie santé avec rappel 15 min',
    'Rendez-vous dentiste le 15 du mois à 09h00 avec rappel 1 jour avant',
    'Réviser l’examen de programmation ce samedi à 10h avec sous-tâches',
  ];

  const handleParseTask = async (customPrompt?: string) => {
    const textToUse = customPrompt || naturalPrompt;
    if (!textToUse.trim()) return;

    setErrorMsg('');
    setLoading(true);
    setParsedTask(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse_task',
          prompt: textToUse.trim(),
        }),
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else if (data.result) {
        const r = data.result;
        const subtasks = (r.subtasks || []).map((t: string, i: number) => ({
          id: 'sub-' + Date.now() + '-' + i,
          title: t,
          completed: false,
        }));

        setParsedTask({
          title: r.title,
          description: r.description || '',
          dueDate: r.dueDate,
          dueTime: r.dueTime || undefined,
          priority: r.priority || 'medium',
          category: r.category || 'travail',
          reminderMinutesBefore: r.reminderMinutesBefore ?? 15,
          subtasks,
          tags: ['IA'],
          recurrence: 'none',
          status: 'todo',
        });
        soundManager.playClickSound();
      }
    } catch {
      setErrorMsg('Une erreur est survenue lors de la communication avec l’assistant IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAddParsedTask = () => {
    if (!parsedTask) return;
    onAddTask(parsedTask);
    soundManager.playCompleteSound();
    onClose();
  };

  const handleGetDailyAdvice = async () => {
    setErrorMsg('');
    setLoading(true);
    setDailyAdvice(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'daily_planner_advice',
          existingTasks: existingTasks.slice(0, 15),
        }),
      });

      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
      } else if (data.advice) {
        setDailyAdvice(data.advice);
        soundManager.playClickSound();
      }
    } catch {
      setErrorMsg('Impossible de générer le plan pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-assistant-title"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="ai-assistant-title" className="text-base font-bold tracking-tight">
                Assistant IA & Planification
              </h2>
              <p className="text-[11px] text-slate-400">
                Créez des tâches en langage naturel ou optimisez votre journée
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Création Intelligente</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('plan');
              if (!dailyAdvice && !loading) {
                handleGetDailyAdvice();
              }
            }}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'plan'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Conseils & Priorités</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: CREATE TASK VIA NLP */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Décrivez votre tâche en langage naturel :
                </label>
                <div className="relative">
                  <Textarea
                    rows={3}
                    value={naturalPrompt}
                    onChange={(e) => setNaturalPrompt(e.target.value)}
                    placeholder="Ex: Réviser le contrat avec Julien demain à 15h30, priorité haute avec un rappel 20 minutes avant..."
                    className="text-xs resize-none"
                  />
                </div>
              </div>

              {/* Action Submit */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={() => handleParseTask()}
                  disabled={loading || !naturalPrompt.trim()}
                  className="font-bold gap-2 text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyser et générer la tâche</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Examples prompts */}
              {!parsedTask && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Exemples de commandes :
                  </span>
                  <div className="space-y-1.5">
                    {examplePrompts.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => {
                          setNaturalPrompt(ex);
                          handleParseTask(ex);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-xs font-medium text-slate-700 transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{ex}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Result Preview Card */}
              {parsedTask && (
                <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200 p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      Tâche structurée avec succès
                    </span>
                    <Badge variant="indigo" className="text-[10px]">
                      Prêt à ajouter
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">{parsedTask.title}</h4>
                    {parsedTask.description && (
                      <p className="text-xs text-slate-600">{parsedTask.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-indigo-100 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-slate-800 truncate">
                        {parsedTask.dueDate} {parsedTask.dueTime ? `@ ${parsedTask.dueTime}` : ''}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-indigo-100 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-slate-800">
                        {parsedTask.reminderMinutesBefore === 0
                          ? 'À l’heure'
                          : `${parsedTask.reminderMinutesBefore}m avant`}
                      </span>
                    </div>
                  </div>

                  {parsedTask.subtasks && parsedTask.subtasks.length > 0 && (
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Sous-tâches détectées :
                      </span>
                      {parsedTask.subtasks.map((st) => (
                        <div key={st.id} className="text-xs text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>{st.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleConfirmAddParsedTask}
                    className="w-full font-bold text-xs"
                    size="sm"
                  >
                    Ajouter cette tâche à mon planning
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAILY PLANNING & ADVICE */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Analyse de vos {existingTasks.length} tâches en cours
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleGetDailyAdvice}
                  disabled={loading}
                  className="font-bold text-xs"
                >
                  {loading ? 'Analyse...' : 'Actualiser les conseils'}
                </Button>
              </div>

              {loading && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-semibold text-slate-600">
                    L&apos;IA optimise votre ordre de travail et vos rappels...
                  </p>
                </div>
              )}

              {dailyAdvice && !loading && (
                <div className="space-y-3.5">
                  {/* Summary */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-slate-800 leading-relaxed font-medium">
                    {dailyAdvice.summary}
                  </div>

                  {/* Recommended Order */}
                  {dailyAdvice.recommendedOrder && dailyAdvice.recommendedOrder.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-indigo-600" />
                        Ordre recommandé pour aujourd&apos;hui
                      </span>
                      <div className="space-y-1.5">
                        {dailyAdvice.recommendedOrder.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-slate-800 font-medium">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Productivity Tips */}
                  {dailyAdvice.tips && dailyAdvice.tips.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Astuces de productivité
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {dailyAdvice.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
