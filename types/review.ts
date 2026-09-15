export type Department = 'Fiscalité' | 'Comptabilité' | 'Juridique';

export type ReviewStatus =
  | 'brouillon'
  | 'soumis'
  | 'en_revision'
  | 'amendements'
  | 'demande_corrections'
  | 'valide'
  | 'archive';

export type DossierPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkflowActor {
  id: string;
  name: string;
  email: string;
  department: Department;
  role: 'collaborateur' | 'manager' | 'associe' | 'admin';
  avatarUrl?: string;
}

export interface PreventiveLock {
  isLocked: boolean;
  lockedBy?: WorkflowActor;
  lockedAt?: string;
  reason?: string;
}

export interface DataFieldDiff {
  id: string;
  label: string;
  category: 'finance' | 'fiscal' | 'juridique' | 'ratio';
  previousValue: string | number;
  currentValue: string | number;
  unit?: '€' | '%' | 'jours' | 'k€' | 'texte';
  notes?: string;
}

export interface TextDocumentDiff {
  documentId: string;
  title: string;
  type: 'note_synthese' | 'acte_juridique' | 'conclusions_fiscales' | 'rapport_cloture';
  previousContent: string;
  currentContent: string;
  lastAmendedBy?: string;
  lastAmendedAt?: string;
  amendmentNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO String with millisecond precision
  actorId: string;
  actorName: string;
  actorDepartment: Department;
  actorRole: string;
  ipAddress: string;
  action:
    | 'creation'
    | 'soumission_n1'
    | 'prise_en_charge'
    | 'verrouillage'
    | 'deverrouillage'
    | 'amendement_texte'
    | 'modification_chiffree'
    | 'demande_corrections'
    | 'rejet'
    | 'validation_finale'
    | 'archivage'
    | 'requete_inter_pole';
  details: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
}

export interface InterDepRequest {
  id: string;
  dossierId: string;
  dossierRef: string;
  fromDepartment: Department;
  toDepartment: Department;
  requesterName: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'provided' | 'blocked';
  priority: 'normal' | 'urgent' | 'bloquant';
  requestedAt: string;
  dueDate: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  attachedDocName?: string;
  blockerReason?: string;
}

export interface PresenceMember {
  userId: string;
  userName: string;
  department: Department;
  role: string;
  dossierId?: string;
  status: 'viewing' | 'editing' | 'idle';
  lastSeen: string;
}

export interface ReviewDossier {
  id: string;
  ref: string; // e.g. "DOS-2026-FIS-042"
  title: string;
  clientName: string;
  clientSiret?: string;
  department: Department;
  typology: string; // e.g. "Liasse Fiscale & CVAE", "Pacte d'Actionnaires & Cession"
  priority: DossierPriority;
  status: ReviewStatus;
  
  // Maker-Checker Attribution
  maker: WorkflowActor;
  checker?: WorkflowActor;
  
  // Preventive Locking
  lock: PreventiveLock;
  
  // Financial & Data fields diff
  dataFields: DataFieldDiff[];
  
  // Textual document diff
  textDocument: TextDocumentDiff;
  
  // Feedback when corrections are requested
  correctionNotes?: string;
  correctionRequestedAt?: string;
  
  // Cross-department bridges
  interDepRequests: InterDepRequest[];
  
  // Immutable Audit Trail
  auditTrail: AuditLogEntry[];
  
  // Timestamps & Metadata
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  archivedAt?: string;
  estimatedDeliverableDate: string;
}
