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

  const navPillClass = (isActive: boolean) =>
    isActive
      ? 'bg-[#004266] text-white border-[#004266] dark:bg-[#103049] dark:border-[#3895C9] font-bold shadow-[#004266]/25'
      : 'bg-white/95 dark:bg-[#0B2438]/95 text-[#0B1F30] dark:text-slate-100 border-[#D8E2EC] dark:border-[#94B8D6]/25 hover:bg-[#EDF2F7] dark:hover:bg-[#103049]';

  const iconBubbleClass = (isActive: boolean) =>
    isActive
      ? 'bg-white/15 text-[#F77F00]'
      : 'bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB]';

  return (
    <div className="md:hidden">
      {/* Backdrop Overlay */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-[#061826]/25 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Speed-Dial Menu Stack */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end pointer-events-none">
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350, staggerChildren: 0.04 }}
              className="flex flex-col items-end gap-2.5 mb-3 pointer-events-auto"
            >
              {/* Tâches + Quick Add */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-between rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all ${navPillClass(
                  currentView === 'list'
                )}`}
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
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBubbleClass(currentView === 'list')}`}>
                    <CheckSquare className="w-4 h-4 stroke-[2.3]" />
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="font-semibold">Tâches</span>
                    {pendingTasksCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F77F00] text-white font-bold tabular-nums">
                        {pendingTasksCount}
                      </span>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewTask();
                  }}
                  title="Ajouter une nouvelle tâche"
                  className="mr-2 w-7 h-7 rounded-full bg-[#F77F00] hover:bg-[#DE7200] text-white flex items-center justify-center shrink-0 shadow-xs active:scale-90 transition-transform cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
                </button>
              </motion.div>

              {/* Revue Métier */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('review')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer ${navPillClass(
                  currentView === 'review'
                )}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBubbleClass(currentView === 'review')}`}>
                  <GitPullRequest className="w-4 h-4 stroke-[2.3]" />
                </span>
                <span className="whitespace-nowrap font-semibold">Revue Métier</span>
              </motion.button>

              {/* Calendrier */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('calendar')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer ${navPillClass(
                  currentView === 'calendar'
                )}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBubbleClass(currentView === 'calendar')}`}>
                  <CalendarIcon className="w-4 h-4 stroke-[2.3]" />
                </span>
                <span className="whitespace-nowrap font-semibold">Calendrier</span>
              </motion.button>

              {/* Tableau Kanban */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('kanban')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer ${navPillClass(
                  currentView === 'kanban'
                )}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBubbleClass(currentView === 'kanban')}`}>
                  <LayoutGrid className="w-4 h-4 stroke-[2.3]" />
                </span>
                <span className="whitespace-nowrap font-semibold">Tableau</span>
              </motion.button>

              {/* Statistiques */}
              <motion.button
                type="button"
                onClick={() => handleSelectView('stats')}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer ${navPillClass(
                  currentView === 'stats'
                )}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${iconBubbleClass(currentView === 'stats')}`}>
                  <BarChart3 className="w-4 h-4 stroke-[2.3]" />
                </span>
                <span className="whitespace-nowrap font-semibold">Stats</span>
              </motion.button>

              {/* Administration */}
              {currentUser?.role === 'admin' && (
                <motion.button
                  type="button"
                  onClick={() => handleSelectView('admin')}
                  whileTap={{ scale: 0.96 }}
                  className={`flex items-center gap-3 pl-2 pr-5 py-2 rounded-full backdrop-blur-2xl border shadow-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-purple-600 text-white border-purple-500 font-bold shadow-purple-500/30'
                      : 'bg-white/95 dark:bg-[#0B2438]/95 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-500/30'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                    currentView === 'admin'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                  }`}>
                    <Shield className="w-4 h-4 stroke-[2.3]" />
                  </span>
                  <span className="whitespace-nowrap font-bold">Admin</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Circle Trigger */}
        <motion.button
          id="mobile-glass-floating-btn"
          type="button"
          onClick={handleToggle}
          whileTap={{ scale: 0.92 }}
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu de navigation'}
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto shadow-2xl shadow-[#004266]/35 dark:shadow-black/60 border border-[#004266]/20 dark:border-[#3895C9]/40 bg-[#004266] dark:bg-[#103049] text-white hover:bg-[#00314D] dark:hover:bg-[#143D5C] cursor-pointer"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0, scale: 0.75 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                <X className="w-6 h-6 stroke-[2.6] text-white" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0, scale: 0.75 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
              >
                <span className="grid grid-cols-2 gap-1.5 p-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F77F00]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F77F00]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};
