import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PATCH as patchDossier,
  POST as postDossier,
  _setRuntimeDossiersForTesting,
  _getRuntimeDossiersForTesting,
} from '@/app/api/review/dossiers/route';
import { executeWorkflowTransition, togglePreventiveLock } from '@/lib/review-service';
import { realtimeHub, RealtimeEvent } from '@/lib/realtime-hub';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { ReviewDossier, WorkflowActor } from '@/types/review';

const notificationInsert = vi.hoisted(() => ({
  values: vi.fn((_values: unknown) => ({
    onConflictDoNothing: vi.fn(async () => undefined),
  })),
}));

const webPushDeliveryMock = vi.hoisted(() => ({
  enqueue: vi.fn(async (_notification: unknown) => ['delivery-1']),
  process: vi.fn(async (_options: unknown) => ({
    sent: 1,
    failed: 0,
    expired: 0,
    retried: 0,
  })),
}));

vi.mock('@/lib/web-push/delivery', () => ({
  enqueueWebPushDeliveries: webPushDeliveryMock.enqueue,
  processPendingWebPushDeliveries: webPushDeliveryMock.process,
}));

// Mock auth-server to simulate authenticated manager / checker
vi.mock('@/lib/auth-server', () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    id: 'usr-manager-1',
    name: 'Julien Morel',
    email: 'j.morel@cabinet.fr',
    role: 'manager',
    department: 'Fiscalité',
  })),
}));

vi.mock('@/lib/db/pg', () => ({
  getDrizzleDb: () => ({
    insert: () => ({ values: notificationInsert.values }),
  }),
  isDatabaseConfigured: () => true,
  ensureDatabaseTables: async () => ({ success: true, message: 'ok' }),
}));

