import { describe, it, expect, beforeEach, vi } from 'vitest';
import { realtimeHub, RealtimeEvent, ServerPresenceMember } from '@/lib/realtime-hub';
import { GET as getPresence, POST as postPresence, DELETE as deletePresence } from '@/app/api/review/presence/route';
import { POST as postEvents } from '@/app/api/events/route';
import { NextRequest } from 'next/server';

describe('Real-Time Collaboration SSE Hub & Presence Engine', () => {
  beforeEach(() => {
    realtimeHub.reset();
  });

  it('broadcasts real-time events to all active subscribers', () => {
    const capturedEvents: RealtimeEvent[] = [];

    const unsubscribe = realtimeHub.subscribe('sub-test-1', (event) => {
      capturedEvents.push(event);
    });

    expect(realtimeHub.getSubscriberCount()).toBe(1);

    const emitted = realtimeHub.broadcast({
      type: 'DOSSIER_SUBMITTED',
      actor: {
        id: 'usr-maker-1',
        name: 'Sarah Benali',
        department: 'Fiscalité',
        role: 'collaborateur',
      },
      targetId: 'dossier-fis-101',
      targetRef: 'DOS-2026-FIS-101',
      message: 'Le dossier DOS-2026-FIS-101 a été soumis pour revue.',
      payload: { priority: 'urgent' },
    });

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0].id).toBe(emitted.id);
    expect(capturedEvents[0].type).toBe('DOSSIER_SUBMITTED');
    expect(capturedEvents[0].actor.name).toBe('Sarah Benali');
    expect(capturedEvents[0].targetRef).toBe('DOS-2026-FIS-101');

    unsubscribe();
    expect(realtimeHub.getSubscriberCount()).toBe(0);

    // After unsubscribe, no further events should be delivered to that subscriber
    realtimeHub.broadcast({
      type: 'DOSSIER_VALIDATED',
      actor: { id: 'usr-checker-1', name: 'Julien Morel' },
      message: 'Validation',
    });

    expect(capturedEvents).toHaveLength(1);
  });

  it('tracks and updates server-side presence with editing and viewing statuses', () => {
    const member1: ServerPresenceMember = {
      userId: 'usr-claire',
      userName: 'Claire Delacroix',
      department: 'Juridique',
      role: 'Associée',
      dossierId: 'dossier-jur-002',
      status: 'editing',
      lastSeen: new Date().toISOString(),
    };

    const updatedList = realtimeHub.updatePresence(member1);

    expect(updatedList).toHaveLength(1);
    expect(updatedList[0].userId).toBe('usr-claire');
    expect(updatedList[0].status).toBe('editing');
    expect(updatedList[0].dossierId).toBe('dossier-jur-002');

    // Remove user
    const afterRemoval = realtimeHub.removePresence('usr-claire');
    expect(afterRemoval).toHaveLength(0);
    expect(realtimeHub.getActivePresence()).toHaveLength(0);
  });

  it('handles /api/review/presence POST and GET requests correctly', async () => {
    const reqPost = new NextRequest('http://localhost:3000/api/review/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr-api-tester',
        userName: 'Marc Dupuis',
        department: 'Comptabilité',
        role: 'Manager',
        dossierId: 'dossier-cpt-014',
        status: 'viewing',
      }),
    });

    const resPost = await postPresence(reqPost);
    expect(resPost.status).toBe(200);
    const postJson = JSON.parse(await resPost.text());
    expect(postJson.success).toBe(true);
    expect(postJson.currentMember.userName).toBe('Marc Dupuis');

    // Test GET
    const resGet = await getPresence();
    expect(resGet.status).toBe(200);
    const getJson = JSON.parse(await resGet.text());
    expect(getJson.total).toBeGreaterThanOrEqual(1);
    expect(getJson.members.some((m: any) => m.userId === 'usr-api-tester')).toBe(true);

    // Test DELETE
    const reqDelete = new NextRequest('http://localhost:3000/api/review/presence?userId=usr-api-tester', {
      method: 'DELETE',
    });
    const resDelete = await deletePresence(reqDelete);
    expect(resDelete.status).toBe(200);
    const deleteJson = JSON.parse(await resDelete.text());
    expect(deleteJson.success).toBe(true);
    expect(deleteJson.members.some((m: any) => m.userId === 'usr-api-tester')).toBe(false);
  });

  it('handles /api/events POST to broadcast custom collaborative alerts', async () => {
    let receivedEvent: RealtimeEvent | null = null;
    const unsub = realtimeHub.subscribe('test-listener', (e) => {
      receivedEvent = e;
    });

    const req = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'DOSSIER_VALIDATED',
        actor: {
          id: 'usr-partner',
          name: 'Antoine Lefebvre',
          role: 'Associé Fiscaliste',
        },
        targetId: 'dossier-fis-999',
        targetRef: 'DOS-2026-FIS-999',
        message: 'Dossier scellé et prêt pour transmission fiscale.',
      }),
    });

    const res = await postEvents(req);
    expect(res.status).toBe(200);
    const json = JSON.parse(await res.text());
    expect(json.success).toBe(true);
    expect(json.event.type).toBe('DOSSIER_VALIDATED');

    expect(receivedEvent).not.toBeNull();
    expect((receivedEvent as any)?.actor.name).toBe('Antoine Lefebvre');
    expect((receivedEvent as any)?.targetRef).toBe('DOS-2026-FIS-999');

    unsub();
  });
});
