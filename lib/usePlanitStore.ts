'use client';

import { useSyncExternalStore, useCallback, useMemo, useEffect } from 'react';
import { Task, Category, TaskNotification, ViewMode } from '@/types/task';
import { DEFAULT_CATEGORIES, getInitialSampleTasks } from '@/lib/constants';
import {
  dbPutAllTasks,
  dbPutAllCategories,
  dbPutAllNotifications,
  dbSetPreference,
  initIndexedDBStore,
} from '@/lib/db';

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

let isDBInitialized = false;

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

  // Initialize and synchronize with IndexedDB on mount
  useEffect(() => {
    if (!isMounted || isDBInitialized) return;
    isDBInitialized = true;

    initIndexedDBStore()
      .then((data) => {
        // If IndexedDB had existing records, ensure local store is aligned
        if (data.tasks.length > 0) {
          const currentLocal = localStorage.getItem(STORAGE_KEYS.TASKS);
          if (!currentLocal || currentLocal === '[]') {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
            notify();
          }
        }
      })
      .catch((err) => {
        console.warn('IndexedDB sync skipped:', err);
      });
  }, [isMounted]);

  // State update actions with dual write to LocalStorage & IndexedDB
  const setTasks = useCallback((newTasks: Task[] | ((prev: Task[]) => Task[])) => {
    try {
      const currentTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
      const resolved = typeof newTasks === 'function' ? newTasks(currentTasks) : newTasks;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(resolved));
      notify();
      // Background IndexedDB async persist
      dbPutAllTasks(resolved).catch(console.error);
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
      // Background IndexedDB async persist
      dbPutAllCategories(resolved).catch(console.error);
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
        // Background IndexedDB async persist
        dbPutAllNotifications(resolved).catch(console.error);
      } catch {}
    },
    []
  );

  const setCurrentView = useCallback((view: ViewMode) => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, view);
      notify();
      dbSetPreference('view_mode', view).catch(console.error);
    } catch {}
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
      notify();
      dbSetPreference('sound_enabled', enabled).catch(console.error);
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
