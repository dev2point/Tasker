import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_DOSSIERS,
  getStoredDossiers,
  saveStoredDossiers,
  executeWorkflowTransition,
  togglePreventiveLock,
  computeLineDiff,
  canUserDeleteDossier,
  canUserStartReview,
  mergeServerDossiersIntoLocal,
} from '@/lib/review-service';
import { ReviewDossier, WorkflowActor } from '@/types/review';
import { TrackedFile } from '@/types/file-version';

describe('Collaborative Review Platform & Maker-Checker State Machine', () => {
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

  let testDossier: ReviewDossier;

  beforeEach(() => {
    // Clear localStorage for isolated test runs
    localStorage.clear();

    testDossier = {
      id: 'dossier-test-unit',
      ref: 'DOS-2026-TST-001',
      title: 'Dossier Test Cession Actions & CIR',
      clientName: 'Test Client Corp SAS',
      clientSiret: '123 456 789 00012',
      department: 'Fiscalité',
      typology: 'Liasse Fiscale & Crédit Impôt Recherche',
      priority: 'urgent',
      status: 'brouillon',
      version: 1,
      maker: mockMaker,
      checker: mockChecker,
      lock: { isLocked: false },
      estimatedDeliverableDate: '2026-10-15',
      createdAt: '2026-09-15T08:00:00.000Z',
      updatedAt: '2026-09-15T08:00:00.000Z',
      dataFields: [
        {
          id: 'df-1',
          label: 'Montant Impôt',
          category: 'fiscal',
          previousValue: 100000,
          currentValue: 120000,
          unit: '€',
        },
      ],
      textDocument: {
        documentId: 'doc-tst-1',
        title: 'Note de Synthèse Fiscale',
        type: 'conclusions_fiscales',
        previousContent: 'Paragraphe 1 : Situation initiale.\nParagraphe 2 : Risque moyen.',
        currentContent: 'Paragraphe 1 : Situation initiale.\nParagraphe 2 : Risque maîtrisé et certifié.',
      },
      interDepRequests: [],
      auditTrail: [],
    };
  });

  describe('Storage persistence', () => {
    it('returns empty array when storage is empty (no mock data)', () => {
      const loaded = getStoredDossiers();
      expect(loaded).toHaveLength(0);
    });

    it('persists and retrieves updated dossiers', () => {
      const customDossiers = [testDossier];
      saveStoredDossiers(customDossiers);
      const retrieved = getStoredDossiers();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('dossier-test-unit');
    });
  });

  describe('Server hydration', () => {
    it('keeps server dossiers visible when the browser cache is empty', () => {
      expect(mergeServerDossiersIntoLocal([], [testDossier])).toEqual([testDossier]);
    });

    it('preserves cached file bytes and keeps local-only dossiers', () => {
      const cachedFile: TrackedFile = {
        id: 'file-cache',
        name: 'liasse.pdf',
        originalName: 'liasse.pdf',
        fileType: 'pdf',
        createdAt: '2026-09-15T08:00:00.000Z',
        updatedAt: '2026-09-15T08:00:00.000Z',
        currentVersion: 'v1.0',
        versions: [
          {
            id: 'ver-cache',
            versionNumber: 'v1.0',
            createdAt: '2026-09-15T08:00:00.000Z',
            authorName: 'Sarah Benali',
            summary: 'Création initiale',
            sizeBytes: 4,
            fileName: 'liasse.pdf',
            fileType: 'pdf',
            contentUrl: 'data:application/pdf;base64,YWJjZA==',
          },
        ],
      };
      const serverFile: TrackedFile = {
        ...cachedFile,
        versions: [
          {
            ...cachedFile.versions[0],
            contentUrl: '/api/review/file-versions/ver-cache/download',
          },
        ],
      };
      const localDossier = { ...testDossier, trackedFiles: [cachedFile] };
      const serverDossier = {
        ...testDossier,
        status: 'soumis' as const,
        version: 2,
        trackedFiles: [serverFile],
      };
      const localOnly = {
        ...testDossier,
        id: 'dossier-local-only',
        ref: 'DOS-2026-TST-LOCAL',
      };

      const merged = mergeServerDossiersIntoLocal(
        [localDossier, localOnly],
        [serverDossier]
      );

      expect(merged).toHaveLength(2);
      expect(merged[0].version).toBe(2);
      expect(merged[0].status).toBe('soumis');
      expect(merged[0].trackedFiles?.[0].versions[0].contentUrl).toBe(
        'data:application/pdf;base64,YWJjZA=='
      );
      expect(merged[1].id).toBe('dossier-local-only');
    });
  });

  describe('State Machine & Workflow Transitions', () => {
    it('Maker submits draft: brouillon -> soumis', () => {
      const res = executeWorkflowTransition(testDossier, 'soumis', mockMaker);
      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('soumis');
      expect(res.dossier.submittedAt).toBeDefined();

      // Check immutable audit trail entry
      const latestAudit = res.dossier.auditTrail[0];
      expect(latestAudit.action).toBe('soumission_n1');
      expect(latestAudit.actorId).toBe(mockMaker.id);
    });

    it('Maker submits dossier to a specific user and supports resubmission after corrections', () => {
      const customTarget: WorkflowActor = {
        id: 'usr-specific-reviewer',
        name: 'Claire Delacroix',
        email: 'c.delacroix@cabinet.fr',
        department: 'Juridique',
        role: 'collaborateur',
      };
      const res = executeWorkflowTransition(testDossier, 'soumis', mockMaker, {
        targetChecker: customTarget,
        submissionNote: 'Merci de vérifier la clause fiscale.',
      });
      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('soumis');
      expect(res.dossier.checker?.id).toBe(customTarget.id);
      expect(res.dossier.checker?.name).toBe('Claire Delacroix');
      expect(res.dossier.auditTrail[0].details).toContain('Claire Delacroix');

      const returned = { ...res.dossier, status: 'demande_corrections' as const };
      const resubmitted = executeWorkflowTransition(returned, 'soumis', mockMaker, {
        targetChecker: customTarget,
      });
      expect(resubmitted.success).toBe(true);
      expect(resubmitted.dossier.status).toBe('soumis');
    });

    it('Checker takes charge of submitted file: soumis -> en_revision', () => {
      const submitted = executeWorkflowTransition(testDossier, 'soumis', mockMaker).dossier;
      const res = executeWorkflowTransition(submitted, 'en_revision', mockChecker);

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('en_revision');
      expect(res.dossier.checker?.id).toBe(mockChecker.id);
      expect(res.dossier.auditTrail[0].action).toBe('prise_en_charge');
    });

    it('canUserStartReview n autorise que le checker assigné', () => {
      const submitted = executeWorkflowTransition(testDossier, 'soumis', mockMaker).dossier;
      const adminNonChecker: WorkflowActor = {
        ...mockMaker,
        id: 'usr-admin-1',
        email: 'admin@cabinet.fr',
        role: 'admin',
      };

      expect(canUserStartReview(submitted, mockMaker)).toBe(false);
      expect(canUserStartReview(submitted, adminNonChecker)).toBe(false);
      expect(canUserStartReview(submitted, mockChecker)).toBe(true);
      expect(canUserStartReview({ ...submitted, status: 'en_revision' }, mockChecker)).toBe(false);
    });

    it('refuse la prise en charge par un acteur qui n’est pas le checker assigné', () => {
      const submitted = executeWorkflowTransition(testDossier, 'soumis', mockMaker).dossier;
      const res = executeWorkflowTransition(submitted, 'en_revision', mockMaker);

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.dossier.status).toBe('soumis');
      expect(res.dossier.auditTrail).toHaveLength(submitted.auditTrail.length);
    });

    it('Consigning amendments: en_revision -> amendements', () => {
      const submitted = executeWorkflowTransition(testDossier, 'soumis', mockMaker).dossier;
      const underReview = executeWorkflowTransition(submitted, 'en_revision', mockChecker).dossier;

      const newContent = 'Paragraphe 1 : Situation initiale.\nParagraphe 2 : Amendement finalisé.';
      const res = executeWorkflowTransition(underReview, 'amendements', mockChecker, {
        updatedCurrentContent: newContent,
        amendmentNotes: 'Rectification suite aux observations fiscales',
      });

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('amendements');
      expect(res.dossier.textDocument.currentContent).toBe(newContent);
      expect(res.dossier.textDocument.lastAmendedBy).toBe(mockChecker.name);
      expect(res.dossier.auditTrail[0].action).toBe('amendement_texte');
    });

    it('Checker requests corrections: amendements -> demande_corrections', () => {
      const submitted = executeWorkflowTransition(testDossier, 'soumis', mockMaker).dossier;
      const underReview = executeWorkflowTransition(submitted, 'en_revision', mockChecker).dossier;

      const notes = 'Veuillez recalculer la quote-part de frais et charges.';
      const res = executeWorkflowTransition(underReview, 'demande_corrections', mockChecker, {
        correctionNotes: notes,
      });

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('demande_corrections');
      expect(res.dossier.correctionNotes).toBe(notes);
      expect(res.dossier.auditTrail[0].action).toBe('demande_corrections');
    });

    it('Collaborator re-opens for rework: demande_corrections -> brouillon', () => {
      const underReview = { ...testDossier, status: 'demande_corrections' as const, correctionNotes: 'Fix error' };
      const res = executeWorkflowTransition(underReview, 'brouillon', mockMaker);

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('brouillon');
      expect(res.dossier.auditTrail[0].action).toBe('creation');
    });

    it('Final approval & auto-lock: en_revision -> valide', () => {
      const underReview = { ...testDossier, status: 'en_revision' as const };
      const res = executeWorkflowTransition(underReview, 'valide', mockChecker);

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('valide');
      expect(res.dossier.approvedAt).toBeDefined();
      // Auto-locks file on validation
      expect(res.dossier.lock.isLocked).toBe(true);
      expect(res.dossier.lock.lockedBy?.id).toBe(mockChecker.id);
      expect(res.dossier.auditTrail[0].action).toBe('validation_finale');
    });

    it('Archival of completed file: valide -> archive', () => {
      const validated = { ...testDossier, status: 'valide' as const };
      const res = executeWorkflowTransition(validated, 'archive', mockChecker);

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('archive');
      expect(res.dossier.archivedAt).toBeDefined();
      expect(res.dossier.auditTrail[0].action).toBe('archivage');
    });

    it('Rejects unauthorized illegal transitions (e.g. brouillon -> valide)', () => {
      const res = executeWorkflowTransition(testDossier, 'valide', mockMaker);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Transition invalide');
      expect(res.dossier.status).toBe('brouillon');
    });
  });

  describe('Preventive Lock Management', () => {
    it('locks dossier and records audit entry', () => {
      const locked = togglePreventiveLock(
        testDossier,
        mockChecker,
        true,
        'Examen approfondi des déclarations'
      );

      expect(locked.lock.isLocked).toBe(true);
      expect(locked.lock.lockedBy?.id).toBe(mockChecker.id);
      expect(locked.lock.reason).toBe('Examen approfondi des déclarations');
      expect(locked.auditTrail[0].action).toBe('verrouillage');
    });

    it('unlocks dossier and records audit entry', () => {
      const locked = togglePreventiveLock(testDossier, mockChecker, true);
      const unlocked = togglePreventiveLock(locked, mockChecker, false);

      expect(unlocked.lock.isLocked).toBe(false);
      expect(unlocked.lock.lockedBy).toBeUndefined();
      expect(unlocked.auditTrail[0].action).toBe('deverrouillage');
    });
  });

  describe('Text Diff Algorithm (computeLineDiff)', () => {
    it('identifies unchanged, added, and removed lines', () => {
      const oldDoc = 'Ligne 1 : Invariable\nLigne 2 : Ancienne clause';
      const newDoc = 'Ligne 1 : Invariable\nLigne 2 : Clause amendée\nLigne 3 : Ajout nouveau';

      const diff = computeLineDiff(oldDoc, newDoc);

      const unchanged = diff.filter((d) => d.type === 'unchanged');
      const added = diff.filter((d) => d.type === 'added');
      const removed = diff.filter((d) => d.type === 'removed');

      expect(unchanged.some((l) => l.content.includes('Invariable'))).toBe(true);
      expect(added.some((l) => l.content.includes('Clause amendée'))).toBe(true);
      expect(added.some((l) => l.content.includes('Ajout nouveau'))).toBe(true);
      expect(removed.some((l) => l.content.includes('Ancienne clause'))).toBe(true);
    });

    it('handles identical documents with only unchanged lines', () => {
      const doc = 'Ligne A\nLigne B\nLigne C';
      const diff = computeLineDiff(doc, doc);

      expect(diff.every((d) => d.type === 'unchanged')).toBe(true);
      expect(diff).toHaveLength(3);
    });
  });

  describe('Dossier Deletion RBAC (canUserDeleteDossier)', () => {
    it('allows creator to delete their own non-validated, unlocked dossier', () => {
      expect(canUserDeleteDossier(testDossier, mockMaker)).toBe(true);
    });

    it('forbids creator from deleting a validated or archived dossier', () => {
      expect(
        canUserDeleteDossier({ ...testDossier, status: 'valide' }, mockMaker)
      ).toBe(false);
      expect(
        canUserDeleteDossier({ ...testDossier, status: 'archive' }, mockMaker)
      ).toBe(false);
    });

    it('forbids creator from deleting a dossier locked by another supervisor', () => {
      const lockedByOther = togglePreventiveLock(testDossier, mockChecker, true);
      expect(canUserDeleteDossier(lockedByOther, mockMaker)).toBe(false);
    });

    it('forbids unrelated users from deleting someone else dossier, while allowing admin', () => {
      expect(canUserDeleteDossier(testDossier, mockChecker)).toBe(false);
      expect(
        canUserDeleteDossier(
          { ...testDossier, status: 'valide' },
          { id: 'usr-admin', email: 'admin@cabinet.fr', role: 'admin' }
        )
      ).toBe(true);
    });
  });
});
