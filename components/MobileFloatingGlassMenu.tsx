'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  LayoutGrid,
  BarChart3,
  Plus,
  X,
} from 'lucide-react';
import { ViewMode } from '@/types/task';
import { soundManager } from '@/lib/sound';

interface MobileFloatingGlassMenuProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewTaskModal: () => void;
  pendingTasksCount?: number;
}

export const MobileFloatingGlassMenu: React.FC<MobileFloatingGlassMenuProps> = ({
  currentView,
  onViewChange,
  onOpenNewTaskModal,
  pendingTasksCount = 0,
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
      {/* 1. Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {/* 2. Glass Menu Container (5 Core Action Pills Stack) */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: 'spring', damping: 24, stiffness: 340, staggerChildren: 0.04 }}
              className="flex flex-col items-end gap-2.5 mb-3 pointer-events-auto"
            >
              {/* Item 1: Nouvelle Tâche (Highlight CTA) */}
              <motion.button
                type="button"
                onClick={handleNewTask}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-3 pl-2 pr-5 py-1.5 rounded-full bg-[#59240A] text-white backdrop-blur-xl border border-white/20 shadow-xl shadow-[#59240A]/25 text-sm font-semibold transition-transform"
              >
                <div className="w-9 h-9 rounded-full bg-[#F7C59F] text-[#422006] flex items-center justify-center shrink-0 shadow-xs">
                  <Plus className="w-5 h-5 stroke-[2.6]" />
                </div>
                <span className="whitespace-nowrap">Nouvelle tâche</span>
              </motion.button>

              {/* Item 2: Tâches (Liste) */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('list')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-1.5 rounded-full backdrop-blur-xl border shadow-lg text-sm font-semibold transition-all ${
                  currentView === 'list'
                    ? 'bg-white/95 dark:bg-slate-900/95 text-[#933F15] dark:text-[#F7C59F] border-[#F7C59F] ring-2 ring-[#F7C59F]/40 shadow-[#F7C59F]/20'
                    : 'bg-[#ECEFEA]/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-white/70 dark:border-slate-700/60 hover:bg-white/95'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'list'
                    ? 'bg-[#F7C59F]/40 text-[#59240A]'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  <CheckSquare className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span>Tâches</span>
                  {pendingTasksCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F7C59F] text-[#422006] font-bold">
                      {pendingTasksCount}
                    </span>
                  )}
                </div>
              </motion.button>

              {/* Item 3: Calendrier */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('calendar')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-1.5 rounded-full backdrop-blur-xl border shadow-lg text-sm font-semibold transition-all ${
                  currentView === 'calendar'
                    ? 'bg-white/95 dark:bg-slate-900/95 text-[#933F15] dark:text-[#F7C59F] border-[#F7C59F] ring-2 ring-[#F7C59F]/40 shadow-[#F7C59F]/20'
                    : 'bg-[#ECEFEA]/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-white/70 dark:border-slate-700/60 hover:bg-white/95'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'calendar'
                    ? 'bg-[#F7C59F]/40 text-[#59240A]'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="whitespace-nowrap">Calendrier</span>
              </motion.button>

              {/* Item 4: Tableau Kanban */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('kanban')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-1.5 rounded-full backdrop-blur-xl border shadow-lg text-sm font-semibold transition-all ${
                  currentView === 'kanban'
                    ? 'bg-white/95 dark:bg-slate-900/95 text-[#933F15] dark:text-[#F7C59F] border-[#F7C59F] ring-2 ring-[#F7C59F]/40 shadow-[#F7C59F]/20'
                    : 'bg-[#ECEFEA]/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-white/70 dark:border-slate-700/60 hover:bg-white/95'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'kanban'
                    ? 'bg-[#F7C59F]/40 text-[#59240A]'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="whitespace-nowrap">Tableau</span>
              </motion.button>

              {/* Item 5: Statistiques */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('stats')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-1.5 rounded-full backdrop-blur-xl border shadow-lg text-sm font-semibold transition-all ${
                  currentView === 'stats'
                    ? 'bg-white/95 dark:bg-slate-900/95 text-[#933F15] dark:text-[#F7C59F] border-[#F7C59F] ring-2 ring-[#F7C59F]/40 shadow-[#F7C59F]/20'
                    : 'bg-[#ECEFEA]/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border-white/70 dark:border-slate-700/60 hover:bg-white/95'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  currentView === 'stats'
                    ? 'bg-[#F7C59F]/40 text-[#59240A]'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  <BarChart3 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="whitespace-nowrap">Stats</span>
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
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto shadow-xl shadow-slate-900/15 backdrop-blur-2xl border border-white/90 dark:border-slate-700 bg-[#E8EDE9]/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-white/95"
        >
          {/* Glass Inner Reflection Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/5 pointer-events-none" />

          {/* Animated Icon (Amanga 4-dots Grid Matrix <-> Close Cross) */}
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
                <X className="w-6 h-6 stroke-[2.4] text-slate-800 dark:text-slate-100" />
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
                {/* 4-dot Grid Matrix Icon identical to Amanga Store & Supabase */}
                <div className="grid grid-cols-2 gap-1.5 p-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 dark:bg-slate-300" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};
