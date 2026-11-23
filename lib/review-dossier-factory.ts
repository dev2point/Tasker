import type { Department, DossierPriority, ReviewDossier, WorkflowActor } from '@/types/review';
import type { TrackedFile } from '@/types/file-version';

export interface BuildNewDossierInput {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly clientName: string;
  readonly clientSiret?: string;
  readonly department: Department;
  readonly typology: string;
  readonly priority: DossierPriority;
  readonly estimatedDate: string;
  readonly createdAt: string;
  readonly maker: WorkflowActor;
  readonly initialTrackedFile: TrackedFile;
  readonly metricLabel: string;
  readonly metricAmount: number | '';
  readonly extractedText: string;
  readonly attachedFileName: string;
}

export function buildNewDossier(input: BuildNewDossierInput): ReviewDossier {
  const timestamp = Date.parse(input.createdAt);

  return {
    id: input.id,
    ref: input.ref,
    title: input.title,
    clientName: input.clientName,
    clientSiret: input.clientSiret || undefined,
    department: input.department,
    typology: input.typology,
    priority: input.priority,
    status: 'brouillon',
    version: 1,
    maker: input.maker,
    lock: {
      isLocked: false,
    },
    estimatedDeliverableDate: input.estimatedDate,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    dataFields:
      input.metricLabel.trim() && input.metricAmount !== ''
        ? [
            {
              id: `df-${timestamp}-1`,
              label: input.metricLabel.trim(),
              category:
                input.department === 'Fiscalité'
                  ? 'fiscal'
                  : input.department === 'Comptabilité'
                    ? 'finance'
                    : 'juridique',
              previousValue: Number(input.metricAmount),
              currentValue: Number(input.metricAmount),
              unit: '€',
              notes: 'Valeur déclarée au stade brouillon',
            },
          ]
        : [],
    textDocument: {
      documentId: `doc-${timestamp}`,
      title: `Synthèse - ${input.attachedFileName}`,
      type:
        input.department === 'Fiscalité'
          ? 'conclusions_fiscales'
          : input.department === 'Comptabilité'
            ? 'rapport_cloture'
            : 'acte_juridique',
      previousContent: input.extractedText || 'Document initial.',
      currentContent: input.extractedText || 'Document initial.',
    },
    trackedFiles: [input.initialTrackedFile],
    interDepRequests: [],
    auditTrail: [
      {
        id: `aud-${timestamp}`,
        timestamp: input.createdAt,
        actorId: input.maker.id,
        actorName: input.maker.name,
        actorDepartment: input.maker.department,
        actorRole: input.maker.role,
        ipAddress: 'server-pending',
        action: 'creation',
        details: `Création du dossier "${input.title}" pour ${input.clientName} avec dépôt du fichier "${input.attachedFileName}" (v1.0).`,
      },
    ],
  };
}
