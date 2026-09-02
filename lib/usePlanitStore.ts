'use client';

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { Task, Category, TaskNotification, ViewMode } from '@/types/task';
import { DEFAULT_CATEGORIES, getInitialSampleTasks } from '@/lib/constants';

const STORAGE_KEYS = {
  TASKS: 'planit_tasks_v1',
  CATEGORIES: 'planit_categories_v1',
  NOTIFICATIONS: 'planit_notifications_v1',
  SOUND_ENABLED: 'planit_sound_enabled_v1',
  VIEW_MODE: 'planit_view_mode_v1',
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', callback);
    }
  };
}

export function usePlanitStore() {
  // Check mounted status safely via useSyncExternalStore
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  // 1. Tasks Raw String
  const tasksRaw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (raw) return raw;
        const initial = JSON.stringify(getInitialSampleTasks());
        localStorage.setItem(STORAGE_KEYS.TASKS, initial);
        return initial;
      } catch {
        return '[]';
      }
    },
    () => '[]'
  );

  // 2. Categories Raw String
  const categoriesRaw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(STORAGE_KEYS.CATEGORIES) || JSON.stringify(DEFAULT_CATEGORIES);
      } catch {
        return JSON.stringify(DEFAULT_CATEGORIES);
      }
    },
    () => JSON.stringify(DEFAULT_CATEGORIES)
  );

  // 3. Notifications Raw String
  const notificationsRaw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]';
      } catch {
        return '[]';
      }
    },
    () => '[]'
  );

  // 4. View Mode
  const currentView = useSyncExternalStore<ViewMode>(
    subscribe,
    () => {
      try {
        const mode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
        if (mode === 'list' || mode === 'calendar' || mode === 'kanban' || mode === 'stats') {
          return mode;
        }
        return 'list';
      } catch {
        return 'list';
      }
    },
    () => 'list'
  );

  // 5. Sound Enabled
  const soundEnabledRaw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
        return raw !== null ? raw : 'true';
      } catch {
        return 'true';
      }
    },
    () => 'true'
  );

  // Memoized Parsed States
  const tasks = useMemo<Task[]>(() => {
    try {
      return JSON.parse(tasksRaw);
    } catch {
      return [];
    }
  }, [tasksRaw]);

  const categories = useMemo<Category[]>(() => {
    try {
      return JSON.parse(categoriesRaw);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }, [categoriesRaw]);

  const notifications = useMemo<TaskNotification[]>(() => {
    try {
      return JSON.parse(notificationsRaw);
    } catch {
      return [];
    }
  }, [notificationsRaw]);

  const soundEnabled = soundEnabledRaw === 'true';

  // State update actions
  const setTasks = useCallback((newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    try {
      const currentTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
      const resolved = typeof newTasks === 'function' ? newTasks(currentTasks) : newTasks;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(resolved));
      notify();
    } catch {}
  }, []);

  const setCategories = useCallback((newCats: Category[] | ((prev: Category[]) => Category[])) => {
    try {
      const current: Category[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CATEGORIES) || JSON.stringify(DEFAULT_CATEGORIES)
      );
      const resolved = typeof newCats === 'function' ? newCats(current) : newCats;
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(resolved));
      notify();
    } catch {}
  }, []);

  const setNotifications = useCallback(
    (newNotifs: TaskNotification[] | ((prev: TaskNotification[]) => TaskNotification[])) => {
      try {
        const current: TaskNotification[] = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]'
        );
        const resolved = typeof newNotifs === 'function' ? newNotifs(current) : newNotifs;
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(resolved));
        notify();
      } catch {}
    },
    []
  );

  const setCurrentView = useCallback((view: ViewMode) => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, view);
      notify();
    } catch {}
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
      notify();
    } catch {}
  }, []);

  return {
    isMounted,
    tasks,
    categories,
    notifications,
    currentView,
    soundEnabled,
    setTasks,
    setCategories,
    setNotifications,
    setCurrentView,
    setSoundEnabled,
  };
}
