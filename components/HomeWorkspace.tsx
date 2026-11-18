'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
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
import { PostgresTeamModal } from '@/components/PostgresTeamModal';
import { AdminView } from '@/components/AdminView';
import { CollaborativeReviewPlatform } from '@/components/review/CollaborativeReviewPlatform';
import { AuthModal } from '@/components/AuthModal';
import { AuthGate } from '@/components/AuthGate';
import { AuthTransitionCurtain } from '@/components/AuthTransitionCurtain';
import { CategoryTagManagerModal } from '@/components/CategoryTagManagerModal';
import { Microsoft365Modal } from '@/components/Microsoft365Modal';
import { ExecutiveReportModal } from '@/components/ExecutiveReportModal';
import { getStoredDossiers } from '@/lib/review-service';
import { ReviewDossier, Department } from '@/types/review';
import { ReportType } from '@/lib/report-generator';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { PWAFloatingInstallCard } from '@/components/pwa/PWAFloatingInstallCard';
import { authClient, useSession, getSession } from '@/lib/auth-client';
import {
  AuthPhase,
  InitialAuthSession,
  SessionUserSnapshot,
  getInitialAuthPhase,
  resolveSessionTransition,
  getEffectiveViewMode,
  mapSessionUserToDomainUser,
} from '@/lib/auth-lifecycle';
import {
  canUserViewTask,
  canUserCompleteTask,
  canUserEditTask,
  canUserDeleteTask,
  filterTasksForUser,
  filterNotificationsForUser,
  buildAdminActionNotification,
} from '@/lib/rbac';

import { Task, TaskNotification, TaskStatus, ViewMode } from '@/types/task';
import { User } from '@/types/user';
import {
  evaluateReminders,
  isTaskOverdue,
  requestNotificationPermission,
  sendBrowserNotification,
  getNextRecurrenceDate,
  formatDueDateFrench,
} from '@/lib/reminders';
import { soundManager } from '@/lib/sound';
import { usePlanitStore } from '@/lib/usePlanitStore';
import { getDefaultDueDateTime, isDueDateTimeInPast } from '@/lib/due-date-utils';
import { normalizeTaskStatus } from '@/lib/constants';
import { mergeNotificationsById } from '@/lib/notifications-helper';
import { useRealtimeEvents } from '@/lib/use-realtime-events';

export interface HomeWorkspaceProps {
  initialSession: InitialAuthSession | null;
}

