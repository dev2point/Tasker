'use client';

import React, { useState } from 'react';
import {
  Bot,
  Wand2,
  Zap,
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
  Lock,
} from 'lucide-react';
import { Task, Category } from '@/types/task';
import { User } from '@/types/user';
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
  currentUser?: User | null;
  onOpenAuthModal?: () => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  existingTasks,
  categories,
  currentUser,
  onOpenAuthModal,
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
    if (!currentUser) {
      setErrorMsg("Authentification requise : Veuillez vous connecter pour utiliser l'Assistant IA.");
      return;
    }
    const textToUse = customPrompt || naturalPrompt;
    if (!textToUse.trim()) return;

    setErrorMsg('');
    setLoading(true);
    setParsedTask(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
        },
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
    if (!currentUser) {
      setErrorMsg("Authentification requise : Veuillez vous connecter pour obtenir des conseils personnalisés.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setDailyAdvice(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
        },
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-400/40 flex items-center justify-center text-orange-400 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 id="ai-assistant-title" className="text-base font-bold tracking-tight">
                Assistant IA & Planification
              </h2>
              <p className="text-[11px] text-slate-400">
                Créez des tâches en langage naturel ou optimisez votre journée avec Gemini
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

        {/* If User is not logged in, display Authentication Gate */}
        {!currentUser ? (
          <div className="p-6 sm:p-8 flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-100 to-amber-100 text-orange-600 flex items-center justify-center border border-orange-200/80 shadow-xs">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Connexion requise
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Connectez-vous à votre compte pour utiliser l&apos;Assistant IA.
              </p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <Button
                id="ai-modal-auth-cta-btn"
                onClick={() => {
                  onClose();
                  onOpenAuthModal?.();
                }}
                className="w-full bg-[#F7C59F] hover:bg-[#EE8D4B] text-[#422006] font-bold text-xs py-2.5 shadow-sm shadow-[#F7C59F]/50"
              >
                Se connecter ou créer un compte
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Continuer sans IA
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-[#BA5316] text-[#BA5316]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-orange-500" />
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
                ? 'border-[#BA5316] text-[#BA5316]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Conseils & Priorités</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
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
                  className="font-bold gap-2 text-xs bg-[#F7C59F] hover:bg-[#EE8D4B] text-[#422006] shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
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
                        className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-[#F7C59F]/20 border border-slate-200/80 hover:border-[#F7C59F] text-xs font-medium text-slate-700 transition-colors flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{ex}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#BA5316] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsed Result Preview Card */}
              {parsedTask && (
                <div className="bg-[#F7C59F]/30 rounded-2xl border border-[#F7C59F]/70 p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-[#F7C59F]/80 pb-2">
                    <span className="text-xs font-bold text-[#59240A] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#BA5316]" />
                      Tâche structurée avec succès
                    </span>
                    <Badge variant="apricot" className="text-[10px] font-bold">
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
                    <div className="p-2 rounded-lg bg-white border border-[#F7C59F]/60 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#B75217]" />
                      <span className="font-semibold text-slate-800 truncate">
                        {parsedTask.dueDate} {parsedTask.dueTime ? `@ ${parsedTask.dueTime}` : ''}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-[#F7C59F]/60 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-slate-800">
                        {parsedTask.reminderMinutesBefore === 0
                          ? 'À l’heure'
                          : `${parsedTask.reminderMinutesBefore}m avant`}
                      </span>
                    </div>
                  </div>

                  {parsedTask.subtasks && parsedTask.subtasks.length > 0 && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#F7C59F]/60 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Sous-tâches détectées :
                      </span>
                      {parsedTask.subtasks.map((st) => (
                        <div key={st.id} className="text-xs text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EE8D4B]" />
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
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BA5316]" />
                  <p className="text-xs font-semibold text-slate-600">
                    L&apos;IA optimise votre ordre de travail et vos rappels...
                  </p>
                </div>
              )}

              {dailyAdvice && !loading && (
                <div className="space-y-3.5">
                  {/* Summary */}
                  <div className="p-3.5 rounded-2xl bg-[#F7C59F]/30 border border-[#F7C59F]/70 text-xs text-slate-800 leading-relaxed font-medium">
                    {dailyAdvice.summary}
                  </div>

                  {/* Recommended Order */}
                  {dailyAdvice.recommendedOrder && dailyAdvice.recommendedOrder.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-[#BA5316]" />
                        Ordre recommandé pour aujourd&apos;hui
                      </span>
                      <div className="space-y-1.5">
                        {dailyAdvice.recommendedOrder.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                          >
                            <span className="w-5 h-5 rounded-full bg-[#F7C59F] text-[#422006] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
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
      </>
    )}
  </div>
</div>
  );
};
