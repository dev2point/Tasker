import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_DOSSIERS,
  getStoredDossiers,
  saveStoredDossiers,
  executeWorkflowTransition,
  togglePreventiveLock,
  computeLineDiff,
} from '@/lib/review-service';
import { ReviewDossier, WorkflowActor } from '@/types/review';

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
    it('initializes with seed dossiers when storage is empty', () => {
      const loaded = getStoredDossiers();
      expect(loaded.length).toBeGreaterThanOrEqual(INITIAL_DOSSIERS.length);
      expect(loaded[0].ref).toBe(INITIAL_DOSSIERS[0].ref);
    });

    it('persists and retrieves updated dossiers', () => {
      const customDossiers = [testDossier];
      saveStoredDossiers(customDossiers);
      const retrieved = getStoredDossiers();
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('dossier-test-unit');
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

    it('Checker takes charge of submitted file: soumis -> en_revision', () => {
      const submitted = executeWorkflowTransition(testDossier, 'soumis', mockMaker).dossier;
      const res = executeWorkflowTransition(submitted, 'en_revision', mockChecker);

      expect(res.success).toBe(true);
      expect(res.dossier.status).toBe('en_revision');
      expect(res.dossier.checker.id).toBe(mockChecker.id);
      expect(res.dossier.auditTrail[0].action).toBe('prise_en_charge');
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
});
