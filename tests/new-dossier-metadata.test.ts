import { describe, expect, it } from 'vitest';
import { createTrackedFile } from '@/lib/file-version-service';
import { buildNewDossier } from '@/lib/review-dossier-factory';
import type { WorkflowActor } from '@/types/review';

const maker: WorkflowActor = {
  id: 'maker-test',
  name: 'test@io.io',
  email: 'test@io.io',
  department: 'Fiscalité',
  role: 'collaborateur',
};

function makeInput() {
  return {
    id: 'dossier-test',
    ref: 'DOS-2026-FIS-001',
    title: 'Dossier de test',
    clientName: 'Client test',
    clientSiret: '12345678900000',
    department: 'Fiscalité' as const,
    typology: 'Liasse Fiscale & CVAE',
    priority: 'medium' as const,
    estimatedDate: '2026-12-31',
    createdAt: '2026-11-23T10:00:00.000Z',
    maker,
    initialTrackedFile: createTrackedFile({
      id: 'file-test',
      versionId: 'ver-test',
      fileName: 'liasse.pdf',
      sizeBytes: 1024,
      textContent: 'Contenu de test',
      authorName: maker.name,
    }),
    metricLabel: 'Montant',
    metricAmount: 1000,
    extractedText: 'Contenu de test',
    attachedFileName: 'liasse.pdf',
  };
}

describe('buildNewDossier', () => {
  it('leaves checker unassigned on a newly created dossier', () => {
    const dossier = buildNewDossier(makeInput());

    expect(dossier.checker).toBeUndefined();
  });

  it('does not record the initial deposit as a text amendment', () => {
    const dossier = buildNewDossier(makeInput());

    expect(dossier.textDocument.lastAmendedBy).toBeUndefined();
    expect(dossier.textDocument.lastAmendedAt).toBeUndefined();
    expect(dossier.textDocument.amendmentNotes).toBeUndefined();
  });
});
