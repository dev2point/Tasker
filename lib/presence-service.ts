import { Department, PresenceMember } from '@/types/review';

const PRESENCE_STORAGE_KEY = 'planit_presence_members_v1';
const BROADCAST_CHANNEL_NAME = 'planit_presence_channel';

// No sample or mock presence members by default
const INITIAL_PRESENCE: PresenceMember[] = [];

const LEGACY_MOCK_USER_IDS = new Set(['usr-claire', 'usr-marc', 'usr-antoine']);

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported', e);
  }
}

export function getActivePresence(): PresenceMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (!raw) return [];
    const members: PresenceMember[] = JSON.parse(raw);
    if (!Array.isArray(members)) return [];

    const now = Date.now();
    // Keep only real members active within 5 minutes, filtering out any legacy mock accounts
    const active = members.filter((m) => {
      if (LEGACY_MOCK_USER_IDS.has(m.userId)) return false;
      const diff = now - new Date(m.lastSeen).getTime();
      return diff < 5 * 60 * 1000;
    });

    if (active.length !== members.length) {
      localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(active));
    }

    return active;
  } catch {
    return [];
  }
}

export function pingPresence(
  user: { id: string; name: string; department?: string; role?: string },
  dossierId?: string,
  status: 'viewing' | 'editing' | 'idle' = 'viewing'
): PresenceMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const list = getActivePresence();
    const dept = (user.department as Department) || 'Fiscalité';
    const now = new Date().toISOString();

    const existingIndex = list.findIndex((m) => m.userId === user.id);
    const updatedMember: PresenceMember = {
      userId: user.id,
      userName: user.name,
      department: dept,
      role: user.role || 'Collaborateur',
      dossierId,
      status,
      lastSeen: now,
    };

    let updatedList: PresenceMember[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = updatedMember;
    } else {
      updatedList = [updatedMember, ...list];
    }

    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(updatedList));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'PRESENCE_UPDATE', members: updatedList });
    }
    window.dispatchEvent(new CustomEvent('planit_presence_change', { detail: updatedList }));

    return updatedList;
  } catch {
    return [];
  }
}

export function subscribePresence(callback: (members: PresenceMember[]) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (customEvt.detail) {
      callback(customEvt.detail);
    } else {
      callback(getActivePresence());
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data?.type === 'PRESENCE_UPDATE' && e.data?.members) {
      callback(e.data.members);
    }
  };

  window.addEventListener('planit_presence_change', handleCustom);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // Periodic heartbeat / check
  const interval = setInterval(() => {
    callback(getActivePresence());
  }, 10000);

  return () => {
    window.removeEventListener('planit_presence_change', handleCustom);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    clearInterval(interval);
  };
}
