import { Task, Category } from '@/types/task';
import { ReviewDossier, Department } from '@/types/review';
import { isTaskOverdue, formatDueDateFrench } from '@/lib/reminders';

export type ReportPeriod = 'current_month' | 'current_quarter' | 'current_year' | 'last_30_days' | 'all';

export type ReportType = 'executive_board' | 'review_progress' | 'operational_tasks';

export interface ReportConfig {
  period: ReportPeriod;
  department: 'Tous' | Department;
  reportType: ReportType;
  includeCharts: boolean;
  includeAuditTrail: boolean;
  includeRiskAnalysis: boolean;
  includeAIRecommendations: boolean;
  customTitle?: string;
  authorName?: string;
}

export interface DepartmentMetric {
  department: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  totalDossiers: number;
  validatedDossiers: number;
  dossiersInProgress: number;
  blockedRequests: number;
}

export interface ReportMetrics {
  generatedAt: string;
  generatedAtFormatted: string;
  periodLabel: string;
  departmentLabel: string;
  // Tasks KPIs
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  urgentTasksCount: number;
  highPriorityCount: number;
  // Review Dossiers KPIs
  totalDossiers: number;
  validatedDossiers: number;
  lockedDossiers: number;
  dossiersInProgress: number;
  dossiersNeedCorrections: number;
  dossiersArchived: number;
  dossierApprovalRate: number;
  // Inter-department Gateway
  totalInterDepRequests: number;
  pendingInterDepRequests: number;
  blockedInterDepRequests: number;
  // Department breakdown
  departments: DepartmentMetric[];
  // Risk Analysis
  criticalTasks: Task[];
  criticalDossiers: ReviewDossier[];
  // Recommendations
  recommendations: string[];
}

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  current_month: 'Mois en cours',
  current_quarter: 'Trimestre en cours (T4)',
  current_year: 'Exercice Annuel 2026',
  last_30_days: '30 derniers jours glissants',
  all: 'Période intégrale (Historique complet)',
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  executive_board: 'Synthèse Exécutive pour Comité de Direction',
  review_progress: "Revue d'Avancement des Dossiers & Maker-Checker",
  operational_tasks: 'Bilan Opérationnel des Tâches & Productivité',
};

/**
 * Filter tasks according to selected period and department
 */
export function filterTasksForReport(
  tasks: Task[],
  period: ReportPeriod,
  department: 'Tous' | Department,
  categories: Category[]
): Task[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return tasks.filter((t) => {
    // 1. Department filter
    if (department !== 'Tous') {
      const catObj = categories.find((c) => c.id === t.category);
      const catName = catObj ? catObj.name.toLowerCase() : t.category.toLowerCase();
      const targetDept = department.toLowerCase();
      const matchesDept =
        catName.includes(targetDept) ||
        (t.category === 'fiscalite' && targetDept.includes('fisc')) ||
        (t.category === 'comptabilite' && targetDept.includes('compt')) ||
        (t.category === 'juridique' && targetDept.includes('jurid')) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(targetDept)));
      if (!matchesDept) return false;
    }

    // 2. Period filter
    if (period === 'all') return true;

    const taskDate = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
    if (isNaN(taskDate.getTime())) return true;

    if (period === 'current_month') {
      return (
        taskDate.getFullYear() === now.getFullYear() &&
        taskDate.getMonth() === now.getMonth()
      );
    }

    if (period === 'current_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const taskQuarter = Math.floor(taskDate.getMonth() / 3);
      return (
        taskDate.getFullYear() === now.getFullYear() &&
        taskQuarter === currentQuarter
      );
    }

    if (period === 'current_year') {
      return taskDate.getFullYear() === now.getFullYear();
    }

    if (period === 'last_30_days') {
      const diffMs = now.getTime() - taskDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= -1 && diffDays <= 30;
    }

    return true;
  });
}

/**
 * Filter review dossiers according to selected period and department
 */
export function filterDossiersForReport(
  dossiers: ReviewDossier[],
  period: ReportPeriod,
  department: 'Tous' | Department
): ReviewDossier[] {
  const now = new Date();

  return dossiers.filter((d) => {
    // 1. Department filter
    if (department !== 'Tous' && d.department !== department) {
      return false;
    }

    // 2. Period filter
    if (period === 'all') return true;

    const refDate = d.createdAt ? new Date(d.createdAt) : now;
    if (isNaN(refDate.getTime())) return true;

    if (period === 'current_month') {
      return (
        refDate.getFullYear() === now.getFullYear() &&
        refDate.getMonth() === now.getMonth()
      );
    }

    if (period === 'current_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const dossierQuarter = Math.floor(refDate.getMonth() / 3);
      return (
        refDate.getFullYear() === now.getFullYear() &&
        dossierQuarter === currentQuarter
      );
    }

    if (period === 'current_year') {
      return refDate.getFullYear() === now.getFullYear();
    }

    if (period === 'last_30_days') {
      const diffMs = now.getTime() - refDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= -1 && diffDays <= 30;
    }

    return true;
  });
}

