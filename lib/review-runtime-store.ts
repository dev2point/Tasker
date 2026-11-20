import { ReviewDossier } from '@/types/review';
import { INITIAL_DOSSIERS } from '@/lib/review-service';
import { FileVersionSnapshot } from '@/types/file-version';

const globalForDossiers = globalThis as typeof globalThis & {
  __runtimeReviewDossiers?: ReviewDossier[];
};

function getStore(): ReviewDossier[] {
  if (!globalForDossiers.__runtimeReviewDossiers) {
    globalForDossiers.__runtimeReviewDossiers = [...INITIAL_DOSSIERS];
  }
  return globalForDossiers.__runtimeReviewDossiers;
}

export function getRuntimeDossiers(): ReviewDossier[] {
  return getStore();
}

export function setRuntimeDossiers(next: ReviewDossier[]): void {
  globalForDossiers.__runtimeReviewDossiers = [...next];
}

export function findFileVersionInRuntimeDossiers(
  versionId: string,
  dossierId?: string | null
): { dossier: ReviewDossier; snapshot: FileVersionSnapshot } | null {
  const dossiers = getStore();
  for (const dossier of dossiers) {
    if (dossierId && dossier.id !== dossierId) continue;
    for (const file of dossier.trackedFiles || []) {
      const snap = file.versions.find((v) => v.id === versionId);
      if (snap) {
        return { dossier, snapshot: snap };
      }
    }
  }
  return null;
}
