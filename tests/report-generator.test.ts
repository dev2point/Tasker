import { describe, it, expect } from 'vitest';
import {
  calculateReportMetrics,
  generateStandaloneHTMLReport,
  generateExecutiveMarkdownReport,
  filterTasksForReport,
  filterDossiersForReport,
  ReportConfig,
} from '@/lib/report-generator';
import { Task, Category } from '@/types/task';
import { ReviewDossier } from '@/types/review';

describe('Report Generator & Executive PDF Module', () => {
  const mockCategories: Category[] = [
    { id: 'fiscalite', name: 'Fiscalité', color: '#10b981', bgLight: '#ecfdf5', iconName: 'calculator' },
    { id: 'juridique', name: 'Juridique', color: '#6366f1', bgLight: '#eef2ff', iconName: 'scale' },
    { id: 'comptabilite', name: 'Comptabilité', color: '#f59e0b', bgLight: '#fef3c7', iconName: 'landmark' },
  ];

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Déclaration TVA Trimestrielle',
      category: 'fiscalite',
      dueDate: '2026-11-15',
      priority: 'urgent',
      completed: true,
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
      reminderMinutesBefore: 15,
      recurrence: 'none',
      tags: ['tva', 'fiscal'],
      subtasks: [],
    },
    {
      id: 'task-2',
      title: 'Rédaction PV Assemblée Générale',
      category: 'juridique',
      dueDate: '2026-10-20', // Overdue
      priority: 'high',
      completed: false,
      createdAt: '2026-10-10T08:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z',
      reminderMinutesBefore: 60,
      recurrence: 'none',
      tags: ['ag', 'juridique'],
      subtasks: [],
    },
    {
      id: 'task-3',
      title: 'Clôture comptes semestriels',
      category: 'comptabilite',
      dueDate: '2026-11-30',
      priority: 'medium',
      completed: false,
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
      reminderMinutesBefore: 15,
      recurrence: 'none',
      tags: ['bilan'],
      subtasks: [],
    },
  ];

  const mockDossiers: ReviewDossier[] = [
    {
      id: 'dos-1',
      ref: 'DOS-FIS-2026-001',
      title: 'Contrôle Fiscal Holding Zenith',
      clientName: 'Holding Zenith',
      typology: 'Audit Fiscal',
      department: 'Fiscalité',
      maker: {
        id: 'u1',
        name: 'Sophie Laurent',
        email: 'sophie@cabinet.fr',
        department: 'Fiscalité',
        role: 'collaborateur',
      },
      status: 'valide',
      version: 2,
      priority: 'urgent',
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-02T08:00:00Z',
      estimatedDeliverableDate: '2026-11-20',
      lock: { isLocked: true },
      dataFields: [],
      textDocument: {
        documentId: 'doc-1',
        title: 'Note de Synthèse',
        type: 'note_synthese',
        previousContent: 'V1',
        currentContent: 'V2',
      },
      auditTrail: [],
      interDepRequests: [
        {
          id: 'req-1',
          dossierId: 'dos-1',
          dossierRef: 'DOS-FIS-2026-001',
          fromDepartment: 'Fiscalité',
          toDepartment: 'Comptabilité',
          requesterName: 'Sophie Laurent',
          title: 'Pièces comptables manquantes',
          description: 'Grand livre des comptes',
          status: 'blocked',
          priority: 'urgent',
          requestedAt: '2026-11-01T10:00:00Z',
          dueDate: '2026-11-02T18:00:00Z',
        },
      ],
    },
  ];

  const defaultConfig: ReportConfig = {
    period: 'all',
    department: 'Tous',
    reportType: 'executive_board',
    includeCharts: true,
    includeAuditTrail: true,
    includeRiskAnalysis: true,
    includeAIRecommendations: true,
  };

  it('calculates metrics correctly for all departments', () => {
    const metrics = calculateReportMetrics(mockTasks, mockCategories, mockDossiers, defaultConfig);

    expect(metrics.totalTasks).toBe(3);
    expect(metrics.completedTasks).toBe(1);
    expect(metrics.pendingTasks).toBe(2);
    expect(metrics.completionRate).toBe(33); // 1 / 3 = 33%
    expect(metrics.totalDossiers).toBe(1);
    expect(metrics.validatedDossiers).toBe(1);
    expect(metrics.blockedInterDepRequests).toBe(1);
    expect(metrics.departments.length).toBe(4);
  });

  it('filters by department correctly', () => {
    const filteredTasks = filterTasksForReport(mockTasks, 'all', 'Fiscalité', mockCategories);
    expect(filteredTasks.length).toBe(1);
    expect(filteredTasks[0].id).toBe('task-1');

    const filteredDossiers = filterDossiersForReport(mockDossiers, 'all', 'Juridique');
    expect(filteredDossiers.length).toBe(0);
  });

  it('generates a valid HTML report with corporate styling and printable layout', () => {
    const metrics = calculateReportMetrics(mockTasks, mockCategories, mockDossiers, defaultConfig);
    const html = generateStandaloneHTMLReport(metrics, defaultConfig);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('MFISCA & ASSOCIÉS');
    expect(html).toContain('Synthèse Exécutive pour Comité de Direction');
    expect(html).toContain('window.print()');
    expect(html).toContain('Fiscalité');
    expect(html).toContain('Taux de Complétion');
  });

  it('generates a clean markdown executive summary', () => {
    const metrics = calculateReportMetrics(mockTasks, mockCategories, mockDossiers, defaultConfig);
    const md = generateExecutiveMarkdownReport(metrics, defaultConfig);

    expect(md).toContain('# Synthèse Exécutive pour Comité de Direction — Planit');
    expect(md).toContain('Taux de complétion global');
    expect(md).toContain('Recommandations Stratégiques');
  });
});