/**
 * Calculate full reporting metrics and executive analysis
 */
export function calculateReportMetrics(
  allTasks: Task[],
  categories: Category[],
  allDossiers: ReviewDossier[],
  config: ReportConfig
): ReportMetrics {
  const filteredTasks = filterTasksForReport(
    allTasks,
    config.period,
    config.department,
    categories
  );
  const filteredDossiers = filterDossiersForReport(
    allDossiers,
    config.period,
    config.department
  );

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = filteredTasks.filter((t) => isTaskOverdue(t)).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const urgentTasksCount = filteredTasks.filter((t) => t.priority === 'urgent').length;
  const highPriorityCount = filteredTasks.filter((t) => t.priority === 'high').length;

  const totalDossiers = filteredDossiers.length;
  const validatedDossiers = filteredDossiers.filter((d) => d.status === 'valide').length;
  const lockedDossiers = filteredDossiers.filter((d) => d.lock?.isLocked).length;
  const dossiersInProgress = filteredDossiers.filter(
    (d) => d.status === 'en_revision' || d.status === 'amendements' || d.status === 'soumis'
  ).length;
  const dossiersNeedCorrections = filteredDossiers.filter(
    (d) => d.status === 'demande_corrections'
  ).length;
  const dossiersArchived = filteredDossiers.filter((d) => d.status === 'archive').length;

  const dossierApprovalRate =
    totalDossiers > 0 ? Math.round((validatedDossiers / totalDossiers) * 100) : 0;

  // Inter-department requests
  let totalInterDepRequests = 0;
  let pendingInterDepRequests = 0;
  let blockedInterDepRequests = 0;

  filteredDossiers.forEach((d) => {
    if (d.interDepRequests && Array.isArray(d.interDepRequests)) {
      totalInterDepRequests += d.interDepRequests.length;
      pendingInterDepRequests += d.interDepRequests.filter(
        (r) => r.status === 'pending' || r.status === 'in_progress'
      ).length;
      blockedInterDepRequests += d.interDepRequests.filter(
        (r) => r.status === 'blocked'
      ).length;
    }
  });

  // Department breakdown
  const departmentsList: Department[] = [
    'Fiscalité',
    'Comptabilité',
    'Juridique',
    'Recherche & Innovation',
  ];

  const departmentMetrics: DepartmentMetric[] = departmentsList.map((dept) => {
    const deptTasks = filterTasksForReport(allTasks, config.period, dept, categories);
    const deptCompleted = deptTasks.filter((t) => t.completed).length;
    const deptOverdue = deptTasks.filter((t) => isTaskOverdue(t)).length;
    const deptRate = deptTasks.length > 0 ? Math.round((deptCompleted / deptTasks.length) * 100) : 0;

    const deptDossiers = filterDossiersForReport(allDossiers, config.period, dept);
    const deptValidated = deptDossiers.filter((d) => d.status === 'valide').length;
    const deptInProg = deptDossiers.filter(
      (d) => d.status === 'en_revision' || d.status === 'amendements' || d.status === 'soumis'
    ).length;

    let deptBlocked = 0;
    deptDossiers.forEach((d) => {
      if (d.interDepRequests) {
        deptBlocked += d.interDepRequests.filter((r) => r.status === 'blocked').length;
      }
    });

    return {
      department: dept,
      totalTasks: deptTasks.length,
      completedTasks: deptCompleted,
      pendingTasks: deptTasks.length - deptCompleted,
      overdueTasks: deptOverdue,
      completionRate: deptRate,
      totalDossiers: deptDossiers.length,
      validatedDossiers: deptValidated,
      dossiersInProgress: deptInProg,
      blockedRequests: deptBlocked,
    };
  });

  // Critical items for risk matrix
  const criticalTasks = filteredTasks
    .filter((t) => !t.completed && (t.priority === 'urgent' || isTaskOverdue(t)))
    .slice(0, 8);

  const criticalDossiers = filteredDossiers
    .filter(
      (d) =>
        d.status === 'demande_corrections' ||
        (d.interDepRequests && d.interDepRequests.some((r) => r.status === 'blocked'))
    )
    .slice(0, 6);

  // Recommendations Generation
  const recommendations: string[] = [];

  if (overdueTasks > 0) {
    recommendations.push(
      `Traiter en priorité les ${overdueTasks} tâche(s) en retard afin de sécuriser les jalons légaux et de clôture.`
    );
  }
  if (dossiersNeedCorrections > 0) {
    recommendations.push(
      `Accompagner les ${dossiersNeedCorrections} dossier(s) en demande de corrections pour débloquer la validation N+1.`
    );
  }
  if (blockedInterDepRequests > 0) {
    recommendations.push(
      `Résoudre les ${blockedInterDepRequests} requête(s) inter-pôles bloquantes pour restaurer la fluidité entre départements.`
    );
  }
  if (completionRate >= 80) {
    recommendations.push(
      `Excellente dynamique opérationnelle globale (${completionRate}% de complétion) : maintenir les revues hebdomadaires de validation.`
    );
  } else if (totalTasks > 0) {
    recommendations.push(
      `Le taux de complétion actuel (${completionRate}%) suggère un renforcement ponctuel des ressources sur les dossiers prioritaires.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      `L'ensemble des dossiers et des tâches est en conformité sans blocage identifié pour la période.`
    );
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    generatedAt: now.toISOString(),
    generatedAtFormatted: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1),
    periodLabel: REPORT_PERIOD_LABELS[config.period],
    departmentLabel: config.department === 'Tous' ? 'Cabinet Global (Tous départements)' : `Pôle ${config.department}`,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate,
    urgentTasksCount,
    highPriorityCount,
    totalDossiers,
    validatedDossiers,
    lockedDossiers,
    dossiersInProgress,
    dossiersNeedCorrections,
    dossiersArchived,
    dossierApprovalRate,
    totalInterDepRequests,
    pendingInterDepRequests,
    blockedInterDepRequests,
    departments: departmentMetrics,
    criticalTasks,
    criticalDossiers,
    recommendations,
  };
}

