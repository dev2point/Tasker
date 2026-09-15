import {
  ReviewDossier,
  ReviewStatus,
  WorkflowActor,
  AuditLogEntry,
  Department,
  InterDepRequest,
  DataFieldDiff,
} from '@/types/review';

const LOCAL_STORAGE_KEY = 'planit_review_dossiers_v1';

// No sample or mock dossiers by default
export const INITIAL_DOSSIERS: ReviewDossier[] = [];

const LEGACY_MOCK_PREFIXES = [
  'dossier-fis-001',
  'dossier-cpt-014',
  'dossier-jur-089',
  'dossier-fis-102',
];

/**
 * Load all review dossiers (with local storage persistence)
 * Automatically cleans any legacy mock/test dossiers from previous sessions
 */
export function getStoredDossiers(): ReviewDossier[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge any lingering legacy mock dossiers from previous development sessions
    const realDossiers = parsed.filter(
      (d: ReviewDossier) =>
        !LEGACY_MOCK_PREFIXES.some((prefix) => d.id === prefix || d.id.startsWith(prefix))
    );
    if (realDossiers.length !== parsed.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(realDossiers));
    }
    return realDossiers;
  } catch {
    return [];
  }
}

/**
 * Save all review dossiers to persistence
 */
export function saveStoredDossiers(dossiers: ReviewDossier[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dossiers));
    // Trigger storage event for cross-tab reactivity
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to persist review dossiers:', err);
  }
}

/**
 * Executes a strict state machine transition compliant with the Mermaid diagram:
 * [*] -> Brouillon -> Soumis -> En_Revision -> Amendements -> (Demande_Corrections -> Brouillon) OR (Valide -> Archive)
 */
export function executeWorkflowTransition(
  dossier: ReviewDossier,
  targetStatus: ReviewStatus,
  actor: WorkflowActor,
  options?: {
    correctionNotes?: string;
    amendmentNotes?: string;
    updatedDataFields?: DataFieldDiff[];
    updatedCurrentContent?: string;
    ipAddress?: string;
  }
): { success: boolean; dossier: ReviewDossier; error?: string } {
  const current = dossier.status;
  const ip = options?.ipAddress || '192.168.1.88';
  const now = new Date().toISOString();

  // Validate allowed transitions
  let actionName: AuditLogEntry['action'] = 'modification_chiffree';
  let logDetails = '';

  if (current === 'brouillon' && targetStatus === 'soumis') {
    actionName = 'soumission_n1';
    logDetails = `Dossier soumis pour revue au superviseur par le collaborateur ${actor.name}.`;
  } else if (current === 'soumis' && targetStatus === 'en_revision') {
    actionName = 'prise_en_charge';
    logDetails = `Prise en charge de la révision par ${actor.name} (${actor.department} - ${actor.role}).`;
  } else if (
    (current === 'en_revision' || current === 'soumis') &&
    targetStatus === 'amendements'
  ) {
    actionName = 'amendement_texte';
    logDetails = `Consignation des amendements et annotations par ${actor.name}.`;
  } else if (
    (current === 'en_revision' || current === 'amendements') &&
    targetStatus === 'demande_corrections'
  ) {
    actionName = 'demande_corrections';
    logDetails = `Demande de corrections formulée par ${actor.name} : ${options?.correctionNotes || 'Consignes spécifiques renseignées'}.`;
  } else if (current === 'demande_corrections' && targetStatus === 'brouillon') {
    actionName = 'creation';
    logDetails = `Prise en compte des corrections par le collaborateur ${actor.name} (Retour en brouillon).`;
  } else if (
    (current === 'en_revision' || current === 'amendements') &&
    targetStatus === 'valide'
  ) {
    actionName = 'validation_finale';
    logDetails = `Validation finale et verrouillage légal du dossier par le superviseur ${actor.name}.`;
  } else if (current === 'valide' && targetStatus === 'archive') {
    actionName = 'archivage';
    logDetails = `Dossier clôturé et archivé pour conformité et export officiel par ${actor.name}.`;
  } else {
    return {
      success: false,
      dossier,
      error: `Transition invalide : Impossible de passer de "${current}" à "${targetStatus}".`,
    };
  }

  // Create immutable audit log entry
  const newAuditEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now,
    actorId: actor.id,
    actorName: actor.name,
    actorDepartment: actor.department,
    actorRole: actor.role,
    ipAddress: ip,
    action: actionName,
    details: logDetails,
  };

  const updatedDossier: ReviewDossier = {
    ...dossier,
    status: targetStatus,
    updatedAt: now,
    submittedAt: targetStatus === 'soumis' ? now : dossier.submittedAt,
    approvedAt: targetStatus === 'valide' ? now : dossier.approvedAt,
    archivedAt: targetStatus === 'archive' ? now : dossier.archivedAt,
    correctionNotes:
      targetStatus === 'demande_corrections'
        ? options?.correctionNotes
        : targetStatus === 'brouillon'
          ? dossier.correctionNotes
          : undefined,
    correctionRequestedAt: targetStatus === 'demande_corrections' ? now : dossier.correctionRequestedAt,
    checker:
      targetStatus === 'en_revision' || targetStatus === 'valide'
        ? actor
        : dossier.checker,
    // Auto lock on validation
    lock:
      targetStatus === 'valide'
        ? {
            isLocked: true,
            lockedBy: actor,
            lockedAt: now,
            reason: 'Dossier approuvé et verrouillé (Zéro défaut légal)',
          }
        : dossier.lock,
    dataFields: options?.updatedDataFields || dossier.dataFields,
    textDocument: options?.updatedCurrentContent
      ? {
          ...dossier.textDocument,
          currentContent: options.updatedCurrentContent,
          lastAmendedBy: actor.name,
          lastAmendedAt: now,
          amendmentNotes: options.amendmentNotes || dossier.textDocument.amendmentNotes,
        }
      : dossier.textDocument,
    auditTrail: [newAuditEntry, ...dossier.auditTrail],
  };

  return {
    success: true,
    dossier: updatedDossier,
  };
}

/**
 * Toggle preventive lock to prevent concurrent modifications
 */
export function togglePreventiveLock(
  dossier: ReviewDossier,
  actor: WorkflowActor,
  lock: boolean,
  reason?: string,
  ipAddress = '192.168.1.88'
): ReviewDossier {
  const now = new Date().toISOString();
  const logEntry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now,
    actorId: actor.id,
    actorName: actor.name,
    actorDepartment: actor.department,
    actorRole: actor.role,
    ipAddress,
    action: lock ? 'verrouillage' : 'deverrouillage',
    details: lock
      ? `Verrouillage préventif d’édition activé par ${actor.name} (${reason || 'En cours d’examen'}).`
      : `Verrouillage préventif levé par ${actor.name}.`,
  };

  return {
    ...dossier,
    lock: {
      isLocked: lock,
      lockedBy: lock ? actor : undefined,
      lockedAt: lock ? now : undefined,
      reason: lock ? reason : undefined,
    },
    updatedAt: now,
    auditTrail: [logEntry, ...dossier.auditTrail],
  };
}

/**
 * Simple text diff calculation (line-based with character highlights)
 */
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({
        type: 'unchanged',
        content: oldLines[i],
      });
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))) {
      result.push({
        type: 'added',
        content: newLines[j],
      });
      j++;
    } else if (i < oldLines.length) {
      result.push({
        type: 'removed',
        content: oldLines[i],
      });
      i++;
    }
  }

  return result;
}
