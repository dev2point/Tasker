export type RealtimeEventType =
  | 'CONNECTED'
  | 'HEARTBEAT'
  | 'DOSSIER_CREATED'
  | 'DOSSIER_SUBMITTED'
  | 'DOSSIER_REVIEW_STARTED'
  | 'DOSSIER_AMENDED'
  | 'DOSSIER_VALIDATED'
  | 'DOSSIER_REJECTED'
  | 'DOSSIER_ARCHIVED'
  | 'DOSSIER_LOCKED'
  | 'DOSSIER_UNLOCKED'
  | 'DOSSIER_CONFLICT'
  | 'PRESENCE_CHANGED'
  | 'TASK_UPDATED';

export interface RealtimeActor {
  id: string;
  name: string;
  department?: string;
  role?: string;
  email?: string;
}

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  timestamp: string;
  actor: RealtimeActor;
  targetId?: string;
  targetRef?: string;
  message: string;
  payload?: any;
}

export interface ServerPresenceMember {
  userId: string;
  userName: string;
  department: string;
  role: string;
  dossierId?: string;
  status: 'viewing' | 'editing' | 'idle';
  lastSeen: string;
}

type EventSubscriber = (event: RealtimeEvent) => void;

const NON_ALERT_EVENT_TYPES = new Set<string>(['CONNECTED', 'HEARTBEAT', 'PRESENCE_CHANGED']);

export function normalizeRealtimeEvent(
  raw: unknown,
  fallbackType?: RealtimeEventType
): RealtimeEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<RealtimeEvent>;
  const resolvedType = (candidate.type || fallbackType) as RealtimeEventType | undefined;
  if (!resolvedType || typeof resolvedType !== 'string') return null;

  const timestamp =
    typeof candidate.timestamp === 'string' && candidate.timestamp.trim()
      ? candidate.timestamp
      : new Date().toISOString();

  return {
    id:
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: resolvedType,
    timestamp,
    actor: candidate.actor || { id: 'system', name: 'Système' },
    targetId: candidate.targetId,
    targetRef: candidate.targetRef,
    message: typeof candidate.message === 'string' ? candidate.message : '',
    payload: candidate.payload,
  };
}

export function shouldSurfaceRealtimeAlert(event: Partial<RealtimeEvent> | null | undefined): boolean {
  if (!event || typeof event.type !== 'string' || !event.type.trim()) {
    return false;
  }
  if (NON_ALERT_EVENT_TYPES.has(event.type)) {
    return false;
  }
  return typeof event.message === 'string' && event.message.trim().length > 0;
}

export function formatRealtimeAlertType(type: unknown): string {
  if (typeof type !== 'string' || !type.trim()) {
    return 'NOTIFICATION';
  }
  return type.replace(/^DOSSIER_/, '').replace(/_/g, ' ').trim() || 'NOTIFICATION';
}

class RealtimeEventHub {
  private subscribers: Map<string, EventSubscriber> = new Map();
  private recentEvents: RealtimeEvent[] = [];
  private presenceMembers: Map<string, ServerPresenceMember> = new Map();
  private maxHistory = 50;