/**
 * Generate full self-contained printable HTML document
 */
export function generateStandaloneHTMLReport(
  metrics: ReportMetrics,
  config: ReportConfig,
  metadata?: { companyName?: string; subtitle?: string }
): string {
  const companyName = metadata?.companyName || 'MFISCA & ASSOCIÉS';
  const title = config.customTitle || REPORT_TYPE_LABELS[config.reportType];
  const author = config.authorName || 'Direction de la Qualité & Supervision';

  const rowsDept = metrics.departments
    .map(
      (d) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 14px; font-weight: 600; color: #0f172a;">${d.department}</td>
        <td style="padding: 10px 14px; text-align: center; color: #334155;">${d.totalTasks}</td>
        <td style="padding: 10px 14px; text-align: center; color: #166534; font-weight: bold;">${d.completedTasks}</td>
        <td style="padding: 10px 14px; text-align: center; color: ${d.overdueTasks > 0 ? '#b91c1c' : '#64748b'}; font-weight: bold;">${d.overdueTasks}</td>
        <td style="padding: 10px 14px; text-align: center; color: #047857; font-weight: bold;">${d.completionRate}%</td>
        <td style="padding: 10px 14px; text-align: center; color: #334155;">${d.totalDossiers}</td>
        <td style="padding: 10px 14px; text-align: center; color: ${d.blockedRequests > 0 ? '#b91c1c' : '#64748b'}; font-weight: bold;">${d.blockedRequests}</td>
      </tr>`
    )
    .join('');

  const criticalTasksHtml =
    metrics.criticalTasks.length > 0
      ? metrics.criticalTasks
          .map(
            (t) => `
        <div style="padding: 10px 14px; margin-bottom: 8px; border-left: 4px solid #ef4444; background: #fef2f2; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #991b1b; font-size: 13px;">${t.title}</strong>
            <span style="font-size: 11px; font-weight: bold; padding: 2px 8px; background: #fee2e2; color: #991b1b; border-radius: 9999px;">
              ${t.priority.toUpperCase()} · Échéance: ${formatDueDateFrench(t.dueDate)}
            </span>
          </div>
          ${t.description ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">${t.description}</p>` : ''}
        </div>`
          )
          .join('')
      : '<p style="color: #166534; font-size: 13px; font-style: italic;">Aucune tâche critique ou en retard répertoriée.</p>';

  const recommendationsHtml = metrics.recommendations
    .map(
      (rec, i) => `
      <li style="margin-bottom: 8px; color: #1e293b; font-size: 13px; line-height: 1.5;">
        <strong>Action ${i + 1} :</strong> ${rec}
      </li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} — ${companyName}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.45;
    }
    .header-box {
      border-bottom: 2px solid #059669;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: #047857;
      margin-top: 4px;
    }
    .kpi-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 24px;
    }
    th {
      background: #f1f5f9;
      padding: 10px 14px;
      text-align: center;
      font-weight: 700;
      color: #334155;
      border-bottom: 2px solid #cbd5e1;
    }
    th:first-child {
      text-align: left;
    }
    .section-title {
      font-size: 15px;
      font-weight: 800;
      color: #064e3b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin: 24px 0 14px 0;
    }
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 12px 24px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    @media print {
      .print-btn { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimer en PDF (Ctrl+P)</button>

  <div class="header-box">
    <div>
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #059669; text-transform: uppercase;">
        ${companyName} · RAPPORT OFFICIEL
      </div>
      <h1 style="margin: 4px 0 6px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
        ${title}
      </h1>
      <div style="font-size: 12px; color: #475569;">
        Périmètre : <strong>${metrics.departmentLabel}</strong> · Période : <strong>${metrics.periodLabel}</strong>
      </div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      <div>Émis le : <strong>${metrics.generatedAtFormatted}</strong></div>
      <div>Signataire : <strong>${author}</strong></div>
      <div style="margin-top: 4px; display: inline-block; padding: 2px 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-weight: bold; border-radius: 4px;">
        CONFORME AUDIT &amp; TRAÇABILITÉ
      </div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Taux de Complétion</div>
      <div class="kpi-value">${metrics.completionRate}%</div>
      <div style="font-size: 11px; color: #64748b;">${metrics.completedTasks} sur ${metrics.totalTasks} tâches</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Dossiers Validés N+1</div>
      <div class="kpi-value" style="color: #0284c7;">${metrics.validatedDossiers}</div>
      <div style="font-size: 11px; color: #64748b;">${metrics.totalDossiers} dossiers suivis</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tâches en Retard</div>
      <div class="kpi-value" style="color: ${metrics.overdueTasks > 0 ? '#dc2626' : '#059669'};">
        ${metrics.overdueTasks}
      </div>
      <div style="font-size: 11px; color: #64748b;">${metrics.urgentTasksCount} urgentes</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Passerelles Inter-Pôles</div>
      <div class="kpi-value" style="color: ${metrics.blockedInterDepRequests > 0 ? '#ea580c' : '#059669'};">
        ${metrics.totalInterDepRequests}
      </div>
      <div style="font-size: 11px; color: #64748b;">${metrics.blockedInterDepRequests} bloquante(s)</div>
    </div>
  </div>

  <div class="section-title">1. Ventilation Opérationnelle par Département</div>
  <table>
    <thead>
      <tr>
        <th>Département</th>
        <th>Tâches</th>
        <th>Complétées</th>
        <th>Retards</th>
        <th>Taux</th>
        <th>Dossiers</th>
        <th>Blocages</th>
      </tr>
    </thead>
    <tbody>
      ${rowsDept}
    </tbody>
  </table>

  <div class="section-title">2. Points de Vigilance &amp; Risques Opérationnels</div>
  ${criticalTasksHtml}

  <div class="section-title">3. Recommandations Stratégiques pour le Comité</div>
  <ol style="padding-left: 20px; margin: 0;">
    ${recommendationsHtml}
  </ol>

  <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
    <span>Plateforme Planit · Cabinet Fiscal &amp; Juridique · Document d'audit immuable</span>
    <span>Page 1 / 1 · Généré automatiquement via le moteur d'export officiel</span>
  </div>
</body>
</html>`;
}

/**
 * Generate formatted Markdown report for emails and meeting minutes
 */
export function generateExecutiveMarkdownReport(
  metrics: ReportMetrics,
  config: ReportConfig
): string {
  const title = config.customTitle || REPORT_TYPE_LABELS[config.reportType];
  const dateStr = metrics.generatedAtFormatted;

  return `# ${title} — Planit
**Cabinet Fiscal & Juridique**  
**Date d'émission :** ${dateStr}  
**Périmètre :** ${metrics.departmentLabel}  
**Période d'analyse :** ${metrics.periodLabel}  

---

## 1. Indicateurs Clés de Performance (KPIs)
- **Taux de complétion global :** ${metrics.completionRate}% (${metrics.completedTasks} achevées / ${metrics.totalTasks} au total)
- **Tâches en retard :** ${metrics.overdueTasks} (${metrics.urgentTasksCount} urgentes)
- **Dossiers de revue suivis :** ${metrics.totalDossiers} (dont ${metrics.validatedDossiers} validés N+1 et ${metrics.lockedDossiers} verrouillés)
- **Requêtes inter-pôles :** ${metrics.totalInterDepRequests} (dont ${metrics.blockedInterDepRequests} bloquantes)

---

## 2. Synthèse par Pôle & Département
| Département | Tâches Totales | Complétées | Retards | Taux | Dossiers Suivis | Blocages |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${metrics.departments
  .map(
    (d) =>
      `| **${d.department}** | ${d.totalTasks} | ${d.completedTasks} | ${d.overdueTasks} | ${d.completionRate}% | ${d.totalDossiers} | ${d.blockedRequests} |`
  )
  .join('\n')}

---

## 3. Recommandations Stratégiques
${metrics.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---
*Rapport certifié généré par la plateforme Planit.*
`;
}
