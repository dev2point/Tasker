'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ListView } from '@/components/ListView';
import { CalendarView } from '@/components/CalendarView';
import { KanbanView } from '@/components/KanbanView';
import { StatsView } from '@/components/StatsView';
import { TaskModal } from '@/components/TaskModal';
import { ActiveReminderModal } from '@/components/ActiveReminderModal';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { AIAssistantModal } from '@/components/AIAssistantModal';
import { ExportModal } from '@/components/ExportModal';
import { OverdueReminderBanner } from '@/components/OverdueReminderBanner';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

import { Task, TaskNotification, ViewMode } from '@/types/task';
import {
  evaluateReminders,
  isTaskOverdue,
  requestNotificationPermission,
  sendBrowserNotification,
  getNextRecurrenceDate,
} from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { usePlanitStore } from '@/lib/usePlanitStore';

export default function HomePage() {
  const {
    isMounted,
    tasks,
    categories,
    notifications,
    currentView,
    soundEnabled,
    setTasks,
    setNotifications,
    setCurrentView,
    setSoundEnabled,
  } = usePlanitStore();

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDateForModal, setDefaultDateForModal] = useState<string | undefined>(undefined);
  const [activeReminderTask, setActiveReminderTask] = useState<Task | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Update sound manager & permissions on change after mount
  useEffect(() => {
    if (isMounted) {
      soundManager.setEnabled(soundEnabled);
      requestNotificationPermission();
    }
  }, [soundEnabled, isMounted]);

  // Save tasks helper
  const saveTasks = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, [setTasks]);

  // Save notifications helper
  const saveNotifications = useCallback((updatedNotifs: TaskNotification[]) => {
    setNotifications(updatedNotifs);
  }, [setNotifications]);

  // Toggle sound
  const handleToggleSound = () => {
    const newSound = !soundEnabled;
    setSoundEnabled(newSound);
    soundManager.setEnabled(newSound);
  };

  // Switch View Mode
  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };

  // Automatic Reminder Background Evaluation Engine (Every 10 seconds)
  useEffect(() => {
    if (!isMounted || tasks.length === 0) return;

    const checkReminders = () => {
      const now = Date.now();
      const { triggeredTasks, newNotifications } = evaluateReminders(tasks, now);

      if (triggeredTasks.length > 0) {
        // Trigger audible chime
        soundManager.playReminderChime();

        // Send browser notification for the first triggered task
        const firstTask = triggeredTasks[0];
        sendBrowserNotification(`⏰ Rappel Planit: ${firstTask.title}`, {
          body: `Échéance prévue aujourd'hui à ${firstTask.dueTime || 'heure indiquée'}.`,
        });

        // Set as active pop-up if no modal is currently focused
        setActiveReminderTask(firstTask);

        // Update task states
        const triggeredIds = new Set(triggeredTasks.map((t) => t.id));
        const updatedTasks = tasks.map((t) =>
          triggeredIds.has(t.id)
            ? { ...t, reminderTriggered: true, reminderTriggeredAt: new Date(now).toISOString() }
            : t
        );
        saveTasks(updatedTasks);

        // Append to notifications list
        if (newNotifications.length > 0) {
          saveNotifications([...newNotifications, ...notifications]);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [isMounted, tasks, notifications, saveTasks, saveNotifications]);

  // Open Task Modal (Create or Edit)
  const handleOpenTaskModal = (task?: Task, defaultDate?: string) => {
    setEditingTask(task || null);
    setDefaultDateForModal(defaultDate);
    setIsTaskModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = (taskPayload: Partial<Task>) => {
    const nowIso = new Date().toISOString();

    if (taskPayload.id) {
      // Update existing
      const updated = tasks.map((t) =>
        t.id === taskPayload.id
          ? ({
              ...t,
              ...taskPayload,
              updatedAt: nowIso,
            } as Task)
          : t
      );
      saveTasks(updated);
    } else {
      // Create new
      const newTask: Task = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        title: taskPayload.title || 'Nouvelle tâche',
        description: taskPayload.description || '',
        dueDate: taskPayload.dueDate || new Date().toISOString().split('T')[0],
        dueTime: taskPayload.dueTime,
        priority: taskPayload.priority || 'medium',
        category: taskPayload.category || 'travail',
        completed: Boolean(taskPayload.completed),
        createdAt: nowIso,
        updatedAt: nowIso,
        reminderMinutesBefore:
          typeof taskPayload.reminderMinutesBefore === 'number'
            ? taskPayload.reminderMinutesBefore
            : 15,
        reminderTriggered: false,
        recurrence: taskPayload.recurrence || 'none',
        tags: taskPayload.tags || [],
        subtasks: taskPayload.subtasks || [],
        status: taskPayload.status || 'todo',
      };
      saveTasks([newTask, ...tasks]);
    }
  };

  // Toggle Task Completion (with automated recurrence handling)
  const handleToggleComplete = (taskId: string) => {
    let newTaskToSpawn: Task | null = null;

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        const nowIso = new Date().toISOString();

        // If completing a recurring task, schedule next occurrence
        if (nextCompleted && t.recurrence && t.recurrence !== 'none') {
          const nextDate = getNextRecurrenceDate(t.dueDate, t.recurrence);
          newTaskToSpawn = {
            ...t,
            id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            dueDate: nextDate,
            completed: false,
            completedAt: undefined,
            reminderTriggered: false,
            createdAt: nowIso,
            updatedAt: nowIso,
            subtasks: t.subtasks ? t.subtasks.map((st) => ({ ...st, completed: false })) : [],
          };
        }

        return {
          ...t,
          completed: nextCompleted,
          status: (nextCompleted ? 'completed' : 'todo') as 'completed' | 'todo',
          completedAt: nextCompleted ? nowIso : undefined,
          updatedAt: nowIso,
        };
      }
      return t;
    });

    if (newTaskToSpawn) {
      saveTasks([newTaskToSpawn, ...updated]);
    } else {
      saveTasks(updated);
    }
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    saveTasks(tasks.filter((t) => t.id !== taskId));
  };

  // Duplicate Task
  const handleDuplicateTask = (task: Task) => {
    const dup: Task = {
      ...task,
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: `${task.title} (Copie)`,
      completed: false,
      completedAt: undefined,
      reminderTriggered: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTasks([dup, ...tasks]);
    soundManager.playClickSound();
  };

  // Quick Inline Add
  const handleQuickAdd = (
    title: string,
    dueDate: string,
    dueTime?: string,
    category: string = 'travail'
  ) => {
    const nowIso = new Date().toISOString();
    const newTask: Task = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title,
      description: '',
      dueDate,
      dueTime,
      priority: 'medium',
      category,
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      reminderMinutesBefore: 15,
      reminderTriggered: false,
      recurrence: 'none',
      tags: [],
      subtasks: [],
      status: 'todo',
    };
    saveTasks([newTask, ...tasks]);
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    soundManager.playClickSound();
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const subtasks = t.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...t, subtasks };
      }
      return t;
    });
    saveTasks(updated);
  };

  // Postpone Task (+1 or +N days)
  const handlePostponeTask = (taskId: string, days: number = 1) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return {
          ...t,
          dueDate: `${yyyy}-${mm}-${dd}`,
          reminderTriggered: false,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    saveTasks(updated);
    soundManager.playClickSound();
  };

  // Reschedule to Today
  const handleRescheduleToToday = (taskId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            dueDate: todayStr,
            reminderTriggered: false,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    saveTasks(updated);
    soundManager.playClickSound();
  };

  // Update Status in Kanban
  const handleUpdateTaskStatus = (
    taskId: string,
    newStatus: 'todo' | 'in_progress' | 'completed'
  ) => {
    const isCompleted = newStatus === 'completed';
    const nowIso = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: newStatus,
            completed: isCompleted,
            completedAt: isCompleted ? nowIso : undefined,
            updatedAt: nowIso,
          }
        : t
    );
    saveTasks(updated);
  };

  // Snooze active reminder by minutes
  const handleSnoozeReminder = (taskId: string, minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];

    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            dueDate: dateStr,
            dueTime: timeStr,
            reminderMinutesBefore: 0, // alert at exact snoozed time
            reminderTriggered: false,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    saveTasks(updated);
    setActiveReminderTask(null);
  };

  // Snooze reminder until tomorrow
  const handleSnoozeReminderTomorrow = (taskId: string) => {
    handlePostponeTask(taskId, 1);
    setActiveReminderTask(null);
  };

  // Notifications clear / read
  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleClearAllNotifications = () => {
    saveNotifications([]);
  };

  const handleSelectTaskFromNotification = (taskId: string) => {
    const matched = tasks.find((t) => t.id === taskId);
    if (matched) {
      handleOpenTaskModal(matched);
    }
  };

  // Computed data for top banners and badges
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const overdueTasks = useMemo(() => tasks.filter((t) => isTaskOverdue(t)), [tasks]);
  const dueTodayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayStr && !t.completed),
    [tasks, todayStr]
  );
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const activeRemindersCount = useMemo(
    () => tasks.filter((t) => !t.completed && t.reminderMinutesBefore >= 0).length,
    [tasks]
  );

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="h-16 border-b border-slate-200/90 bg-white/95" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 w-full flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Chargement de votre planning...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-indigo-500 selection:text-white pb-12">
      {/* Global Navigation Header */}
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenNewTaskModal={() => handleOpenTaskModal()}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        activeRemindersCount={activeRemindersCount}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full">
        {/* Overdue and Daily Focus Banner */}
        <OverdueReminderBanner
          overdueTasks={overdueTasks}
          dueTodayTasks={dueTodayTasks}
          onOpenTask={handleOpenTaskModal}
          onCompleteTask={handleToggleComplete}
          onRescheduleToToday={handleRescheduleToToday}
        />

        {/* Dynamic Views */}
        {currentView === 'list' && (
          <ListView
            tasks={tasks}
            categories={categories}
            onOpenTaskModal={handleOpenTaskModal}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            onDuplicateTask={handleDuplicateTask}
            onQuickAdd={handleQuickAdd}
            onToggleSubtask={handleToggleSubtask}
            onPostponeTask={handlePostponeTask}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            tasks={tasks}
            categories={categories}
            onOpenTaskModal={handleOpenTaskModal}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {currentView === 'kanban' && (
          <KanbanView
            tasks={tasks}
            categories={categories}
            onOpenTaskModal={handleOpenTaskModal}
            onUpdateTaskStatus={handleUpdateTaskStatus}
          />
        )}

        {currentView === 'stats' && (
          <StatsView
            tasks={tasks}
            categories={categories}
            onOpenTaskModal={handleOpenTaskModal}
          />
        )}
      </main>

      {/* Modals & Dialogs */}

      {/* 1. Task Modal (Create & Edit) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaveTask={handleSaveTask}
        initialTask={editingTask}
        categories={categories}
        defaultDate={defaultDateForModal}
      />

      {/* 2. Active Reminder Ringing Popup */}
      <ActiveReminderModal
        task={activeReminderTask}
        onClose={() => setActiveReminderTask(null)}
        onComplete={(taskId) => {
          handleToggleComplete(taskId);
          setActiveReminderTask(null);
        }}
        onSnooze={handleSnoozeReminder}
        onSnoozeTomorrow={handleSnoozeReminderTomorrow}
      />

      {/* 3. Notifications Center Dropdown */}
      <NotificationDropdown
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        tasks={tasks}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearAllNotifications}
        onSelectTask={handleSelectTaskFromNotification}
      />

      {/* 4. AI Smart Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAddTask={(parsed) => handleSaveTask(parsed)}
        existingTasks={tasks}
        categories={categories}
      />

      {/* 5. iCal & JSON Export/Import Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tasks={tasks}
        onImportTasks={(imported) => saveTasks(imported)}
      />

      {/* PWA Background Services & Offline Connectivity Indicator */}
      <ServiceWorkerRegister />
      <OfflineIndicator />
    </div>
  );
}
