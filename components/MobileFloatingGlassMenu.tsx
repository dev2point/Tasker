'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  LayoutGrid,
  BarChart3,
  Shield,
  Plus,
  X,
  GitPullRequest,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { User } from '@/types/user';
import { soundManager } from '@/lib/sound';

interface MobileFloatingGlassMenuProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTaskModal: () => void;
  pendingTasksCount?: number;
  currentUser?: User | null;
}

export const MobileFloatingGlassMenu: React.FC<MobileFloatingGlassMenuProps> = ({
  currentView,
  onViewChange,
  onOpenNewTaskModal,
  pendingTasksCount = 0,
  currentUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggle = () => {
    soundManager.playClickSound();
    setIsOpen((prev) => !prev);
  };

  const handleSelectView = (view: ViewMode) => {
    soundManager.playClickSound();
    onViewChange(view);
    setIsOpen(false);
  };

  const handleNewTask = () => {
    soundManager.playClickSound();
    onOpenNewTaskModal();
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* 1. Light Translucent Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* 2. Frosted Glass Menu Items Stack (Amanga Store & Supabase inspired) */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350, staggerChildren: 0.04 }}
              className="flex flex-col items-end gap-2.5 mb-3 pointer-events-auto"
            >
              {/* Single Unified Tâches Button (Navigate & Create) */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-between rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all ${
                  currentView === 'list'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
                    : 'bg-[#061A13]/90 text-slate-100 border-emerald-500/30 hover:bg-[#0A291E]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (currentView === 'list') {
                      handleNewTask();
                    } else {
                      handleSelectView('list');
                    }
                  }}
                  className="flex items-center gap-2.5 pl-2 pr-2 py-2 active:scale-95 transition-transform"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                    currentView === 'list'
                      ? 'bg-slate-950 text-emerald-400'
                      : 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                  }`}>
                    <CheckSquare className="w-4 h-4 stroke-[2.3]" />
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-semibold">Tâches</span>
                    {pendingTasksCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-bold">
                        {pendingTasksCount}
                      </span>
                    )}
                  </div>
                </button>

                {/* Inline Quick Add button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewTask();
                  }}
                  title="Ajouter une nouvelle tâche"
                  className="mr-2 w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs border border-emerald-400/50 active:scale-90 transition-transform cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                </button>
              </motion.div>

              {/* Item 2: Revue Métier */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('review')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                  currentView === 'review'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
                    : 'bg-[#061A13]/90 text-slate-100 border-emerald-500/30 hover:bg-[#0A291E]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'review'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                }`}>
                  <GitPullRequest className="w-4 h-4 stroke-[2.3]" />
                </div>
                <span className="whitespace-nowrap font-semibold">Revue Métier</span>
              </motion.button>

              {/* Item 3: Calendrier */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('calendar')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 ${
                  currentView === 'calendar'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
                    : 'bg-[#061A13]/90 text-slate-100 border-emerald-500/30 hover:bg-[#0A291E]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'calendar'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                }`}>
                  <CalendarIcon className="w-4 h-4 stroke-[2.3]" />
                </div>
                <span className="whitespace-nowrap font-semibold">Calendrier</span>
              </motion.button>

              {/* Item 4: Tableau Kanban */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('kanban')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 ${
                  currentView === 'kanban'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
                    : 'bg-[#061A13]/90 text-slate-100 border-emerald-500/30 hover:bg-[#0A291E]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'kanban'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                }`}>
                  <LayoutGrid className="w-4 h-4 stroke-[2.3]" />
                </div>
                <span className="whitespace-nowrap font-semibold">Tableau</span>
              </motion.button>

              {/* Item 5: Statistiques */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('stats')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 ${
                  currentView === 'stats'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
                    : 'bg-[#061A13]/90 text-slate-100 border-emerald-500/30 hover:bg-[#0A291E]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'stats'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                }`}>
                  <BarChart3 className="w-4 h-4 stroke-[2.3]" />
                </div>
                <span className="whitespace-nowrap font-semibold">Stats</span>
              </motion.button>

              {/* Item 6: Administration */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('admin')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 ${
                  currentView === 'admin'
                    ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-purple-500/30'
                    : 'bg-[#061A13]/90 text-purple-200 border-purple-500/30 hover:bg-[#0A291E]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'admin'
                    ? 'bg-slate-950 text-purple-400'
                    : 'bg-purple-500/20 text-purple-300 shadow-xs'
                }`}>
                  <Shield className="w-4 h-4 stroke-[2.3]" />
                </div>
                <span className="whitespace-nowrap font-bold">Admin</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Main Floating Glass Circle Button (Trigger) */}
        <motion.button
          id="mobile-glass-floating-btn"
          type="button"
          onClick={handleToggle}
          whileTap={{ scale: 0.92 }}
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu de navigation'}
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto shadow-2xl shadow-emerald-950/60 backdrop-blur-2xl border border-emerald-500/40 bg-[#061A13]/90 text-emerald-300 hover:text-white hover:bg-[#0A291E]"
        >
          {/* Glass Inner Reflection Highlight */}
          <div className="absolute inset-0 rounded-full bg-emerald-400/10 pointer-events-none" />

          {/* Animated Icon (4-dots Matrix <-> Close Cross) */}
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0, scale: 0.75 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                <X className="w-6 h-6 stroke-[2.6] text-emerald-300" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0, scale: 0.75 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                {/* 4-dot Grid Matrix Icon in dark slate */}
                <div className="grid grid-cols-2 gap-1.5 p-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};
