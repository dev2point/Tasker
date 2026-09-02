import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, Category, TaskNotification, ViewMode } from '@/types/task';
import { DEFAULT_CATEGORIES, getInitialSampleTasks } from '@/lib/constants';

const DB_NAME = 'PlanItIndexedDB';
const DB_VERSION = 1;

export interface PlanItDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-dueDate': string;
      'by-category': string;
      'by-status': string;
      'by-priority': string;
    };
  };
  categories: {
    key: string;
    value: Category;
  };
  notifications: {
    key: string;
    value: TaskNotification;
    indexes: {
      'by-triggerTime': number;
      'by-read': number;
    };
  };
  preferences: {
    key: string;
    value: {
      key: string;
      val: unknown;
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PlanItDBSchema>> | null = null;

export function getIndexedDB(): Promise<IDBPDatabase<PlanItDBSchema>> | null {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB<PlanItDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Tasks Object Store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-dueDate', 'dueDate');
          taskStore.createIndex('by-category', 'category');
          taskStore.createIndex('by-status', 'status');
          taskStore.createIndex('by-priority', 'priority');
        }

        // 2. Categories Store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // 3. Notifications Store
        if (!db.objectStoreNames.contains('notifications')) {
          const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notifStore.createIndex('by-triggerTime', 'triggerTime');
          notifStore.createIndex('by-read', 'read');
        }

        // 4. Preferences Store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      },
    });
  }

  return dbPromise;
}

// -------------------------------------------------------------
// Tasks Operations
// -------------------------------------------------------------

export async function dbGetAllTasks(): Promise<Task[]> {
  const db = await getIndexedDB();
  if (!db) return [];
  try {
    return await db.getAll('tasks');
  } catch (err) {
    console.error('Error fetching tasks from IndexedDB:', err);
    return [];
  }
}

export async function dbPutTask(task: Task): Promise<void> {
  const db = await getIndexedDB();
  if (!db) return;
  try {
    await db.put('tasks', task);
  } catch (err) {
    console.error('Error saving task to IndexedDB:', err);
  }
}

export async function dbPutAllTasks(tasks: Task[]): Promise<void> {
  const db = await getIndexedDB();
  if (!db) return;
  try {
    const tx = db.transaction('tasks', 'readwrite');
    await tx.store.clear();
    for (const task of tasks) {
      await tx.store.put(task);
    }
    await tx.done;
  } catch (err) {
    console.error('Error bulk saving tasks to IndexedDB:', err);
  }
}

export async function dbDeleteTask(taskId: string): Promise<void> {
  const db = await getIndexedDB();
  if (!db) return;
  try {
    await db.delete('tasks', taskId);
  } catch (err) {
    console.error('Error deleting task from IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// Categories Operations
// -------------------------------------------------------------

export async function dbGetAllCategories(): Promise<Category[]> {
  const db = await getIndexedDB();
  if (!db) return [];
  try {
    const cats = await db.getAll('categories');
    return cats.length > 0 ? cats : DEFAULT_CATEGORIES;
  } catch (err) {
    console.error('Error fetching categories from IndexedDB:', err);
    return DEFAULT_CATEGORIES;
  }
}

export async function dbPutAllCategories(categories: Category[]): Promise<void> {
  const db = await getIndexedDB();
  if (!db) return;
  try {
    const tx = db.transaction('categories', 'readwrite');
    await tx.store.clear();
    for (const cat of categories) {
      await tx.store.put(cat);
    }
    await tx.done;
  } catch (err) {
    console.error('Error saving categories to IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// Notifications Operations
// -------------------------------------------------------------

export async function dbGetAllNotifications(): Promise<TaskNotification[]> {
  const db = await getIndexedDB();
  if (!db) return [];
  try {
    return await db.getAll('notifications');
  } catch (err) {
    console.error('Error fetching notifications from IndexedDB:', err);
    return [];
  }
}

export async function dbPutAllNotifications(notifications: TaskNotification[]): Promise<void> {
  const db = await getIndexedDB();
  if (!db) return;
  try {
    const tx = db.transaction('notifications', 'readwrite');
    await tx.store.clear();
    for (const n of notifications) {
      await tx.store.put(n);
    }
    await tx.done;
  } catch (err) {
    console.error('Error saving notifications to IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// Preferences (View Mode, Sound, etc.)
// -------------------------------------------------------------

export async function dbGetPreference<T>(key: string, fallback: T): Promise<T> {
  const db = await getIndexedDB();
  if (!db) return fallback;
  try {
    const item = await db.get('preferences', key);
    return item !== undefined ? (item.val as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function dbSetPreference<T>(key: string, val: T): Promise<void> {
  const db = await getIndexedDB();
  if (!db) return;
  try {
    await db.put('preferences', {
      key,
      val,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error setting preference in IndexedDB:', err);
  }
}

// -------------------------------------------------------------
// Full Database Seed / Sync Initialization
// -------------------------------------------------------------

export async function initIndexedDBStore(): Promise<{
  tasks: Task[];
  categories: Category[];
  notifications: TaskNotification[];
  viewMode: ViewMode;
  soundEnabled: boolean;
}> {
  const db = await getIndexedDB();
  if (!db) {
    return {
      tasks: getInitialSampleTasks(),
      categories: DEFAULT_CATEGORIES,
      notifications: [],
      viewMode: 'list',
      soundEnabled: true,
    };
  }

  try {
    // 1. Check if tasks exist
    let tasks = await db.getAll('tasks');
    if (tasks.length === 0) {
      // Check if localStorage has older data
      const local = localStorage.getItem('planit_tasks_v1');
      if (local) {
        try {
          tasks = JSON.parse(local);
        } catch {}
      }
      if (!tasks || tasks.length === 0) {
        tasks = getInitialSampleTasks();
      }
      await dbPutAllTasks(tasks);
    }

    // 2. Check categories
    let categories = await db.getAll('categories');
    if (categories.length === 0) {
      categories = DEFAULT_CATEGORIES;
      await dbPutAllCategories(categories);
    }

    // 3. Check notifications
    const notifications = await db.getAll('notifications');

    // 4. Check preferences
    const viewMode = await dbGetPreference<ViewMode>('view_mode', 'list');
    const soundEnabled = await dbGetPreference<boolean>('sound_enabled', true);

    return {
      tasks,
      categories,
      notifications,
      viewMode,
      soundEnabled,
    };
  } catch (err) {
    console.error('Failed to initialize IndexedDB:', err);
    return {
      tasks: getInitialSampleTasks(),
      categories: DEFAULT_CATEGORIES,
      notifications: [],
      viewMode: 'list',
      soundEnabled: true,
    };
  }
}
