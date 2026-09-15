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

export const INITIAL_DOSSIERS: ReviewDossier[] = [
  {
    id: 'dossier-fis-001',
    ref: 'DOS-2026-FIS-001',
    title: 'Liasse Fiscale & Déclaration IS 2025 - Groupe Altius Pharma',
    clientName: 'Groupe Altius Pharma SA',
    clientSiret: '443 892 104 00032',
    department: 'Fiscalité',
    typology: 'Liasse Fiscale & Crédit Impôt Recherche',
    priority: 'urgent',
    status: 'soumis',
    maker: {
      id: 'usr-thomas',
      name: 'Thomas Leroy',
      email: 't.leroy@cabinet.fr',
      department: 'Fiscalité',
      role: 'collaborateur',
    },
    checker: {
      id: 'usr-claire',
      name: 'Claire Bernard',
      email: 'c.bernard@cabinet.fr',
      department: 'Fiscalité',
      role: 'manager',
    },
    lock: {
      isLocked: false,
    },
    estimatedDeliverableDate: '2026-09-30',
    createdAt: '2026-09-10T08:30:00.000Z',
    updatedAt: '2026-09-14T14:20:00.000Z',
    submittedAt: '2026-09-14T14:20:00.000Z',
    dataFields: [
      {
        id: 'df-1',
        label: "Chiffre d'Affaires Net HT",
        category: 'finance',
        previousValue: 12450000,
        currentValue: 12890000,
        unit: '€',
        notes: 'Ajustement suite aux refacturations intragroupe du T4',
      },
      {
        id: 'df-2',
        label: 'Base Dépenses CIR (Art. 244 quater B)',
        category: 'fiscal',
        previousValue: 1420000,
        currentValue: 1680000,
        unit: '€',
        notes: 'Intégration des temps chercheurs rattachés au projet BioGen',
      },
      {
        id: 'df-3',
        label: 'Résultat Fiscal Rectifié',
        category: 'fiscal',
        previousValue: 2180000,
        currentValue: 1940000,
        unit: '€',
        notes: 'Impact de la déduction suramortissement R&D',
      },
      {
        id: 'df-4',
        label: 'Montant Impôt sur les Sociétés (IS)',
        category: 'fiscal',
        previousValue: 545000,
        currentValue: 485000,
        unit: '€',
        notes: 'Taux normal 25% appliqué sur résultat rectifié',
      },
    ],
    textDocument: {
      documentId: 'doc-note-fis-001',
      title: 'Note de Cadrage & Conclusions Fiscales CIR',
      type: 'conclusions_fiscales',
      previousContent: `1. Périmètre de la mission
Le présent audit porte sur l'éligibilité au Crédit d'Impôt Recherche (CIR) pour l'exercice clos le 31 décembre 2025.
L'assiette des dépenses déclarées s'élevait provisoirement à 1 420 000 €.

2. Analyse des qualifications scientifiques
Les projets A et B ont été documentés conformément au guide du Ministère de l'Enseignement Supérieur et de la Recherche. Le personnel affecté comprend 4 ingénieurs à temps partiel.

3. Risques identifiés
Risque faible de requalification sous réserve de finalisation des fiches de temps du Dr. Vaneau.`,
      currentContent: `1. Périmètre de la mission
Le présent audit porte sur l'éligibilité au Crédit d'Impôt Recherche (CIR) pour l'exercice clos le 31 décembre 2025.
L'assiette des dépenses déclarées a été revalorisée et portée à 1 680 000 € après intégration du projet BioGen.

2. Analyse des qualifications scientifiques
Les projets A, B et BioGen ont été documentés conformément au guide du Ministère de l'Enseignement Supérieur et de la Recherche. Le personnel affecté comprend désormais 6 ingénieurs et 2 docteurs certifiés à temps plein.

3. Risques identifiés & Mesures conservatoires
Risque minime : les feuilles d'émargement ont été contresignées par le Directeur R&D. Les sous-traitances privées agréées ont été plafonnées au triple du CIR net.`,
      lastAmendedBy: 'Thomas Leroy',
      lastAmendedAt: '2026-09-14T14:15:00.000Z',
      amendmentNotes: 'Mise à jour suite aux fiches de paie complémentaires des docteurs.',
    },
    interDepRequests: [
      {
        id: 'idr-1',
        dossierId: 'dossier-fis-001',
        dossierRef: 'DOS-2026-FIS-001',
        fromDepartment: 'Fiscalité',
        toDepartment: 'Comptabilité',
        requesterName: 'Thomas Leroy',
        title: 'Grand livre des comptes 641 et justificatifs d’amortissements R&D',
        description:
          'Nécessaire pour concilier la balance générale avec le formulaire 2069-A-SD avant soumission au superviseur.',
        status: 'provided',
        priority: 'urgent',
        requestedAt: '2026-09-11T10:00:00.000Z',
        dueDate: '2026-09-13T18:00:00.000Z',
        resolvedAt: '2026-09-13T16:30:00.000Z',
        resolutionNotes: 'Grand livre certifié transmis par Marc Duval (Pôle Compta).',
        attachedDocName: 'GL_Comptes_641_R&D_2025_certifie.pdf',
      },
    ],
    auditTrail: [
      {
        id: 'aud-1',
        timestamp: '2026-09-10T08:30:12.450Z',
        actorId: 'usr-thomas',
        actorName: 'Thomas Leroy',
        actorDepartment: 'Fiscalité',
        actorRole: 'Collaborateur Fiscaliste',
        ipAddress: '192.168.1.42',
        action: 'creation',
        details: 'Création initiale du dossier fiscal et chargement de la balance provisoire.',
      },
      {
        id: 'aud-2',
        timestamp: '2026-09-14T14:15:22.100Z',
        actorId: 'usr-thomas',
        actorName: 'Thomas Leroy',
        actorDepartment: 'Fiscalité',
        actorRole: 'Collaborateur Fiscaliste',
        ipAddress: '192.168.1.42',
        action: 'modification_chiffree',
        details: 'Ajustement de l’assiette CIR de 1 420 000 € à 1 680 000 €.',
        fieldChanged: 'Base Dépenses CIR',
        oldValue: '1 420 000 €',
        newValue: '1 680 000 €',
      },
      {
        id: 'aud-3',
        timestamp: '2026-09-14T14:20:05.890Z',
        actorId: 'usr-thomas',
        actorName: 'Thomas Leroy',
        actorDepartment: 'Fiscalité',
        actorRole: 'Collaborateur Fiscaliste',
        ipAddress: '192.168.1.42',
        action: 'soumission_n1',
        details: 'Soumission officielle du dossier pour revue au superviseur Claire Bernard (Maker-Checker).',
      },
    ],
  },
  {
    id: 'dossier-cpt-014',
    ref: 'DOS-2026-CPT-014',
    title: 'Clôture Bilan & Consolidation Annuelle - HoldCo Valorial',
    clientName: 'HoldCo Valorial Finance SAS',
    clientSiret: '812 405 921 00018',
    department: 'Comptabilité',
    typology: 'Consolidation & Arrêté des Comptes',
    priority: 'high',
    status: 'en_revision',
    maker: {
      id: 'usr-lucas',
      name: 'Lucas Moreau',
      email: 'l.moreau@cabinet.fr',
      department: 'Comptabilité',
      role: 'collaborateur',
    },
    checker: {
      id: 'usr-marc',
      name: 'Marc Duval',
      email: 'm.duval@cabinet.fr',
      department: 'Comptabilité',
      role: 'manager',
    },
    lock: {
      isLocked: true,
      lockedBy: {
        id: 'usr-marc',
        name: 'Marc Duval',
        email: 'm.duval@cabinet.fr',
        department: 'Comptabilité',
        role: 'manager',
      },
      lockedAt: '2026-09-15T09:12:00.000Z',
      reason: 'Révision active des écarts d’acquisition et des retraitements IFRS',
    },
    estimatedDeliverableDate: '2026-09-28',
    createdAt: '2026-09-08T11:00:00.000Z',
    updatedAt: '2026-09-15T09:12:00.000Z',
    submittedAt: '2026-09-12T17:45:00.000Z',
    dataFields: [
      {
        id: 'df-10',
        label: 'EBITDA Consolidé',
        category: 'finance',
        previousValue: 3850000,
        currentValue: 4120000,
        unit: '€',
        notes: 'Neutralisation des provisions intragroupe pour créances douteuses',
      },
      {
        id: 'df-11',
        label: 'Dette Nette Bancaire',
        category: 'finance',
        previousValue: 8900000,
        currentValue: 8450000,
        unit: '€',
        notes: 'Remboursement anticipé tranche senior B',
      },
      {
        id: 'df-12',
        label: 'Ratio de Levier (Dette Nette / EBITDA)',
        category: 'ratio',
        previousValue: '2.31x',
        currentValue: '2.05x',
        unit: 'texte',
        notes: 'Respect des covenants bancaires (seuil max 2.50x)',
      },
      {
        id: 'df-13',
        label: 'Résultat Net Part du Groupe',
        category: 'finance',
        previousValue: 1950000,
        currentValue: 2140000,
        unit: '€',
        notes: 'Hausse suite à la cession des titres filiale espagnole',
      },
    ],
    textDocument: {
      documentId: 'doc-cloture-cpt-014',
      title: 'Rapport d’Arrêté des Comptes Consolidés 2025',
      type: 'rapport_cloture',
      previousContent: `A. Faits marquants de l'exercice
L'exercice 2025 a été caractérisé par la consolidation des filiales opérationnelles à 100%. Le périmètre comprend 4 entités.

B. Méthodes comptables appliquées
Les comptes ont été préparés selon les normes françaises du règlement ANC 2020-01. Les écarts d'évaluation ont été amortis sur 10 ans.

C. Covenants et liquidité
Le ratio de levier financier s'élève à 2.31x. Aucune infraction de covenant n'a été constatée lors de la clôture semestrielle.`,
      currentContent: `A. Faits marquants de l'exercice
L'exercice 2025 a été caractérisé par la cession de la filiale Ibérica et la consolidation des 3 entités résiduelles. Le périmètre audité comprend 3 entités actives.

B. Méthodes comptables appliquées & Retraitements
Les comptes ont été préparés selon les normes françaises du règlement ANC 2020-01. Les amortissements dérogatoires intragroupes ont été intégralement éliminés en capitaux propres consolidés.

C. Covenants et liquidité
Le ratio de levier financier s'améliore significativement à 2.05x (contre 2.31x prévisionnel). Les attestations d'absence de défaut ont été adressées au pool bancaire chef de file.`,
      lastAmendedBy: 'Marc Duval',
      lastAmendedAt: '2026-09-15T09:10:00.000Z',
      amendmentNotes: 'Validation des éliminations intragroupe et du ratio de levier.',
    },
    interDepRequests: [
      {
        id: 'idr-2',
        dossierId: 'dossier-cpt-014',
        dossierRef: 'DOS-2026-CPT-014',
        fromDepartment: 'Comptabilité',
        toDepartment: 'Juridique',
        requesterName: 'Marc Duval',
        title: 'PV d’AG d’approbation de cession filiale et avenant pacte d’actionnaires',
        description:
          'Requis de toute urgence pour justifier de la déconsolidation de la filiale Ibérica et auditer la clause d’earn-out.',
        status: 'blocked',
        priority: 'bloquant',
        requestedAt: '2026-09-13T09:00:00.000Z',
        dueDate: '2026-09-15T12:00:00.000Z',
        blockerReason:
          'En attente de signature notariée des statuts modifiés par le conseil espagnol.',
      },
    ],
    auditTrail: [
      {
        id: 'aud-10',
        timestamp: '2026-09-08T11:00:15.000Z',
        actorId: 'usr-lucas',
        actorName: 'Lucas Moreau',
        actorDepartment: 'Comptabilité',
        actorRole: 'Collaborateur Comptable',
        ipAddress: '192.168.1.55',
        action: 'creation',
        details: 'Initialisation du dossier de consolidation annuelle.',
      },
      {
        id: 'aud-11',
        timestamp: '2026-09-12T17:45:00.000Z',
        actorId: 'usr-lucas',
        actorName: 'Lucas Moreau',
        actorDepartment: 'Comptabilité',
        actorRole: 'Collaborateur Comptable',
        ipAddress: '192.168.1.55',
        action: 'soumission_n1',
        details: 'Soumission des états consolidés au manager Marc Duval.',
      },
      {
        id: 'aud-12',
        timestamp: '2026-09-15T09:12:00.000Z',
        actorId: 'usr-marc',
        actorName: 'Marc Duval',
        actorDepartment: 'Comptabilité',
        actorRole: 'Superviseur / Manager',
        ipAddress: '192.168.1.12',
        action: 'verrouillage',
        details:
          'Verrouillage préventif du dossier pour revue approfondie (Maker-Checker lock actif).',
      },
      {
        id: 'aud-13',
        timestamp: '2026-09-15T09:15:30.000Z',
        actorId: 'usr-marc',
        actorName: 'Marc Duval',
        actorDepartment: 'Comptabilité',
        actorRole: 'Superviseur / Manager',
        ipAddress: '192.168.1.12',
        action: 'requete_inter_pole',
        details:
          'Passerelle inter-pôle émise vers le Juridique : PV d’AG d’approbation de cession (marqué Bloquant).',
      },
    ],
  },
  {
    id: 'dossier-jur-089',
    ref: 'DOS-2026-JUR-089',
    title: 'Pacte d’Actionnaires & Cession de Titres - SAS NovaTech',
    clientName: 'NovaTech Solutions SAS',
    clientSiret: '798 123 456 00021',
    department: 'Juridique',
    typology: 'Opération de Haut de Bilan & Pacte d’Actionnaires',
    priority: 'urgent',
    status: 'demande_corrections',
    maker: {
      id: 'usr-eleonore',
      name: 'Éléonore Vasseur',
      email: 'e.vasseur@cabinet.fr',
      department: 'Juridique',
      role: 'collaborateur',
    },
    checker: {
      id: 'usr-antoine',
      name: 'Antoine Girard',
      email: 'a.girard@cabinet.fr',
      department: 'Juridique',
      role: 'associe',
    },
    lock: {
      isLocked: false,
    },
    estimatedDeliverableDate: '2026-09-24',
    createdAt: '2026-09-05T14:00:00.000Z',
    updatedAt: '2026-09-15T08:45:00.000Z',
    submittedAt: '2026-09-13T11:20:00.000Z',
    correctionNotes:
      'ATTENTION sur la clause 4.2 (Garantie d’Actif et de Passif) : Le seuil de déclenchement (de minimis) doit être abaissé à 15 000 € au lieu de 50 000 €. De plus, la clause de Bad Leaver doit prévoir une décote progressive de 30% sur 3 ans.',
    correctionRequestedAt: '2026-09-15T08:45:00.000Z',
    dataFields: [
      {
        id: 'df-20',
        label: 'Valorisation Pré-Money Retenue',
        category: 'finance',
        previousValue: 6000000,
        currentValue: 6500000,
        unit: '€',
        notes: 'Négociation du multiple d’ARR relevé à 5.2x',
      },
      {
        id: 'df-21',
        label: 'Plafond Garantie de Passif (GAP)',
        category: 'juridique',
        previousValue: 1200000,
        currentValue: 900000,
        unit: '€',
        notes: 'Plafonné à 15% du prix de souscription contre 20% initialement',
      },
      {
        id: 'df-22',
        label: 'Seuil Déclenchement de Minimis (GAP)',
        category: 'juridique',
        previousValue: 50000,
        currentValue: 15000,
        unit: '€',
        notes: 'Demande expresse de l’associé référent pour protéger les investisseurs',
      },
      {
        id: 'df-23',
        label: 'Durée d’Inaliénabilité des Fondateurs',
        category: 'juridique',
        previousValue: 36,
        currentValue: 48,
        unit: 'jours',
        notes: 'Extension à 48 mois négociée avec les business angels',
      },
    ],
    textDocument: {
      documentId: 'doc-pacte-jur-089',
      title: 'Projet de Pacte d’Actionnaires - Clause 4 (Sortie & Garanties)',
      type: 'acte_juridique',
      previousContent: `Article 4.2 - Garantie d'Actif et de Passif
Les Garants s'engagent solidairement à indemniser la Société de tout préjudice résultant d'un passif non révélé antérieur à la Date de Réalisation.
Le seuil de minimis est fixé à 50 000 € par réclamation unitaire.
Le plafond global d'indemnisation est fixé à 1 200 000 €.

Article 5 - Départs des Dirigeants (Leaver Clauses)
En cas de départ pour Faute Grave (Bad Leaver), les actions du Dirigeant seront cédées sans décote à la valeur nominale.`,
      currentContent: `Article 4.2 - Garantie d'Actif et de Passif (Amendé)
Les Garants s'engagent solidairement à indemniser la Société et les Nouveaux Investisseurs de tout préjudice direct ou indirect résultant d'un passif non révélé ou d'une surestimation d'actif antérieur à la Date de Réalisation.
Le seuil de minimis est expressément fixé à 15 000 € par réclamation, avec franchise relative.
Le plafond global d'indemnisation est strictement arrêté à 900 000 € (quinze pour cent du prix).

Article 5 - Départs des Dirigeants (Leaver Clauses & Décote Progressive)
En cas de départ qualifié de Bad Leaver (révocation pour faute lourde, violation d'engagement d'exclusivité), les actions détenues feront l'objet d'un rachat avec une décote statutaire de 30% la première année, 20% la seconde et 10% la troisième année.`,
      lastAmendedBy: 'Antoine Girard',
      lastAmendedAt: '2026-09-15T08:42:00.000Z',
      amendmentNotes: 'Annotations de correction et consignes de révision impératives.',
    },
    interDepRequests: [
      {
        id: 'idr-3',
        dossierId: 'dossier-jur-089',
        dossierRef: 'DOS-2026-JUR-089',
        fromDepartment: 'Juridique',
        toDepartment: 'Fiscalité',
        requesterName: 'Éléonore Vasseur',
        title: 'Validation fiscale du report d’imposition (Art. 150-0 B ter CGI)',
        description:
          'Audit du schéma d’apport préalable des titres à la holding animatrice avant réinvestissement.',
        status: 'in_progress',
        priority: 'urgent',
        requestedAt: '2026-09-13T14:30:00.000Z',
        dueDate: '2026-09-17T17:00:00.000Z',
        resolutionNotes: 'En cours d’analyse par Claire Bernard (Pôle Fiscalité).',
      },
    ],
    auditTrail: [
      {
        id: 'aud-20',
        timestamp: '2026-09-05T14:00:10.000Z',
        actorId: 'usr-eleonore',
        actorName: 'Éléonore Vasseur',
        actorDepartment: 'Juridique',
        actorRole: 'Avocate / Juriste Junior',
        ipAddress: '192.168.1.78',
        action: 'creation',
        details: 'Rédaction du premier jet du pacte d’actionnaires NovaTech.',
      },
      {
        id: 'aud-21',
        timestamp: '2026-09-13T11:20:00.000Z',
        actorId: 'usr-eleonore',
        actorName: 'Éléonore Vasseur',
        actorDepartment: 'Juridique',
        actorRole: 'Avocate / Juriste Junior',
        ipAddress: '192.168.1.78',
        action: 'soumission_n1',
        details: 'Soumission au N+1 Antoine Girard pour relecture critique.',
      },
      {
        id: 'aud-22',
        timestamp: '2026-09-15T08:45:00.000Z',
        actorId: 'usr-antoine',
        actorName: 'Antoine Girard',
        actorDepartment: 'Juridique',
        actorRole: 'Associé Référent',
        ipAddress: '192.168.1.4',
        action: 'demande_corrections',
        details:
          'Demande de corrections avec consignes strictes sur GAP et clause Bad Leaver. Statut repassé au collaborateur.',
      },
    ],
  },
  {
    id: 'dossier-fis-102',
    ref: 'DOS-2026-FIS-102',
    title: 'Audit d’Intégration Fiscale & Fusion-Absorption - Omnis Group',
    clientName: 'Omnis Group Participations',
    clientSiret: '529 881 230 00045',
    department: 'Fiscalité',
    typology: 'Intégration Fiscale & Restructuration',
    priority: 'medium',
    status: 'valide',
    maker: {
      id: 'usr-thomas',
      name: 'Thomas Leroy',
      email: 't.leroy@cabinet.fr',
      department: 'Fiscalité',
      role: 'collaborateur',
    },
    checker: {
      id: 'usr-claire',
      name: 'Claire Bernard',
      email: 'c.bernard@cabinet.fr',
      department: 'Fiscalité',
      role: 'manager',
    },
    lock: {
      isLocked: true,
      lockedBy: {
        id: 'usr-claire',
        name: 'Claire Bernard',
        email: 'c.bernard@cabinet.fr',
        department: 'Fiscalité',
        role: 'manager',
      },
      lockedAt: '2026-09-14T18:00:00.000Z',
      reason: 'Dossier approuvé et verrouillé avant transmission officielle à l’administration',
    },
    estimatedDeliverableDate: '2026-09-20',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-14T18:00:00.000Z',
    approvedAt: '2026-09-14T18:00:00.000Z',
    dataFields: [
      {
        id: 'df-30',
        label: 'Déficit Antérieur Transmis (Art. 209-II CGI)',
        category: 'fiscal',
        previousValue: 2400000,
        currentValue: 2400000,
        unit: '€',
        notes: 'Agrément fiscal obtenu auprès de la DGFIP',
      },
      {
        id: 'df-31',
        label: 'Économie d’IS Consolidée Groupe',
        category: 'fiscal',
        previousValue: 580000,
        currentValue: 600000,
        unit: '€',
        notes: 'Imputation intégrale sur le résultat d’intégration',
      },
    ],
    textDocument: {
      documentId: 'doc-omnis-fis-102',
      title: 'Consultation Fiscale Agréée - Report de Déficits',
      type: 'conclusions_fiscales',
      previousContent: `L'opération de fusion-absorption entre la SAS Alpha et la SAS Bêta bénéficie du régime de faveur des fusions (art. 210 A du CGI).
Le transfert des déficits antérieurs a été validé sous réserve d'absence de changement d'activité significative pendant 3 ans.`,
      currentContent: `L'opération de fusion-absorption entre la SAS Alpha et la SAS Bêta bénéficie de plein droit du régime de faveur des fusions (art. 210 A du CGI).
Le transfert des déficits antérieurs d'un montant de 2 400 000 € a été officiellement homologué par rescrit de la DGFIP. Les obligations déclaratives annexes sont intégralement satisfaites.`,
      lastAmendedBy: 'Claire Bernard',
      lastAmendedAt: '2026-09-14T17:50:00.000Z',
      amendmentNotes: 'Validation définitive par le Manager Fiscalité.',
    },
    interDepRequests: [],
    auditTrail: [
      {
        id: 'aud-30',
        timestamp: '2026-09-01T09:00:00.000Z',
        actorId: 'usr-thomas',
        actorName: 'Thomas Leroy',
        actorDepartment: 'Fiscalité',
        actorRole: 'Collaborateur Fiscaliste',
        ipAddress: '192.168.1.42',
        action: 'creation',
        details: 'Création du dossier de rescrit fiscal Omnis Group.',
      },
      {
        id: 'aud-31',
        timestamp: '2026-09-14T18:00:00.000Z',
        actorId: 'usr-claire',
        actorName: 'Claire Bernard',
        actorDepartment: 'Fiscalité',
        actorRole: 'Manager Fiscalité',
        ipAddress: '192.168.1.18',
        action: 'validation_finale',
        details:
          'Validation finale du dossier (Checker approved) et verrouillage strict pour conformité zéro défaut.',
      },
    ],
  },
];

/**
 * Load all review dossiers (with local storage persistence)
 */
export function getStoredDossiers(): ReviewDossier[] {
  if (typeof window === 'undefined') return INITIAL_DOSSIERS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DOSSIERS));
      return INITIAL_DOSSIERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DOSSIERS;
  } catch {
    return INITIAL_DOSSIERS;
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
          ? dossier.correctionNotes // retain past notes as reference
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
