import { Task, Priority, Recurrence, Subtask } from '@/types/task';
import { TrackedFile, FileVersionSnapshot } from '@/types/file-version';
import { generateChecksum, calculateNextVersion, inferFileType } from '@/lib/file-version-service';

export interface BenchmarkMetric {
  id: string;
  name: string;
  category: 'search' | 'sort' | 'versioning' | 'mutation' | 'memory';
  durationMs: number;
  opsPerSec: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  sampleCount: number;
  memoryBytesEstimated?: number;
  targetThresholdMs: number;
  status: 'pass' | 'warning' | 'fail';
  description: string;
}

export interface BenchmarkSuiteResult {
  volume: number;
  totalDurationMs: number;
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
  overallScore: number; // 0 - 100
  timestamp: string;
  fpsDuringRun?: number;
  systemInfo: {
    cores: number;
    memoryEstimate?: string;
    userAgent: string;
  };
  metrics: BenchmarkMetric[];
}

// Pseudo-random deterministic generator for consistent test results
class DeterministicRandom {
  private seed: number;

  constructor(seed = 123456789) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  intBetween(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

const CATEGORIES = ['Comptabilité', 'Fiscalité', 'Juridique', 'Social & RH', 'Audit', 'Gestion'];
const TAGS_POOL = ['Urgent', 'Bilan2025', 'TVA', 'Audit', 'ClientVIP', 'Revue', 'M365', 'Confidential', 'Clôture', 'Facturation'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly'];
const STATUSES: ('todo' | 'in_progress' | 'completed')[] = ['todo', 'in_progress', 'completed'];

const TITLE_PREFIXES = [
  'Vérification des écritures',
  'Validation de la déclaration',
  'Préparation du dossier',
  'Audit annuel des comptes',
  'Rapprochement bancaire',
  'Déclaration trimestrielle',
  'Synthèse de situation',
  'Contrôle interne des flux',
  'Calcul des provisions',
  'Établissement des liasses',
];

const TITLE_OBJECTS = [
  'Société Alpha',
  'Groupe Horizon',
  'Filiale Sud',
  'Holding Valor',
  'Client Partenaire',
  'Atelier Central',
  'Région Ouest',
  'Comptes de tiers',
  'Fournisseurs stratégiques',
  'Trésorerie consolidée',
];

/**
 * Generate a massive, deterministic dataset of realistic tasks
 */
export function generateVolumetricDataset(
  count: number,
  options: { seed?: number; includeTrackedFiles?: boolean; versionsPerFile?: number } = {}
): Task[] {
  const rng = new DeterministicRandom(options.seed ?? 42);
  const includeFiles = options.includeTrackedFiles ?? true;
  const versionsCount = options.versionsPerFile ?? 3;

  const baseDate = new Date('2026-10-01T08:00:00.000Z');
  const tasks: Task[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const dayOffset = (i % 60) - 15; // Spread over past 15 days to upcoming 45 days
    const taskDate = new Date(baseDate.getTime() + dayOffset * 86400000);
    const dueDateStr = taskDate.toISOString().slice(0, 10);
    const dueTimeHour = 8 + (i % 11);
    const dueTimeMinute = (i % 4) * 15;
    const dueTimeStr = `${String(dueTimeHour).padStart(2, '0')}:${String(dueTimeMinute).padStart(2, '0')}`;

    const priority = rng.choice(PRIORITIES);
    const category = rng.choice(CATEGORIES);
    const status = rng.choice(STATUSES);
    const completed = status === 'completed';

    // Tags (1 to 3 tags)
    const tagCount = rng.intBetween(1, 3);
    const tags: string[] = [];
    for (let t = 0; t < tagCount; t++) {
      const tag = rng.choice(TAGS_POOL);
      if (!tags.includes(tag)) tags.push(tag);
    }

    // Subtasks (0 to 4)
    const subtaskCount = i % 5;
    const subtasks: Subtask[] = [];
    for (let s = 0; s < subtaskCount; s++) {
      subtasks.push({
        id: `sub-${i}-${s}`,
        title: `Étape ${s + 1} de contrôle interne`,
        completed: s < 2,
      });
    }

    // Optional Tracked files with versions
    let trackedFiles: TrackedFile[] | undefined = undefined;
    if (includeFiles && i % 3 === 0) {
      const versions: FileVersionSnapshot[] = [];
      for (let v = versionsCount; v >= 1; v--) {
        const verStr = `v1.${v - 1}`;
        const contentSample = `Contenu du document de travail #${i} version ${verStr} pour audit fiscal et comptable. Ligne de contrôle ${v}.`;
        versions.push({
          id: `ver-${i}-${v}`,
          versionNumber: verStr,
          createdAt: new Date(baseDate.getTime() - (versionsCount - v) * 3600000).toISOString(),
          authorName: v % 2 === 0 ? 'Marie Curie' : 'Jean Dupont',
          authorRole: v % 2 === 0 ? 'Expert-Comptable' : 'Collaborateur Senior',
          summary: v === 1 ? 'Création initiale du document' : `Révision ${v} avec ajustement des soldes`,
          sizeBytes: 15420 + v * 320,
          fileName: `Dossier_Synthese_${i}.xlsx`,
          fileType: 'xlsx',
          textContent: contentSample,
          checksum: generateChecksum(contentSample),
          isCurrent: v === versionsCount,
        });
      }

      trackedFiles = [
        {
          id: `file-${i}`,
          name: `Dossier Synthèse ${i}.xlsx`,
          originalName: `Dossier_Synthese_${i}.xlsx`,
          fileType: 'xlsx',
          createdAt: versions[versions.length - 1].createdAt,
          updatedAt: versions[0].createdAt,
          currentVersion: versions[0].versionNumber,
          versions,
        },
      ];
    }

    const titlePrefix = rng.choice(TITLE_PREFIXES);
    const titleObj = rng.choice(TITLE_OBJECTS);

    tasks[i] = {
      id: `task-load-${i + 1}`,
      title: `${titlePrefix} - ${titleObj} #${i + 1}`,
      description: `Procédure de travail volumétrique standard pour l'entité ${titleObj}. Vérifier les justificatifs et conformité fiscale. Référence interne: REF-${i * 7 + 101}.`,
      dueDate: dueDateStr,
      dueTime: dueTimeStr,
      priority,
      category,
      completed,
      status,
      completedAt: completed ? taskDate.toISOString() : undefined,
      createdAt: new Date(baseDate.getTime() - 86400000 * 2).toISOString(),
      updatedAt: taskDate.toISOString(),
      reminderMinutesBefore: i % 4 === 0 ? 30 : -1,
      recurrence: i % 10 === 0 ? rng.choice(RECURRENCES) : 'none',
      tags,
      subtasks,
      trackedFiles,
    };
  }

  return tasks;
}

/**
 * Measure percentile latencies from an array of durations
 */
function computePercentiles(durations: number[]): { p50: number; p95: number; p99: number; max: number } {
  if (durations.length === 0) return { p50: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || sorted[0];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
  const max = sorted[sorted.length - 1];
  return { p50, p95, p99, max };
}

/**
 * Benchmark 1: Multi-criteria Search & Filtering
 */
export function benchmarkFilteringAndSearch(tasks: Task[], iterations = 25): BenchmarkMetric {
  const queryQueries = ['Alpha', 'Bilan', '2025', 'Audit', 'Comptabilité', 'Horizon', 'Fiscal'];
  const durations: number[] = [];
  let totalMatches = 0;

  for (let it = 0; it < iterations; it++) {
    const q = queryQueries[it % queryQueries.length].toLowerCase();
    const targetPriority = PRIORITIES[it % PRIORITIES.length];
    const targetCategory = CATEGORIES[it % CATEGORIES.length];

    const t0 = performance.now();

    // Standard complex multi-criteria filter expression used in app
    const matches = tasks.filter((task) => {
      // 1. Text search across title, description and tags
      const matchText =
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        task.tags.some((t) => t.toLowerCase().includes(q));

      if (!matchText) return false;

      // 2. Multi-field filtering (priority or category)
      const matchMeta = task.priority === targetPriority || task.category === targetCategory;
      return matchMeta;
    });

    const elapsed = performance.now() - t0;
    durations.push(elapsed);
    totalMatches += matches.length;
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const { p50, p95, p99, max } = computePercentiles(durations);
  const opsPerSec = Math.round((iterations / (durations.reduce((a, b) => a + b, 0) / 1000)));

  // Target threshold: under 16ms for 60fps responsiveness on 10,000 tasks
  const targetThresholdMs = 16;
  const status: 'pass' | 'warning' | 'fail' =
    p95 <= targetThresholdMs ? 'pass' : p95 <= targetThresholdMs * 2.5 ? 'warning' : 'fail';

  return {
    id: 'search_filtering',
    name: 'Recherche & Filtrage multicritères',
    category: 'search',
    durationMs: parseFloat(avgDuration.toFixed(2)),
    opsPerSec,
    p50Ms: parseFloat(p50.toFixed(2)),
    p95Ms: parseFloat(p95.toFixed(2)),
    p99Ms: parseFloat(p99.toFixed(2)),
    maxMs: parseFloat(max.toFixed(2)),
    sampleCount: iterations,
    targetThresholdMs,
    status,
    description: `Fouille plein texte et filtrage combiné (titre, tags, description, priorités, catégories) sur ${tasks.length.toLocaleString('fr-FR')} tâches. ${totalMatches} résultats cumulés analysés.`,
  };
}

/**
 * Benchmark 2: Multi-Key Sorting & Dynamic Grouping
 */
export function benchmarkSortingAndGrouping(tasks: Task[], iterations = 15): BenchmarkMetric {
  const durations: number[] = [];

  for (let it = 0; it < iterations; it++) {
    const t0 = performance.now();

    // 1. Multi-key sort: by status completed -> dueDate -> priority level -> title
    const priorityWeight: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const dateCmp = a.dueDate.localeCompare(b.dueDate);
      if (dateCmp !== 0) return dateCmp;
      const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (weightDiff !== 0) return weightDiff;
      return a.title.localeCompare(b.title);
    });

    // 2. Dynamic Grouping by category
    const groupedByCategory: Record<string, Task[]> = {};
    for (let i = 0; i < sorted.length; i++) {
      const task = sorted[i];
      if (!groupedByCategory[task.category]) {
        groupedByCategory[task.category] = [];
      }
      groupedByCategory[task.category].push(task);
    }

    // 3. Dynamic Grouping by status
    const groupedByStatus: Record<string, number> = { todo: 0, in_progress: 0, completed: 0 };
    for (let i = 0; i < sorted.length; i++) {
      const st = sorted[i].status || (sorted[i].completed ? 'completed' : 'todo');
      groupedByStatus[st] = (groupedByStatus[st] || 0) + 1;
    }

    const elapsed = performance.now() - t0;
    durations.push(elapsed);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const { p50, p95, p99, max } = computePercentiles(durations);
  const opsPerSec = Math.round((iterations / (durations.reduce((a, b) => a + b, 0) / 1000)));

  const targetThresholdMs = 45;
  const status: 'pass' | 'warning' | 'fail' =
    p95 <= targetThresholdMs ? 'pass' : p95 <= targetThresholdMs * 2 ? 'warning' : 'fail';

  return {
    id: 'sorting_grouping',
    name: 'Tri multicritères & Regroupement dynamique',
    category: 'sort',
    durationMs: parseFloat(avgDuration.toFixed(2)),
    opsPerSec,
    p50Ms: parseFloat(p50.toFixed(2)),
    p95Ms: parseFloat(p95.toFixed(2)),
    p99Ms: parseFloat(p99.toFixed(2)),
    maxMs: parseFloat(max.toFixed(2)),
    sampleCount: iterations,
    targetThresholdMs,
    status,
    description: `Tri composite (complétion + date d'échéance + poids de priorité + libellé) et partitionnement instantané par catégorie & statut.`,
  };
}

/**
 * Benchmark 3: File Versioning, Hashing & Historical Resolution
 */
export function benchmarkFileVersionOperations(tasks: Task[]): BenchmarkMetric {
  const trackedFiles: TrackedFile[] = [];
  tasks.forEach((t) => {
    if (t.trackedFiles) {
      trackedFiles.push(...t.trackedFiles);
    }
  });

  const iterations = Math.max(10, Math.min(trackedFiles.length, 1000));
  const durations: number[] = [];

  for (let it = 0; it < 10; it++) {
    const t0 = performance.now();

    for (let i = 0; i < iterations; i++) {
      const file = trackedFiles[i % (trackedFiles.length || 1)];
      if (!file) continue;

      // 1. Calculate next version strings (minor and major)
      calculateNextVersion(file.currentVersion, false);
      calculateNextVersion(file.currentVersion, true);

      // 2. Infer file type
      inferFileType(file.name);

      // 3. Checksum verification across versions
      file.versions.forEach((ver) => {
        if (ver.textContent) {
          const freshHash = generateChecksum(ver.textContent);
          if (ver.checksum && ver.checksum !== freshHash) {
            // Integrity check simulated
          }
        }
      });
    }

    const elapsed = performance.now() - t0;
    durations.push(elapsed);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const { p50, p95, p99, max } = computePercentiles(durations);
  const totalOps = iterations * 10;
  const opsPerSec = Math.round((totalOps / (durations.reduce((a, b) => a + b, 0) / 1000)));

  const targetThresholdMs = 20;
  const status: 'pass' | 'warning' | 'fail' =
    p95 <= targetThresholdMs ? 'pass' : p95 <= targetThresholdMs * 2 ? 'warning' : 'fail';

  return {
    id: 'file_versioning',
    name: 'Moteur de versionnage & Sommes de contrôle',
    category: 'versioning',
    durationMs: parseFloat(avgDuration.toFixed(2)),
    opsPerSec,
    p50Ms: parseFloat(p50.toFixed(2)),
    p95Ms: parseFloat(p95.toFixed(2)),
    p99Ms: parseFloat(p99.toFixed(2)),
    maxMs: parseFloat(max.toFixed(2)),
    sampleCount: iterations,
    targetThresholdMs,
    status,
    description: `Audit d'intégrité, calculs incrémentaux de révisions et validation des checksums cryptographiques sur ${iterations.toLocaleString('fr-FR')} fichiers et versions.`,
  };
}

/**
 * Benchmark 4: Batch Mutations & State Update Throughput
 */
export function benchmarkBatchMutations(tasks: Task[], iterations = 10): BenchmarkMetric {
  const durations: number[] = [];

  for (let it = 0; it < iterations; it++) {
    const t0 = performance.now();

    // Simulate immutable mass update (e.g. bulk mark completed, add tag, update reminder)
    const updated = tasks.map((t, idx) => {
      if (idx % 2 === 0) {
        return {
          ...t,
          completed: !t.completed,
          status: (!t.completed ? 'completed' : 'todo') as 'completed' | 'todo',
          tags: t.tags.includes('AuditVolumique') ? t.tags : [...t.tags, 'AuditVolumique'],
          updatedAt: '2026-10-13T12:00:00.000Z',
        };
      }
      return t;
    });

    if (updated.length === 0) break;

    const elapsed = performance.now() - t0;
    durations.push(elapsed);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const { p50, p95, p99, max } = computePercentiles(durations);
  const opsPerSec = Math.round((iterations / (durations.reduce((a, b) => a + b, 0) / 1000)));

  const targetThresholdMs = 20;
  const status: 'pass' | 'warning' | 'fail' =
    p95 <= targetThresholdMs ? 'pass' : p95 <= targetThresholdMs * 2 ? 'warning' : 'fail';

  return {
    id: 'batch_mutations',
    name: 'Mutations et mises à jour immuables en lot',
    category: 'mutation',
    durationMs: parseFloat(avgDuration.toFixed(2)),
    opsPerSec,
    p50Ms: parseFloat(p50.toFixed(2)),
    p95Ms: parseFloat(p95.toFixed(2)),
    p99Ms: parseFloat(p99.toFixed(2)),
    maxMs: parseFloat(max.toFixed(2)),
    sampleCount: iterations,
    targetThresholdMs,
    status,
    description: `Clonage immuable et mise à jour massive d'attributs (statut, tags, horodatages) sur l'ensemble de la collection sans blocage UI.`,
  };
}

/**
 * Benchmark 5: Serialization, Payload Footprint & Memory Latency
 */
export function benchmarkSerializationAndMemory(tasks: Task[]): BenchmarkMetric {
  const t0 = performance.now();
  const serialized = JSON.stringify(tasks);
  const serializationMs = performance.now() - t0;

  const t1 = performance.now();
  const parsed = JSON.parse(serialized);
  const deserializationMs = performance.now() - t1;

  const totalDuration = serializationMs + deserializationMs;
  const estimatedBytes = serialized.length * 2; // UTF-16 in memory estimate

  const targetThresholdMs = 150;
  const status: 'pass' | 'warning' | 'fail' =
    totalDuration <= targetThresholdMs ? 'pass' : totalDuration <= targetThresholdMs * 2 ? 'warning' : 'fail';

  return {
    id: 'memory_serialization',
    name: 'Sérialisation JSON & Empreinte mémoire',
    category: 'memory',
    durationMs: parseFloat(totalDuration.toFixed(2)),
    opsPerSec: Math.round(1000 / Math.max(1, totalDuration)),
    p50Ms: parseFloat(serializationMs.toFixed(2)),
    p95Ms: parseFloat(totalDuration.toFixed(2)),
    p99Ms: parseFloat(totalDuration.toFixed(2)),
    maxMs: parseFloat(totalDuration.toFixed(2)),
    sampleCount: 1,
    memoryBytesEstimated: estimatedBytes,
    targetThresholdMs,
    status,
    description: `Encodage et décodage complet de l'état volumétrique (taille estimée: ${(estimatedBytes / 1024 / 1024).toFixed(2)} Mo). ${parsed.length} entités vérifiées.`,
  };
}

/**
 * Run complete benchmark suite with progress callback and non-blocking chunks
 */
export async function runFullBenchmarkSuite(
  volume = 10000,
  onProgress?: (phase: string, progressPercent: number) => void
): Promise<BenchmarkSuiteResult> {
  const startTime = performance.now();

  const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  // 1. Generation
  onProgress?.('Génération du jeu de données volumétrique...', 10);
  await yieldToEventLoop();
  const tasks = generateVolumetricDataset(volume, { seed: 42, includeTrackedFiles: true, versionsPerFile: 3 });

  // 2. Search & Filter
  onProgress?.('Exécution du banc de recherche et filtrage...', 30);
  await yieldToEventLoop();
  const searchMetric = benchmarkFilteringAndSearch(tasks, volume >= 25000 ? 10 : 25);

  // 3. Sort & Group
  onProgress?.('Banc d\'essai de tri multicritères et regroupement...', 50);
  await yieldToEventLoop();
  const sortMetric = benchmarkSortingAndGrouping(tasks, volume >= 25000 ? 5 : 15);

  // 4. File Versioning
  onProgress?.('Banc de calcul des révisions de fichiers et checksums...', 70);
  await yieldToEventLoop();
  const fileMetric = benchmarkFileVersionOperations(tasks);

  // 5. Batch Mutations
  onProgress?.('Stress-test des mutations immuables massives...', 85);
  await yieldToEventLoop();
  const mutationMetric = benchmarkBatchMutations(tasks, volume >= 25000 ? 5 : 10);

  // 6. Memory & Serialization
  onProgress?.('Analyse de l\'empreinte mémoire et sérialisation...', 95);
  await yieldToEventLoop();
  const memoryMetric = benchmarkSerializationAndMemory(tasks);

  onProgress?.('Finalisation des métriques et notation...', 100);
  await yieldToEventLoop();

  const totalDuration = performance.now() - startTime;
  const metrics = [searchMetric, sortMetric, fileMetric, mutationMetric, memoryMetric];

  // Calculate score and grade
  let passedCount = 0;
  let warningCount = 0;
  metrics.forEach((m) => {
    if (m.status === 'pass') passedCount++;
    else if (m.status === 'warning') warningCount++;
  });

  const rawScore = Math.round(((passedCount * 20) + (warningCount * 10)));
  const overallScore = Math.min(100, Math.max(0, rawScore));

  let overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'C';
  if (overallScore >= 95) overallGrade = 'A+';
  else if (overallScore >= 80) overallGrade = 'A';
  else if (overallScore >= 65) overallGrade = 'B';
  else if (overallScore >= 50) overallGrade = 'C';
  else overallGrade = 'D';

  const systemInfo = {
    cores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js Runtime',
    memoryEstimate:
      typeof performance !== 'undefined' && (performance as any).memory
        ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)} Mo utilisés`
        : undefined,
  };

  return {
    volume,
    totalDurationMs: parseFloat(totalDuration.toFixed(2)),
    overallGrade,
    overallScore,
    timestamp: new Date().toISOString(),
    systemInfo,
    metrics,
  };
}

/**
 * Format markdown benchmark report
 */
export function formatBenchmarkReportMarkdown(result: BenchmarkSuiteResult): string {
  const dateFormatted = new Date(result.timestamp).toLocaleString('fr-FR');
  const lines: string[] = [
    `# Rapport de Test de Charge & Performance Volumétrique`,
    ``,
    `**Date :** ${dateFormatted}  `,
    `**Volume testé :** ${result.volume.toLocaleString('fr-FR')} tâches  `,
    `**Score Global :** ${result.overallScore}/100 (Grade ${result.overallGrade})  `,
    `**Temps total du banc :** ${result.totalDurationMs} ms  `,
    `**Environnement :** ${result.systemInfo.cores} cœurs CPU | ${result.systemInfo.userAgent}  `,
    ``,
    `## Synthèse des Métriques`,
    ``,
    `| Métrique | Latence moy. (ms) | P95 (ms) | Cadence (ops/s) | Seuil UX | Statut |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`,
  ];

  result.metrics.forEach((m) => {
    const statusEmoji = m.status === 'pass' ? '✅ Conforme' : m.status === 'warning' ? '⚠️ Acceptable' : '❌ Hors seuil';
    lines.push(
      `| ${m.name} | ${m.durationMs} ms | ${m.p95Ms} ms | ${m.opsPerSec.toLocaleString('fr-FR')} | < ${m.targetThresholdMs} ms | ${statusEmoji} |`
    );
  });

  lines.push(``);
  lines.push(`## Détail des bancs d'essai`);
  lines.push(``);

  result.metrics.forEach((m) => {
    lines.push(`### ${m.name}`);
    lines.push(`- **Description :** ${m.description}`);
    lines.push(`- **Latence P50 (médiane) :** ${m.p50Ms} ms`);
    lines.push(`- **Latence P95 :** ${m.p95Ms} ms`);
    lines.push(`- **Latence P99 :** ${m.p99Ms} ms`);
    lines.push(`- **Latence Max :** ${m.maxMs} ms`);
    lines.push(`- **Débit mesuré :** ${m.opsPerSec.toLocaleString('fr-FR')} opérations/seconde`);
    if (m.memoryBytesEstimated) {
      lines.push(`- **Empreinte mémoire :** ${(m.memoryBytesEstimated / 1024 / 1024).toFixed(2)} Mo`);
    }
    lines.push(``);
  });

  lines.push(`---`);
  lines.push(`*Généré automatiquement par le Studio de Performance PlanIt.*`);

  return lines.join('\n');
}