export const HomeWorkspace: React.FC<HomeWorkspaceProps> = ({ initialSession }) => {
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
    saveCategory,
    deleteCategory,
    resetCategories,
    renameTag,
    deleteTag,
    clearStore,
  } = usePlanitStore();

  // Deterministic Authentication State Machine (hydrated cleanly from SSR)
  const [authPhase, setAuthPhase] = useState<AuthPhase>(() => getInitialAuthPhase(initialSession));
  const [explicitSessionUser, setExplicitSessionUser] = useState<SessionUserSnapshot | null>(
    () => initialSession?.user ?? null
  );
  const { data: hookSession } = useSession();
  const isSigningOutRef = useRef<boolean>(false);

  const sessionUser: SessionUserSnapshot | null = useMemo(() => {
    if (authPhase === 'signing_out' || authPhase === 'unauthenticated') {
      return null;
    }
    if (hookSession?.user) {
      return hookSession.user as unknown as SessionUserSnapshot;
    }
    return explicitSessionUser;
  }, [authPhase, hookSession?.user, explicitSessionUser]);

  const effectiveAuthPhase: AuthPhase = useMemo(() => {
    if (authPhase === 'checking' && hookSession?.user) {
      return 'authenticated';
    }
    return authPhase;
  }, [authPhase, hookSession?.user]);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskModalMode, setTaskModalMode] = useState<'view' | 'edit'>('view');
  const [defaultDateForModal, setDefaultDateForModal] = useState<string | undefined>(undefined);
  const [activeReminderTask, setActiveReminderTask] = useState<Task | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isM365ModalOpen, setIsM365ModalOpen] = useState<boolean>(false);
  const [isPostgresModalOpen, setIsPostgresModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCategoryTagModalOpen, setIsCategoryTagModalOpen] = useState<boolean>(false);
  const [categoryTagModalInitialTab, setCategoryTagModalInitialTab] = useState<'categories' | 'tags'>('categories');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Executive Report & Committee PDF Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalType, setReportModalType] = useState<ReportType>('executive_board');
  const [reportModalDepartment, setReportModalDepartment] = useState<'Tous' | Department>('Tous');
  const [reviewDossiers, setReviewDossiers] = useState<ReviewDossier[]>([]);

  // User & Team State (RBAC)
  const [selectedFallbackUser, setSelectedFallbackUser] = useState<User | null>(null);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);

  // Initial client session verification ONLY when SSR found no active session
  useEffect(() => {
    if (effectiveAuthPhase !== 'checking' || isSigningOutRef.current) return;

    let isCancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!isCancelled && !isSigningOutRef.current) {
        setAuthPhase((prev) =>
          resolveSessionTransition(prev, { type: 'CLIENT_CHECK_RESOLVED_NONE' })
        );
      }
    }, 900);

    getSession()
      .then((res) => {
        if (isCancelled || isSigningOutRef.current) return;
        if (res?.data?.user) {
          const resolvedUser = res.data.user as unknown as SessionUserSnapshot;
          setExplicitSessionUser(resolvedUser);
          setAuthPhase((prev) =>
            resolveSessionTransition(prev, { type: 'CLIENT_CHECK_RESOLVED_AUTH' })
          );
        } else {
          setAuthPhase((prev) =>
            resolveSessionTransition(prev, { type: 'CLIENT_CHECK_RESOLVED_NONE' })
          );
        }
      })
      .catch(() => {
        if (!isCancelled && !isSigningOutRef.current) {
          setAuthPhase((prev) =>
            resolveSessionTransition(prev, { type: 'CLIENT_CHECK_RESOLVED_NONE' })
          );
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [effectiveAuthPhase]);

  useEffect(() => {
    const hydrateTimer = setTimeout(() => {
      setReviewDossiers(getStoredDossiers());
    }, 0);
    const handleStorage = () => {
      setReviewDossiers(getStoredDossiers());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('planit_dossiers_change', handleStorage);
    return () => {
      clearTimeout(hydrateTimer);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('planit_dossiers_change', handleStorage);
    };
  }, []);

  const handleOpenReportModal = useCallback(
    (type: ReportType = 'executive_board', dept: 'Tous' | Department = 'Tous') => {
      setReviewDossiers(getStoredDossiers());
      setReportModalType(type);
      setReportModalDepartment(dept);
      setIsReportModalOpen(true);
    },
    []
  );

  const handleOpenCategoryTagManager = useCallback((initialTab: 'categories' | 'tags' = 'categories') => {
    setCategoryTagModalInitialTab(initialTab);
    setIsCategoryTagModalOpen(true);
  }, []);

  // Close all floating modals and dialogs
  const closeAllModals = useCallback(() => {
    setIsNotificationsOpen(false);
    setIsTaskModalOpen(false);
    setActiveReminderTask(null);
    setIsAIModalOpen(false);
    setIsExportModalOpen(false);
    setIsM365ModalOpen(false);
    setIsPostgresModalOpen(false);
    setIsAuthModalOpen(false);
    setIsCategoryTagModalOpen(false);
    setIsReportModalOpen(false);
  }, []);

  // Function to refresh users list from API
  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.users && Array.isArray(data.users)) {
        setTeamUsers(data.users);
      }
    } catch (err) {
      console.warn('Notice: Users database synchronization deferred:', err);
    }
  }, []);

  // Centralized Auth Success handler (no window.location.reload())
  const handleAuthSuccess = useCallback(
    (user?: any) => {
      isSigningOutRef.current = false;
      setSelectedFallbackUser(null);

      if (user) {
        const snapshot = user as SessionUserSnapshot;
        setExplicitSessionUser(snapshot);
        if (snapshot.role !== 'admin' && currentView === 'admin') {
          setCurrentView('list');
        }
      }

      setAuthPhase((prev) => resolveSessionTransition(prev, { type: 'AUTH_SUCCESS' }));
      setReviewDossiers(getStoredDossiers());

      getSession()
        .then((res) => {
          if (!isSigningOutRef.current && res?.data?.user) {
            const fullUser = res.data.user as unknown as SessionUserSnapshot;
            setExplicitSessionUser(fullUser);
            if (fullUser.role !== 'admin') {
              setCurrentView('list');
            }
          }
        })
        .catch(() => {});

      refreshUsers();
    },
    [currentView, refreshUsers, setCurrentView]
  );

  // Centralized 1-Click Flash-Free Sign-Out Transition
  const handleSignOut = useCallback(async () => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    // 1. Immediately raise opaque transition curtain before mutating any state
    setAuthPhase((prev) => resolveSessionTransition(prev, { type: 'START_SIGN_OUT' }));

    // 2. Purge client UI state, stores, and tokens behind the opaque veil
    closeAllModals();
    setCurrentView('list');
    clearStore();
    setTeamUsers([]);
    setSelectedFallbackUser(null);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('planit_auth_token');
        localStorage.removeItem('better-auth.session_token');
      } catch {}
    }

    // 3. Execute server sign-out cleanly once alongside a minimum veil duration
    const performServerSignOut = async () => {
      try {
        const res = await authClient.signOut();
        if (!res?.error) return;
      } catch (err) {
        console.warn('authClient.signOut error:', err);
      }
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).catch(() => {});
    };

    await Promise.allSettled([
      performServerSignOut(),
      new Promise((resolve) => setTimeout(resolve, 360)),
    ]);

    // 4. Finalize transition directly into AuthGate (zero workspace flash, no RSC Flight abort)
    setExplicitSessionUser(null);
    setAuthPhase((prev) => resolveSessionTransition(prev, { type: 'FINISH_SIGN_OUT' }));
    isSigningOutRef.current = false;
  }, [clearStore, closeAllModals, setCurrentView]);

  // Derived active user
  const currentUser: User | null = useMemo(() => {
    if (sessionUser) {
      return mapSessionUserToDomainUser(sessionUser);
    }
    return selectedFallbackUser;
  }, [sessionUser, selectedFallbackUser]);

  // Render-time View Mode guard (prevents 1-frame AdminView flash on account switch)
  const effectiveView = useMemo(
    () => getEffectiveViewMode(currentView, currentUser?.role),
    [currentView, currentUser?.role]
  );

  useEffect(() => {
    if (currentView === 'admin' && currentUser?.role !== 'admin') {
      setCurrentView('list');
    }
  }, [currentView, currentUser?.role, setCurrentView]);

  // Load tasks and team users strictly when user is authenticated
  const authenticatedUserId = effectiveAuthPhase === 'authenticated' ? sessionUser?.id : undefined;

  useEffect(() => {
    if (!isMounted || !authenticatedUserId) return;

    let isCancelled = false;

    const loadRemoteData = async () => {
      try {
        const [usersRes, tasksRes, notifsRes] = await Promise.all([
          fetch('/api/users').catch(() => null),
          fetch('/api/tasks').catch(() => null),
          fetch('/api/notifications').catch(() => null),
        ]);

        if (isCancelled) return;

        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json().catch(() => null);
          if (usersData?.users && Array.isArray(usersData.users)) {
            setTeamUsers(usersData.users);
          }
        }

        if (tasksRes && tasksRes.ok) {
          const tasksData = await tasksRes.json().catch(() => null);
          if (tasksData?.tasks && Array.isArray(tasksData.tasks)) {
            setTasks(tasksData.tasks);
          }
        }

        if (notifsRes && notifsRes.ok) {
          const notifsData = await notifsRes.json().catch(() => null);
          if (notifsData?.notifications && Array.isArray(notifsData.notifications)) {
            setNotifications((prev) =>
              mergeNotificationsById(prev, notifsData.notifications as TaskNotification[])
            );
          }
        }
      } catch (err) {
        console.warn('Notice: Remote database synchronization deferred:', err);
      }
    };

    loadRemoteData();

    return () => {
      isCancelled = true;
    };
  }, [isMounted, authenticatedUserId, setTasks, setNotifications]);

  // Real-time SSE listener for task assignments, reassignments, completions & live updates
  useRealtimeEvents({
    enabled: Boolean(authenticatedUserId && effectiveAuthPhase === 'authenticated'),
    currentUserId: currentUser?.id,
    currentUserRole: currentUser?.role,
    enableSounds: soundEnabled,
    onEvent: (event) => {
      if (!currentUser) return;

      if (
        event.type === 'TASK_ASSIGNED' ||
        event.type === 'TASK_COMPLETED' ||
        event.type === 'TASK_UPDATED'
      ) {
        const incomingTask = event.payload?.task as Task | undefined;
        if (incomingTask?.id) {
          setTasks((prev) => {
            const exists = prev.some((t) => t.id === incomingTask.id);
            const canView = canUserViewTask(incomingTask, currentUser);
            if (!canView) {
              return exists ? prev.filter((t) => t.id !== incomingTask.id) : prev;
            }
            if (exists) {
              return prev.map((t) => (t.id === incomingTask.id ? incomingTask : t));
            }
            return [incomingTask, ...prev];
          });
        }
      }

      if (event.type === 'TASK_DELETED') {
        const deletedTaskId = event.targetId || event.payload?.taskId;
        if (deletedTaskId) {
          setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
        }
      }

      if (
        (event.type === 'TASK_ASSIGNED' || event.type === 'TASK_COMPLETED') &&
        event.targetUserId === currentUser.id
      ) {
        const incomingNotif = event.payload?.notification as TaskNotification | undefined;
        if (incomingNotif?.id) {
          setNotifications((prev) => mergeNotificationsById(prev, [incomingNotif]));
        }

        if (event.actor?.id !== currentUser.id) {
          const browserTitle =
            event.type === 'TASK_ASSIGNED'
              ? `📌 Tâche assignée : ${incomingNotif?.taskTitle || 'Nouvelle tâche'}`
              : `✅ Tâche terminée : ${incomingNotif?.taskTitle || 'Tâche finalisée'}`;
          sendBrowserNotification(browserTitle, {
            body: event.message || incomingNotif?.message || '',
            tag: incomingNotif?.id || event.id,
          });
        }
      }
    },
  });

  // Update sound manager & permissions on change after mount
  useEffect(() => {
    if (isMounted) {
      soundManager.setEnabled(soundEnabled);
      requestNotificationPermission();
    }
  }, [soundEnabled, isMounted]);

  // Database persistence helpers
  const persistTaskToDb = useCallback(
    async (task: Task) => {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.task?.id) {
            setTasks((prev) =>
              prev.map((t) => (t.id === data.task.id ? (data.task as Task) : t))
            );
          }
        }
      } catch (err) {
        console.warn('Notice: Task offline persist deferred:', err);
      }
    },
    [setTasks]
  );

  const deleteTaskFromDb = useCallback(async (taskId: string) => {
    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Notice: Task deletion offline deferred:', err);
    }
  }, []);

  const saveTasks = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, [setTasks]);

  const saveNotifications = useCallback((updatedNotifs: TaskNotification[]) => {
    setNotifications(updatedNotifs);
  }, [setNotifications]);

  const handleToggleSound = () => {
    const newSound = !soundEnabled;
    setSoundEnabled(newSound);
    soundManager.setEnabled(newSound);
  };

  const handleViewChange = (view: ViewMode) => {
    closeAllModals();
    setCurrentView(getEffectiveViewMode(view, currentUser?.role));
  };

  // Automatic Reminder Background Evaluation Engine (Every 10 seconds)
  useEffect(() => {
    if (!isMounted || effectiveAuthPhase !== 'authenticated' || tasks.length === 0) return;

    const checkReminders = () => {
      const now = Date.now();
      const { triggeredTasks, newNotifications } = evaluateReminders(tasks, now);

      if (triggeredTasks.length > 0) {
        soundManager.playReminderChime();

        const firstTask = triggeredTasks[0];
        const dueFormatted = formatDueDateFrench(firstTask.dueDate, firstTask.dueTime);
        sendBrowserNotification(`⏰ Rappel Planit: ${firstTask.title}`, {
          body: `Échéance : ${dueFormatted || 'Non spécifiée'}.`,
        });

        setActiveReminderTask(firstTask);

        const triggeredIds = new Set(triggeredTasks.map((t) => t.id));
        const updatedTasks = tasks.map((t) => {
          if (triggeredIds.has(t.id)) {
            const updated = { ...t, reminderTriggered: true, reminderTriggeredAt: new Date(now).toISOString() };
            persistTaskToDb(updated);
            return updated;
          }
          return t;
        });
        saveTasks(updatedTasks);

        if (newNotifications.length > 0) {
          saveNotifications([...newNotifications, ...notifications]);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [isMounted, effectiveAuthPhase, tasks, notifications, saveTasks, saveNotifications, persistTaskToDb]);

  // Open Task Modal
  const handleOpenTaskModal = (task?: Task | null, defaultDate?: string, mode?: 'view' | 'edit') => {
    setEditingTask(task || null);
    setDefaultDateForModal(defaultDate);
    setTaskModalMode(mode || (task ? 'view' : 'edit'));
    setIsTaskModalOpen(true);
  };

  // Save Task
  const handleSaveTask = (taskPayload: Partial<Task>) => {
    const nowIso = new Date().toISOString();

    if (taskPayload.id) {
      const existing = tasks.find((t) => t.id === taskPayload.id);
      if (existing && !canUserEditTask(existing, currentUser)) {
        soundManager.playClickSound();
        sendBrowserNotification('Action non autorisée', {
          body: "Vous n'avez pas les droits pour modifier cette tâche.",
        });
        return;
      }

      if (currentUser?.role === 'admin' && existing) {
        const isSomeoneElses =
          (existing.creatorId && existing.creatorId !== currentUser.id) ||
          (existing.assigneeId && existing.assigneeId !== currentUser.id);

        if (isSomeoneElses) {
          const targetId =
            existing.assigneeId && existing.assigneeId !== currentUser.id
              ? existing.assigneeId
              : existing.creatorId;

          if (targetId) {
            let detail = `L'administrateur ${currentUser.name} a mis à jour votre tâche « ${taskPayload.title || existing.title} ».`;
            if (taskPayload.completed !== undefined && taskPayload.completed !== existing.completed) {
              detail = `L'administrateur ${currentUser.name} a ${taskPayload.completed ? 'validé' : 'réouvert'} votre tâche « ${existing.title} ».`;
            } else if (taskPayload.dueDate && taskPayload.dueDate !== existing.dueDate) {
              detail = `L'administrateur ${currentUser.name} a modifié l'échéance de votre tâche « ${existing.title} » au ${taskPayload.dueDate}.`;
            }

            const notif = buildAdminActionNotification(
              taskPayload.completed ? 'admin_completed' : 'admin_update',
              { id: existing.id, title: taskPayload.title || existing.title, dueDate: taskPayload.dueDate || existing.dueDate },
              currentUser,
              targetId,
              detail
            );
            saveNotifications([notif, ...notifications]);
          }
        }
      }

          let updatedTaskObj: Task | null = null;
      const updated = tasks.map((t) => {
        if (t.id === taskPayload.id) {
          const mergedStatus = normalizeTaskStatus(
            taskPayload.status ?? t.status,
            taskPayload.completed !== undefined
              ? Boolean(taskPayload.completed)
              : taskPayload.status === 'completed'
              ? true
              : taskPayload.status !== undefined
              ? false
              : t.completed
          );
          const mergedCompleted = mergedStatus === 'completed';
          updatedTaskObj = {
            ...t,
            ...taskPayload,
            status: mergedStatus,
            completed: mergedCompleted,
            completedAt: mergedCompleted ? t.completedAt || nowIso : undefined,
            updatedAt: nowIso,
          } as Task;
          return updatedTaskObj;
        }
        return t;
      });
      if (updatedTaskObj) {
        persistTaskToDb(updatedTaskObj);
      }
      saveTasks(updated);
    } else {
      const defaultDue = getDefaultDueDateTime();
      const finalDueDate = taskPayload.dueDate || defaultDue.dueDate;
      const finalDueTime = taskPayload.dueTime !== undefined ? taskPayload.dueTime : defaultDue.dueTime;

      if (isDueDateTimeInPast(finalDueDate, finalDueTime)) {
        soundManager.playClickSound();
        sendBrowserNotification("Erreur d'échéance", {
          body: "L'échéance d'une nouvelle tâche ne peut pas être fixée dans le passé.",
        });
        return;
      }

      const initialStatus = normalizeTaskStatus(taskPayload.status, Boolean(taskPayload.completed));
      const newTask: Task = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        title: taskPayload.title || 'Nouvelle tâche',
        description: taskPayload.description || '',
        dueDate: finalDueDate,
        dueTime: finalDueTime,
        priority: taskPayload.priority || 'medium',
        category: taskPayload.category || 'fiscalite',
        completed: initialStatus === 'completed',
        completedAt: initialStatus === 'completed' ? nowIso : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        creatorId: currentUser?.id,
        creatorName: currentUser?.name,
        assigneeId: taskPayload.assigneeId,
        assigneeName: taskPayload.assigneeName,
        assigneeAvatar: taskPayload.assigneeAvatar,
        reminderMinutesBefore:
          typeof taskPayload.reminderMinutesBefore === 'number'
            ? taskPayload.reminderMinutesBefore
            : 15,
        reminderTriggered: false,
        recurrence: taskPayload.recurrence || 'none',
        tags: taskPayload.tags || [],
        subtasks: taskPayload.subtasks || [],
        status: initialStatus,
      };
      persistTaskToDb(newTask);
      saveTasks([newTask, ...tasks]);
    }
  };

  // Unified Task Status Transition Handler (List, Kanban, TaskModal, Checkbox)
  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const normalizedNext = normalizeTaskStatus(newStatus, newStatus === 'completed');
    const isCompletionTransition =
      normalizedNext === 'completed' || targetTask.completed || targetTask.status === 'completed';

    const hasPermission = isCompletionTransition
      ? canUserCompleteTask(targetTask, currentUser)
      : canUserEditTask(targetTask, currentUser);

    if (!hasPermission) {
      soundManager.playClickSound();
      sendBrowserNotification('Action non autorisée', {
        body: "Vous n'avez pas les droits pour modifier le statut de cette tâche.",
      });
      return;
    }

    if (currentUser?.role === 'admin' && isCompletionTransition && normalizedNext !== targetTask.status) {
      const isSomeoneElses =
        (targetTask.creatorId && targetTask.creatorId !== currentUser.id) ||
        (targetTask.assigneeId && targetTask.assigneeId !== currentUser.id);

      if (isSomeoneElses) {
        const targetId =
          targetTask.assigneeId && targetTask.assigneeId !== currentUser.id
            ? targetTask.assigneeId
            : targetTask.creatorId;

        if (targetId && targetId !== targetTask.creatorId) {
          const nextCompletedState = normalizedNext === 'completed';
          const notif = buildAdminActionNotification(
            nextCompletedState ? 'admin_completed' : 'admin_update',
            targetTask,
            currentUser,
            targetId,
            `L'administrateur ${currentUser.name} a ${nextCompletedState ? 'validé et marqué comme terminée' : 'réouvert'} votre tâche « ${targetTask.title} ».`
          );
          saveNotifications([notif, ...notifications]);
        }
      }
    }

    const nowIso = new Date().toISOString();
    const isCompleted = normalizedNext === 'completed';
    let newTaskToSpawn: Task | null = null;
    let targetUpdatedTask: Task | null = null;

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        if (!t.completed && isCompleted && t.recurrence && t.recurrence !== 'none') {
          const nextDate = getNextRecurrenceDate(t.dueDate, t.recurrence);
          newTaskToSpawn = {
            ...t,
            id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            dueDate: nextDate,
            status: 'todo',
            completed: false,
            completedAt: undefined,
            reminderTriggered: false,
            createdAt: nowIso,
            updatedAt: nowIso,
            subtasks: t.subtasks ? t.subtasks.map((st) => ({ ...st, completed: false })) : [],
          };
        }

        targetUpdatedTask = {
          ...t,
          status: normalizedNext,
          completed: isCompleted,
          completedAt: isCompleted ? t.completedAt || nowIso : undefined,
          updatedAt: nowIso,
        };
        return targetUpdatedTask;
      }
      return t;
    });

    if (targetUpdatedTask) {
      persistTaskToDb(targetUpdatedTask);
    }
    if (newTaskToSpawn) {
      persistTaskToDb(newTaskToSpawn);
      saveTasks([newTaskToSpawn, ...updated]);
    } else {
      saveTasks(updated);
    }
  };

  // Toggle Task Completion (delegates to unified status handler)
  const handleToggleComplete = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;
    handleUpdateTaskStatus(taskId, targetTask.completed ? 'todo' : 'completed');
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    if (!canUserDeleteTask(targetTask, currentUser)) {
      soundManager.playClickSound();
      sendBrowserNotification('Action non autorisée', {
        body: "Seul le créateur ou un administrateur peut supprimer cette tâche.",
      });
      return;
    }

    if (currentUser?.role === 'admin') {
      const isSomeoneElses =
        (targetTask.creatorId && targetTask.creatorId !== currentUser.id) ||
        (targetTask.assigneeId && targetTask.assigneeId !== currentUser.id);

      if (isSomeoneElses) {
        const targetId =
          targetTask.assigneeId && targetTask.assigneeId !== currentUser.id
            ? targetTask.assigneeId
            : targetTask.creatorId;

        if (targetId) {
          const notif = buildAdminActionNotification(
            'admin_delete',
            targetTask,
            currentUser,
            targetId
          );
          saveNotifications([notif, ...notifications]);
        }
      }
    }

    deleteTaskFromDb(taskId);
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
    persistTaskToDb(dup);
    saveTasks([dup, ...tasks]);
    soundManager.playClickSound();
  };

  // Quick Inline Add
  const handleQuickAdd = (
    title: string,
    dueDate: string,
    dueTime?: string,
    category: string = 'fiscalite'
  ) => {
    const defaultDue = getDefaultDueDateTime();
    const finalDueDate = dueDate || defaultDue.dueDate;
    const finalDueTime = dueTime || (finalDueDate === defaultDue.dueDate ? defaultDue.dueTime : undefined);

    if (isDueDateTimeInPast(finalDueDate, finalDueTime)) {
      soundManager.playClickSound();
      sendBrowserNotification("Erreur d'échéance", {
        body: "L'échéance d'une nouvelle tâche ne peut pas être fixée dans le passé.",
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newTask: Task = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title,
      description: '',
      dueDate: finalDueDate,
      dueTime: finalDueTime,
      priority: 'medium',
      category,
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      creatorId: currentUser?.id,
      creatorName: currentUser?.name,
      reminderMinutesBefore: 15,
      reminderTriggered: false,
      recurrence: 'none',
      tags: [],
      subtasks: [],
      status: 'todo',
    };
    persistTaskToDb(newTask);
    saveTasks([newTask, ...tasks]);
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    soundManager.playClickSound();
    let targetUpdatedTask: Task | null = null;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const subtasks = t.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        targetUpdatedTask = { ...t, subtasks };
        return targetUpdatedTask;
      }
      return t;
    });
    if (targetUpdatedTask) {
      persistTaskToDb(targetUpdatedTask);
    }
    saveTasks(updated);
  };

  // Postpone Task
  const handlePostponeTask = (taskId: string, days: number = 1) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let targetUpdatedTask: Task | null = null;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        let baseDate: Date;
        if (t.dueDate < todayStr) {
          baseDate = new Date(today);
        } else {
          const [y, m, d] = t.dueDate.split('-').map(Number);
          baseDate = new Date(y, m - 1, d);
        }
        baseDate.setDate(baseDate.getDate() + days);
        const yyyy = baseDate.getFullYear();
        const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
        const dd = String(baseDate.getDate()).padStart(2, '0');

        targetUpdatedTask = {
          ...t,
          dueDate: `${yyyy}-${mm}-${dd}`,
          snoozedUntil: undefined,
          reminderTriggered: false,
          reminderDismissed: false,
          updatedAt: new Date().toISOString(),
        };
        return targetUpdatedTask;
      }
      return t;
    });
    if (targetUpdatedTask) {
      persistTaskToDb(targetUpdatedTask);
    }
    saveTasks(updated);
    soundManager.playClickSound();
  };

  // Reschedule to Today
  const handleRescheduleToToday = (taskId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let targetUpdatedTask: Task | null = null;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        targetUpdatedTask = {
          ...t,
          dueDate: todayStr,
          snoozedUntil: undefined,
          reminderTriggered: false,
          reminderDismissed: false,
          updatedAt: new Date().toISOString(),
        };
        return targetUpdatedTask;
      }
      return t;
    });
    if (targetUpdatedTask) {
      persistTaskToDb(targetUpdatedTask);
    }
    saveTasks(updated);
    soundManager.playClickSound();
  };

  // Snooze Reminder
  const handleSnoozeReminder = (taskId: string, minutes: number) => {
    const snoozeDate = new Date(Date.now() + minutes * 60 * 1000);
    let targetUpdatedTask: Task | null = null;

    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        targetUpdatedTask = {
          ...t,
          snoozedUntil: snoozeDate.toISOString(),
          reminderTriggered: false,
          reminderDismissed: false,
          updatedAt: new Date().toISOString(),
        };
        return targetUpdatedTask;
      }
      return t;
    });

    if (targetUpdatedTask) {
      persistTaskToDb(targetUpdatedTask);
    }
    saveTasks(updated);
    setActiveReminderTask(null);
    soundManager.playClickSound();
  };

  const handleSnoozeReminderTomorrow = (taskId: string) => {
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    let targetUpdatedTask: Task | null = null;
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        targetUpdatedTask = {
          ...t,
          snoozedUntil: tomorrowMorning.toISOString(),
          reminderTriggered: false,
          reminderDismissed: false,
          updatedAt: new Date().toISOString(),
        };
        return targetUpdatedTask;
      }
      return t;
    });

    if (targetUpdatedTask) {
      persistTaskToDb(targetUpdatedTask);
    }
    saveTasks(updated);
    setActiveReminderTask(null);
    soundManager.playClickSound();
  };

  // Notifications clear / read (synced with PostgreSQL)
  const handleMarkNotificationRead = (notifId: string) => {
    const updated = notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    saveNotifications(updated);
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notifId, read: true }),
    }).catch(() => {});
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true, read: true }),
    }).catch(() => {});
  };

  const handleClearAllNotifications = () => {
    saveNotifications([]);
    fetch('/api/notifications', {
      method: 'DELETE',
    }).catch(() => {});
  };

  const handleSelectTaskFromNotification = (taskId: string) => {
    const matched = tasks.find((t) => t.id === taskId);
    if (matched) {
      handleOpenTaskModal(matched);
    }
  };

  // Strict RBAC computed data
  const visibleTasks = useMemo(() => {
    return filterTasksForUser(tasks, currentUser);
  }, [tasks, currentUser]);

  const visibleTaskIds = useMemo(() => new Set(visibleTasks.map((t) => t.id)), [visibleTasks]);

  const userNotifications = useMemo(() => {
    return filterNotificationsForUser(notifications, currentUser, visibleTaskIds);
  }, [notifications, currentUser, visibleTaskIds]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const overdueTasks = useMemo(() => visibleTasks.filter((t) => isTaskOverdue(t)), [visibleTasks]);
  const dueTodayTasks = useMemo(
    () => visibleTasks.filter((t) => t.dueDate === todayStr && !t.completed),
    [visibleTasks, todayStr]
  );
  const unreadNotificationsCount = useMemo(
    () => userNotifications.filter((n) => !n.read).length,
    [userNotifications]
  );
  const activeRemindersCount = useMemo(
    () => visibleTasks.filter((t) => !t.completed && t.reminderMinutesBefore >= 0).length,
    [visibleTasks]
  );

  // 1. Opaque Sign-Out Curtain (zero emptied dashboard flash)
  if (effectiveAuthPhase === 'signing_out') {
    return <AuthTransitionCurtain mode="signing_out" />;
  }

  // 2. Smooth Startup Checking Curtain (only when SSR had no cookie session)
  if (effectiveAuthPhase === 'checking') {
    return <AuthTransitionCurtain mode="checking" />;
  }

  // 3. Confidentiality Wall when explicitly unauthenticated
  if (effectiveAuthPhase === 'unauthenticated' || !sessionUser) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  const activeModal = isReportModalOpen
    ? 'report'
    : isCategoryTagModalOpen
    ? 'categories'
    : isM365ModalOpen
    ? 'm365'
    : isAIModalOpen
    ? 'ai'
    : isExportModalOpen
    ? 'export'
    : isPostgresModalOpen
    ? 'postgres'
    : null;

  return (
    <div className="relative min-h-screen bg-[#03140E] glass-canvas flex flex-col text-slate-100 selection:bg-emerald-500 selection:text-slate-950 pb-24 md:pb-12 overflow-x-clip">
      {/* Ambient Radial Glass Light Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-emerald-600/12 blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-teal-600/10 blur-[100px] pointer-events-none z-0" />

      {/* Ambient Dotted Glow Canvas Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <DottedGlowBackground
          className="pointer-events-none w-full h-full"
          gap={28}
          radius={1}
          color="rgba(16, 185, 129, 0.12)"
          glowColor="rgba(52, 211, 153, 0.35)"
          opacity={0.18}
          speedMin={0.2}
          speedMax={0.8}
        />
      </div>

      {/* Desktop and Tablet Left Sidebar */}
      <Sidebar
        currentView={effectiveView}
        onViewChange={handleViewChange}
        activeModal={activeModal}
        onOpenNewTaskModal={() => handleOpenTaskModal()}
        onOpenAIModal={() => {
          if (!currentUser) {
            setIsAuthModalOpen(true);
          } else {
            setIsAIModalOpen(true);
          }
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenM365Modal={() => setIsM365ModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen((prev) => !prev)}
        onOpenPostgresModal={
          currentUser?.role === 'admin' ? () => setIsPostgresModalOpen(true) : undefined
        }
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenCategoryTagManager={() => handleOpenCategoryTagManager('categories')}
        onOpenReportModal={() => handleOpenReportModal('executive_board')}
        currentUser={currentUser}
        unreadNotificationsCount={unreadNotificationsCount}
        activeRemindersCount={activeRemindersCount}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        pendingTasksCount={visibleTasks.filter((t) => !t.completed).length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Global Navigation Header for Mobile Devices */}
      <Header
        currentView={effectiveView}
        onViewChange={handleViewChange}
        onOpenNewTaskModal={() => handleOpenTaskModal()}
        onOpenAIModal={() => {
          if (!currentUser) {
            setIsAuthModalOpen(true);
          } else {
            setIsAIModalOpen(true);
          }
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenM365Modal={() => setIsM365ModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen((prev) => !prev)}
        onOpenPostgresModal={
          currentUser?.role === 'admin' ? () => setIsPostgresModalOpen(true) : undefined
        }
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenCategoryTagManager={() => handleOpenCategoryTagManager('categories')}
        onOpenReportModal={() => handleOpenReportModal('executive_board')}
        currentUser={currentUser}
        unreadNotificationsCount={unreadNotificationsCount}
        activeRemindersCount={activeRemindersCount}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        pendingTasksCount={visibleTasks.filter((t) => !t.completed).length}
      />

      {/* Main Content Area */}
      <div
        className={`relative z-10 flex flex-col flex-1 pt-14 md:pt-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-w-0 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 flex-1 w-full min-w-0">
          <OverdueReminderBanner
            overdueTasks={overdueTasks}
            dueTodayTasks={dueTodayTasks}
            onOpenTask={(task, mode) => handleOpenTaskModal(task, undefined, mode || 'view')}
            onCompleteTask={handleToggleComplete}
            onRescheduleToToday={handleRescheduleToToday}
            onPostponeTask={handlePostponeTask}
          />

          {effectiveView === 'list' && (
            <ListView
              tasks={visibleTasks}
              currentUser={currentUser}
              categories={categories}
              onOpenTaskModal={(task, mode) => handleOpenTaskModal(task, undefined, mode)}
              onToggleComplete={handleToggleComplete}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onDeleteTask={handleDeleteTask}
              onDuplicateTask={handleDuplicateTask}
              onQuickAdd={handleQuickAdd}
              onToggleSubtask={handleToggleSubtask}
              onPostponeTask={handlePostponeTask}
              onOpenCategoryTagManager={handleOpenCategoryTagManager}
            />
          )}

          {effectiveView === 'review' && (
            <CollaborativeReviewPlatform
              currentUser={currentUser}
              onOpenReportModal={(dept) => handleOpenReportModal('review_progress', dept || 'Tous')}
              isSidebarCollapsed={isSidebarCollapsed}
            />
          )}

          {effectiveView === 'calendar' && (
            <CalendarView
              tasks={visibleTasks}
              categories={categories}
              onOpenTaskModal={handleOpenTaskModal}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {effectiveView === 'kanban' && (
            <KanbanView
              tasks={visibleTasks}
              categories={categories}
              currentUser={currentUser}
              onOpenTaskModal={handleOpenTaskModal}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          )}

          {effectiveView === 'stats' && (
            <StatsView
              tasks={visibleTasks}
              categories={categories}
              onOpenTaskModal={handleOpenTaskModal}
              onOpenReportModal={() => handleOpenReportModal('executive_board')}
            />
          )}

          {effectiveView === 'admin' && currentUser?.role === 'admin' && (
            <AdminView
              currentUser={currentUser}
              tasks={tasks}
              categories={categories}
              teamUsers={teamUsers}
              onRefreshUsers={refreshUsers}
              onSelectUser={(user) => {
                setSelectedFallbackUser(user);
                soundManager.playClickSound();
              }}
              onTasksSynced={(syncedTasks) => {
                setTasks(syncedTasks);
              }}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onOpenCategoryTagManager={() => handleOpenCategoryTagManager('categories')}
              onSaveCategory={saveCategory}
              onDeleteCategory={deleteCategory}
              onResetDefaultCategories={resetCategories}
            />
          )}
        </main>

        {/* Modals & Dialogs */}
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSaveTask={handleSaveTask}
          initialTask={editingTask}
          initialMode={taskModalMode}
          onToggleComplete={handleToggleComplete}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onPostponeTask={handlePostponeTask}
          categories={categories}
          teamUsers={teamUsers}
          defaultDate={defaultDateForModal}
          onQuickCreateCategory={saveCategory}
          currentUser={currentUser}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <ActiveReminderModal
          task={activeReminderTask}
          onClose={() => setActiveReminderTask(null)}
          onComplete={(taskId) => {
            handleToggleComplete(taskId);
            setActiveReminderTask(null);
          }}
          onSnooze={handleSnoozeReminder}
          onSnoozeTomorrow={handleSnoozeReminderTomorrow}
          onPostponeDueDate={handlePostponeTask}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <NotificationDropdown
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={userNotifications}
          tasks={tasks}
          onMarkAsRead={handleMarkNotificationRead}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onClearAll={handleClearAllNotifications}
          onSelectTask={handleSelectTaskFromNotification}
        />

        <AIAssistantModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onAddTask={(parsed) => handleSaveTask(parsed)}
          existingTasks={tasks}
          categories={categories}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          tasks={tasks}
          onOpenM365Modal={() => setIsM365ModalOpen(true)}
          onOpenReportModal={() => handleOpenReportModal('executive_board')}
          onImportTasks={(imported) => {
            saveTasks(imported);
            fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(imported),
            }).catch(console.error);
          }}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <Microsoft365Modal
          isOpen={isM365ModalOpen}
          onClose={() => setIsM365ModalOpen(false)}
          tasks={tasks}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {isPostgresModalOpen && currentUser?.role === 'admin' && (
          <PostgresTeamModal
            isOpen={isPostgresModalOpen}
            onClose={() => setIsPostgresModalOpen(false)}
            currentUser={currentUser}
            onSelectUser={(u) => setSelectedFallbackUser(u)}
            tasks={tasks}
            onTasksSynced={(synced) => saveTasks(synced)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onViewChange={handleViewChange}
          onSignOut={handleSignOut}
          onAuthSuccess={handleAuthSuccess}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <CategoryTagManagerModal
          isOpen={isCategoryTagModalOpen}
          onClose={() => setIsCategoryTagModalOpen(false)}
          initialTab={categoryTagModalInitialTab}
          categories={categories}
          tasks={tasks}
          onSaveCategory={saveCategory}
          onDeleteCategory={deleteCategory}
          onResetDefaultCategories={resetCategories}
          onRenameTag={renameTag}
          onDeleteTag={deleteTag}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <ExecutiveReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          tasks={tasks}
          categories={categories}
          dossiers={reviewDossiers}
          currentUser={currentUser}
          initialType={reportModalType}
          initialDepartment={reportModalDepartment}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <ServiceWorkerRegister />
        <OfflineIndicator />
        <PWAFloatingInstallCard />
      </div>
    </div>
  );
};
