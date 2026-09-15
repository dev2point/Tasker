import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActivePresence,
  pingPresence,
  subscribePresence,
} from '@/lib/presence-service';

describe('Real-Time Collaboration Presence Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retrieves default active presence when storage is empty', () => {
    const list = getActivePresence();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((m) => m.userName === 'Claire Bernard')).toBe(true);
  });

  it('updates current user status and timestamp upon ping', () => {
    const user = {
      id: 'usr-test-alice',
      name: 'Alice Dubois',
      department: 'Juridique',
      role: 'Associée M&A',
    };

    const updated = pingPresence(user, 'dossier-jur-089', 'editing');

    expect(updated.some((m) => m.userId === 'usr-test-alice')).toBe(true);
    const alice = updated.find((m) => m.userId === 'usr-test-alice')!;
    expect(alice.status).toBe('editing');
    expect(alice.dossierId).toBe('dossier-jur-089');
    expect(alice.department).toBe('Juridique');
  });

  it('allows subscription to presence events', () => {
    let capturedCount = 0;
    const unsubscribe = subscribePresence((members) => {
      capturedCount = members.length;
    });

    expect(typeof unsubscribe).toBe('function');

    pingPresence(
      { id: 'usr-event-tester', name: 'Tester', department: 'Fiscalité' },
      'dossier-fis-001',
      'viewing'
    );

    // Clean up subscription
    unsubscribe();
  });
});
