import { Department, PresenceMember } from '@/types/review';

const PRESENCE_STORAGE_KEY = 'planit_presence_members_v1';
const BROADCAST_CHANNEL_NAME = 'planit_presence_channel';

const INITIAL_PRESENCE: PresenceMember[] = [
  {
    userId: 'usr-claire',
    userName: 'Claire Bernard',
    department: 'Fiscalité',
    role: 'Manager Fiscalité',
    dossierId: 'dossier-fis-001',
    status: 'viewing',
    lastSeen: new Date().toISOString(),
  },
  {
    userId: 'usr-marc',
    userName: 'Marc Duval',
    department: 'Comptabilité',
    role: 'Manager Audit & Bilan',
    dossierId: 'dossier-cpt-014',
    status: 'editing',
    lastSeen: new Date().toISOString(),
  },
  {
    userId: 'usr-antoine',
    userName: 'Antoine Girard',
    department: 'Juridique',
    role: 'Associé Juridique & M&A',
    dossierId: 'dossier-jur-089',
    status: 'viewing',
    lastSeen: new Date().toISOString(),
  },
];

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported', e);
  }
}

export function getActivePresence(): PresenceMember[] {
  if (typeof window === 'undefined') return INITIAL_PRESENCE;
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(INITIAL_PRESENCE));
      return INITIAL_PRESENCE;
    }
    const members: PresenceMember[] = JSON.parse(raw);
    const now = Date.now();
    // Keep members active within 5 minutes or initial seed peers
    const active = members.filter((m) => {
      const diff = now - new Date(m.lastSeen).getTime();
      return diff < 5 * 60 * 1000 || m.userId.startsWith('usr-');
    });
    return active.length > 0 ? active : INITIAL_PRESENCE;
  } catch {
    return INITIAL_PRESENCE;
  }
}

export function pingPresence(
  user: { id: string; name: string; department?: string; role?: string },
  dossierId?: string,
  status: 'viewing' | 'editing' | 'idle' = 'viewing'
): PresenceMember[] {
  if (typeof window === 'undefined') return INITIAL_PRESENCE;
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
    return INITIAL_PRESENCE;
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