  constructor() {
    // Periodic cleanup of stale presence (older than 90 seconds)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.cleanupStalePresence();
      }, 30000);
    }
  }

  /**
   * Registers a client subscription to real-time events.
   * Returns an unsubscribe function.
   */
  public subscribe(subscriberId: string, callback: EventSubscriber): () => void {
    this.subscribers.set(subscriberId, callback);
    return () => {
      this.subscribers.delete(subscriberId);
    };
  }

  /**
   * Returns active subscriber count
   */
  public getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Broadcasts a real-time event to all connected subscribers.
   */
  public broadcast(
    eventData: Omit<RealtimeEvent, 'id' | 'timestamp'> & {
      id?: string;
      timestamp?: string;
    }
  ): RealtimeEvent {
    const event: RealtimeEvent = {
      id: eventData.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
      type: eventData.type,
      actor: eventData.actor,
      targetId: eventData.targetId,
      targetRef: eventData.targetRef,
      message: eventData.message,
      payload: eventData.payload,
    };

    // Store in ring buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxHistory) {
      this.recentEvents.shift();
    }

    // Dispatch to all subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.warn('Error notifying SSE subscriber:', err);
      }
    });

    return event;
  }

  /**
   * Retrieves recent events since a given timestamp or last N events
   */
  public getRecentEvents(sinceTimestamp?: string): RealtimeEvent[] {
    if (!sinceTimestamp) {
      return [...this.recentEvents];
    }
    const sinceTime = new Date(sinceTimestamp).getTime();
    return this.recentEvents.filter(
      (e) => new Date(e.timestamp).getTime() > sinceTime
    );
  }

  /**
   * Records or updates a member's server-side presence
   */
  public updatePresence(member: ServerPresenceMember): ServerPresenceMember[] {
    const now = new Date().toISOString();
    this.presenceMembers.set(member.userId, {
      ...member,
      lastSeen: now,
    });

    const activeList = this.getActivePresence();

    // Broadcast presence update event
    this.broadcast({
      type: 'PRESENCE_CHANGED',
      actor: {
        id: member.userId,
        name: member.userName,
        department: member.department,
        role: member.role,
      },
      targetId: member.dossierId,
      message: `${member.userName} est ${member.status === 'editing' ? 'en cours de modification' : 'en lecture'}${
        member.dossierId ? ` sur le dossier ${member.dossierId}` : ''
      }.`,
      payload: {
        members: activeList,
        updatedMember: member,
      },
    });

    return activeList;
  }

  /**
   * Removes a member from server-side presence (e.g. on disconnect or navigate away)
   */
  public removePresence(userId: string): ServerPresenceMember[] {
    const existing = this.presenceMembers.get(userId);
    this.presenceMembers.delete(userId);
    const activeList = this.getActivePresence();

    if (existing) {
      this.broadcast({
        type: 'PRESENCE_CHANGED',
        actor: {
          id: existing.userId,
          name: existing.userName,
          department: existing.department,
          role: existing.role,
        },
        targetId: existing.dossierId,
        message: `${existing.userName} a quitté la session collaborative.`,
        payload: {
          members: activeList,
          removedUserId: userId,
        },
      });
    }

    return activeList;
  }

  /**
   * Returns list of currently active members (active within last 90 seconds)
   */
  public getActivePresence(): ServerPresenceMember[] {
    const now = Date.now();
    const active: ServerPresenceMember[] = [];
    this.presenceMembers.forEach((member) => {
      const diff = now - new Date(member.lastSeen).getTime();
      if (diff < 90 * 1000) {
        active.push(member);
      }
    });
    return active;
  }

  /**
   * Cleans up stale presence entries
   */
  private cleanupStalePresence(): void {
    const now = Date.now();
    let hasChanges = false;
    this.presenceMembers.forEach((member, userId) => {
      const diff = now - new Date(member.lastSeen).getTime();
      if (diff >= 90 * 1000) {
        this.presenceMembers.delete(userId);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      const activeList = this.getActivePresence();
      this.broadcast({
        type: 'PRESENCE_CHANGED',
        actor: { id: 'system', name: 'Système' },
        message: 'Mise à jour des présences actives suite à expiration.',
        payload: { members: activeList },
      });
    }
  }

  /**
   * Reset for testing purposes
   */
  public reset(): void {
    this.subscribers.clear();
    this.recentEvents = [];
    this.presenceMembers.clear();
  }
}

// Global singleton for Next.js Node environment
const globalForRealtime = globalThis as unknown as {
  realtimeHubInstance?: RealtimeEventHub;
};

export const realtimeHub =
  globalForRealtime.realtimeHubInstance || new RealtimeEventHub();

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeHubInstance = realtimeHub;
}