describe('Piste 2 — Optimistic Concurrency Control (OCC) & Conflict Resolution (DT-REV-01)', () => {
  const mockMaker: WorkflowActor = {
    id: 'usr-collab-1',
    name: 'Sarah Benali',
    email: 's.benali@cabinet.fr',
    department: 'Fiscalité',
    role: 'collaborateur',
  };

  const mockChecker: WorkflowActor = {
    id: 'usr-manager-1',
    name: 'Julien Morel',
    email: 'j.morel@cabinet.fr',
    department: 'Fiscalité',
    role: 'manager',
  };

  const initialDossier: ReviewDossier = {
    id: 'dossier-occ-001',
    ref: 'DOS-2026-FIS-001',
    title: 'Audit Prix de Transfert & Rescrit Fiscal',
    clientName: 'Holding Pharma SA',
    clientSiret: '445 889 123 00045',
    department: 'Fiscalité',
    typology: 'Rescrit Fiscal & Structuration',
    priority: 'high',
    status: 'soumis',
    version: 1,
    maker: mockMaker,
    checker: mockChecker,
    lock: { isLocked: false },
    dataFields: [],
    textDocument: {
      documentId: 'doc-001',
      title: 'Conclusions Préliminaires',
      type: 'conclusions_fiscales',
      previousContent: 'Version initiale rédigée par le collaborateur.',
      currentContent: 'Version initiale rédigée par le collaborateur.',
    },
    interDepRequests: [],
    auditTrail: [
      {
        id: 'aud-001',
        timestamp: '2026-11-03T10:00:00.000Z',
        actorId: mockMaker.id,
        actorName: mockMaker.name,
        actorDepartment: mockMaker.department,
        actorRole: mockMaker.role,
        ipAddress: '192.168.1.10',
        action: 'soumission_n1',
        details: 'Dossier soumis pour validation',
      },
    ],
    createdAt: '2026-11-03T09:30:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    estimatedDeliverableDate: '2026-11-15',
  };

  beforeEach(() => {
    _setRuntimeDossiersForTesting([JSON.parse(JSON.stringify(initialDossier))]);
    realtimeHub.reset();
    notificationInsert.values.mockClear();
    webPushDeliveryMock.enqueue.mockClear();
    webPushDeliveryMock.process.mockClear();
  });

  it('persists and broadcasts a targeted notification when the dossier is submitted to its checker', async () => {
    const draftDossier: ReviewDossier = {
      ...initialDossier,
      status: 'brouillon',
      submittedAt: undefined,
      auditTrail: [],
    };
    _setRuntimeDossiersForTesting([JSON.parse(JSON.stringify(draftDossier))]);
    realtimeHub.reset();
    notificationInsert.values.mockClear();

    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({
      id: mockMaker.id,
      name: mockMaker.name,
      email: mockMaker.email,
      role: mockMaker.role,
      department: mockMaker.department,
    });

    const events: RealtimeEvent[] = [];
    const unsub = realtimeHub.subscribe('test-sub-notification', (event) => events.push(event));

    const req = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: draftDossier.id,
        expectedVersion: 1,
        updatedDossier: {
          ...draftDossier,
          status: 'soumis',
          submittedAt: '2026-11-23T10:00:00.000Z',
        },
      }),
    });

    const res = await patchDossier(req);
    unsub();

    expect(res.status).toBe(200);
    expect(notificationInsert.values).toHaveBeenCalledTimes(1);
    expect(notificationInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: mockChecker.id,
        actorId: mockMaker.id,
        taskId: draftDossier.id,
        type: 'assigned',
        read: false,
      })
    );
    await vi.waitFor(() => {
      expect(webPushDeliveryMock.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: mockChecker.id,
          taskId: draftDossier.id,
        })
      );
      expect(webPushDeliveryMock.process).toHaveBeenCalledWith({
        recipientId: mockChecker.id,
        limit: 5,
      });
    });

    const targeted = events.find((event) => event.type === 'TASK_ASSIGNED');
    expect(targeted?.targetUserId).toBe(mockChecker.id);
    expect(targeted?.payload?.notification?.targetUserId).toBe(mockChecker.id);
  });

  it('persists and broadcasts a targeted notification when corrections are requested from the maker', async () => {
    const reviewedDossier: ReviewDossier = {
      ...initialDossier,
      status: 'en_revision',
      version: 4,
    };
    _setRuntimeDossiersForTesting([JSON.parse(JSON.stringify(reviewedDossier))]);
    realtimeHub.reset();
    notificationInsert.values.mockClear();

    const events: RealtimeEvent[] = [];
    const unsub = realtimeHub.subscribe('test-correction-notification', (event) =>
      events.push(event)
    );

    const req = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: reviewedDossier.id,
        expectedVersion: reviewedDossier.version,
        updatedDossier: {
          ...reviewedDossier,
          status: 'demande_corrections',
          correctionNotes: 'Veuillez recalculer la quote-part de frais et charges.',
        },
      }),
    });

    const res = await patchDossier(req);
    unsub();

    expect(res.status).toBe(200);
    expect(notificationInsert.values).toHaveBeenCalledTimes(1);
    expect(notificationInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: mockMaker.id,
        actorId: mockChecker.id,
        taskId: reviewedDossier.id,
        type: 'assigned',
        read: false,
      })
    );
    await vi.waitFor(() => {
      expect(webPushDeliveryMock.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: mockMaker.id,
          taskId: reviewedDossier.id,
        })
      );
      expect(webPushDeliveryMock.process).toHaveBeenCalledWith({
        recipientId: mockMaker.id,
        limit: 5,
      });
    });

    const targeted = events.find((event) => event.type === 'TASK_ASSIGNED');
    expect(targeted?.targetUserId).toBe(mockMaker.id);
    expect(targeted?.payload?.notification?.targetUserId).toBe(mockMaker.id);
  });

  it('does not notify when the maker requesting corrections is the actor', async () => {
    const selfMadeDossier: ReviewDossier = {
      ...initialDossier,
      status: 'en_revision',
      version: 4,
      maker: mockChecker,
    };
    _setRuntimeDossiersForTesting([JSON.parse(JSON.stringify(selfMadeDossier))]);
    realtimeHub.reset();
    notificationInsert.values.mockClear();

    const events: RealtimeEvent[] = [];
    const unsub = realtimeHub.subscribe('test-correction-self-notification', (event) =>
      events.push(event)
    );

    const req = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: selfMadeDossier.id,
        expectedVersion: selfMadeDossier.version,
        updatedDossier: {
          ...selfMadeDossier,
          status: 'demande_corrections',
          correctionNotes: 'Consignes internes du superviseur.',
        },
      }),
    });

    const res = await patchDossier(req);
    unsub();

    expect(res.status).toBe(200);
    expect(notificationInsert.values).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === 'TASK_ASSIGNED')).toBe(false);
  });

  it('increments version monotonically on successful PATCH updates', async () => {
    const updated = {
      ...initialDossier,
      status: 'en_revision' as const,
      textDocument: {
        ...initialDossier.textDocument,
        currentContent: 'Premières observations du superviseur.',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: initialDossier.id,
        expectedVersion: 1,
        updatedDossier: updated,
      }),
    });

    const res = await patchDossier(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.version).toBe(2);
    expect(data.dossier.version).toBe(2);
    expect(data.dossier.status).toBe('en_revision');

    // Subsequent update with expectedVersion: 2 should reach version 3
    const req2 = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: initialDossier.id,
        expectedVersion: 2,
        updatedDossier: {
          ...data.dossier,
          status: 'valide' as const,
        },
      }),
    });

    const res2 = await patchDossier(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.version).toBe(3);
  });

  it('detects concurrent stale edits and returns HTTP 409 Conflict with server dossier', async () => {
    // 1. First collaborator updates the dossier to version 2
    const firstCollabUpdate = {
      ...initialDossier,
      status: 'en_revision' as const,
      textDocument: {
        ...initialDossier.textDocument,
        currentContent: 'Texte modifié par le premier relecteur.',
      },
    };

    const req1 = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: initialDossier.id,
        expectedVersion: 1,
        updatedDossier: firstCollabUpdate,
      }),
    });
    const res1 = await patchDossier(req1);
    expect(res1.status).toBe(200);

    // 2. Second collaborator had opened the dossier earlier (holding version 1)
    // and attempts to submit changes with expectedVersion: 1
    const secondCollabUpdate = {
      ...initialDossier,
      status: 'amendements' as const,
      textDocument: {
        ...initialDossier.textDocument,
        currentContent: 'Texte concurrent soumis sans avoir rechargé la v2.',
      },
    };

    const capturedEvents: RealtimeEvent[] = [];
    realtimeHub.subscribe('test-conflict-listener', (e) => capturedEvents.push(e));

    const req2 = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: initialDossier.id,
        expectedVersion: 1, // Stale! Server is now at 2
        updatedDossier: secondCollabUpdate,
      }),
    });

    const res2 = await patchDossier(req2);
    expect(res2.status).toBe(409);

    const conflictData = await res2.json();
    expect(conflictData.conflict).toBe(true);
    expect(conflictData.serverVersion).toBe(2);
    expect(conflictData.clientVersion).toBe(1);
    expect(conflictData.error).toContain('Conflit de concurrence détecté');
    expect(conflictData.serverDossier.textDocument.currentContent).toBe(
      'Texte modifié par le premier relecteur.'
    );

    // Ensure realtimeHub broadcasted DOSSIER_CONFLICT event
    const conflictEvent = capturedEvents.find((e) => e.type === 'DOSSIER_CONFLICT');
    expect(conflictEvent).toBeDefined();
    expect(conflictEvent?.targetRef).toBe(initialDossier.ref);
    expect(conflictEvent?.payload?.serverVersion).toBe(2);
    expect(conflictEvent?.payload?.clientVersion).toBe(1);
  });

  it('allows forced resolution override when force flag is set', async () => {
    // Current server version bumped to 2
    _setRuntimeDossiersForTesting([
      {
        ...initialDossier,
        version: 2,
        textDocument: {
          ...initialDossier.textDocument,
          currentContent: 'Modification précédente sur le serveur.',
        },
      },
    ]);

    // User chooses "Forcer l'écrasement" in the conflict modal
    const forcedUpdate = {
      ...initialDossier,
      version: 1,
      textDocument: {
        ...initialDossier.textDocument,
        currentContent: 'Texte prioritaire forcé par le superviseur.',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/review/dossiers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dossierId: initialDossier.id,
        expectedVersion: 1,
        updatedDossier: forcedUpdate,
        force: true, // User forces resolution
      }),
    });

    const res = await patchDossier(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.version).toBe(3); // Increments to 3
    expect(data.dossier.textDocument.currentContent).toBe('Texte prioritaire forcé par le superviseur.');
  });

  it('workflow state transition helper increments version automatically', () => {
    const res = executeWorkflowTransition(initialDossier, 'en_revision', mockChecker);
    expect(res.success).toBe(true);
    expect(res.dossier.version).toBe(2);
    expect(res.dossier.status).toBe('en_revision');

    const res2 = executeWorkflowTransition(res.dossier, 'valide', mockChecker);
    expect(res2.success).toBe(true);
    expect(res2.dossier.version).toBe(3);
    expect(res2.dossier.status).toBe('valide');
  });

  it('preventive lock helper increments version automatically', () => {
    const locked = togglePreventiveLock(initialDossier, mockChecker, true, 'Examen en cours');
    expect(locked.version).toBe(2);
    expect(locked.lock.isLocked).toBe(true);

    const unlocked = togglePreventiveLock(locked, mockChecker, false);
    expect(unlocked.version).toBe(3);
    expect(unlocked.lock.isLocked).toBe(false);
  });
});
