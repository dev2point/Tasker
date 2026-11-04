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
import { ReviewDossier, WorkflowActor } from '@/types/review';

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
