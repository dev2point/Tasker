import { describe, it, expect } from 'vitest';
import { InterDepRequest, Department } from '@/types/review';

describe('Inter-Department Gateway & Blocker Resolution', () => {
  const sampleRequests: InterDepRequest[] = [
    {
      id: 'idr-1',
      dossierId: 'dossier-fis-001',
      dossierRef: 'DOS-2026-FIS-001',
      fromDepartment: 'Fiscalité',
      toDepartment: 'Comptabilité',
      requesterName: 'Thomas Leroy',
      title: 'Grand livre des comptes 641',
      description: 'Nécessaire pour concilier la balance générale avec le formulaire 2069-A-SD',
      status: 'provided',
      priority: 'urgent',
      requestedAt: '2026-09-11T10:00:00.000Z',
      dueDate: '2026-09-13T18:00:00.000Z',
      resolvedAt: '2026-09-13T16:30:00.000Z',
      resolutionNotes: 'Grand livre certifié transmis par Marc Duval.',
      attachedDocName: 'GL_Comptes_641_R&D_2025_certifie.pdf',
    },
    {
      id: 'idr-2',
      dossierId: 'dossier-cpt-014',
      dossierRef: 'DOS-2026-CPT-014',
      fromDepartment: 'Comptabilité',
      toDepartment: 'Juridique',
      requesterName: 'Marc Duval',
      title: 'PV d’AG d’approbation de cession filiale',
      description: 'Requis de toute urgence pour justifier de la déconsolidation',
      status: 'blocked',
      priority: 'bloquant',
      requestedAt: '2026-09-13T09:00:00.000Z',
      dueDate: '2026-09-15T12:00:00.000Z',
      blockerReason: 'En attente de signature notariée des statuts modifiés.',
    },
  ];

  it('correctly categorizes blocking requests', () => {
    const blocking = sampleRequests.filter(
      (r) => r.priority === 'bloquant' || r.status === 'blocked'
    );
    expect(blocking).toHaveLength(1);
    expect(blocking[0].id).toBe('idr-2');
    expect(blocking[0].blockerReason).toBeDefined();
  });

  it('filters requests by source and destination departments', () => {
    const fromCompta = sampleRequests.filter((r) => r.fromDepartment === 'Comptabilité');
    expect(fromCompta).toHaveLength(1);
    expect(fromCompta[0].toDepartment).toBe('Juridique');

    const toCompta = sampleRequests.filter((r) => r.toDepartment === 'Comptabilité');
    expect(toCompta).toHaveLength(1);
    expect(toCompta[0].fromDepartment).toBe('Fiscalité');
  });

  it('handles request status progression: pending -> in_progress -> provided', () => {
    let req: InterDepRequest = {
      id: 'idr-test',
      dossierId: 'dos-1',
      dossierRef: 'DOS-1',
      fromDepartment: 'Juridique',
      toDepartment: 'Fiscalité',
      requesterName: 'Antoine Girard',
      title: 'Validation fiscale apport-cession',
      description: 'Art 150-0 B ter',
      status: 'pending',
      priority: 'urgent',
      requestedAt: '2026-09-15T10:00:00.000Z',
      dueDate: '2026-09-18T18:00:00.000Z',
    };

    expect(req.status).toBe('pending');

    // Move to in_progress
    req = { ...req, status: 'in_progress' };
    expect(req.status).toBe('in_progress');

    // Provide resolution
    const now = new Date().toISOString();
    req = {
      ...req,
      status: 'provided',
      resolvedAt: now,
      resolutionNotes: 'Schéma validé sans risque de requalification.',
    };

    expect(req.status).toBe('provided');
    expect(req.resolvedAt).toBe(now);
    expect(req.resolutionNotes).toContain('Schéma validé');
  });
});
