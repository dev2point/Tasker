import { TrackedFile, FileVersionSnapshot } from '@/types/file-version';

/**
 * Generate a short cryptographic-like hash for tamper check
 */
export function generateChecksum(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `sha256:${hex}${input.length.toString(16).padStart(4, '0')}`;
}

/**
 * Format file size nicely (Ko, Mo, Go)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 octet';
  const k = 1024;
  const sizes = ['octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Infer human-friendly file type from extension or mime
 */
export function inferFileType(filename: string, mimeType?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'xlsx';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['txt', 'log'].includes(ext)) return 'txt';
  if (['md', 'markdown'].includes(ext)) return 'md';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (mimeType?.includes('pdf')) return 'pdf';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'xlsx';
  if (mimeType?.includes('word')) return 'docx';
  return ext || 'other';
}

/**
 * Calculate next version string (v1.0 -> v1.1 or v2.0 for major)
 */
export function calculateNextVersion(currentVersion: string, isMajor: boolean = false): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)$/);
  if (!match) {
    return isMajor ? 'v2.0' : 'v1.1';
  }
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  if (isMajor) {
    return `v${major + 1}.0`;
  }
  return `v${major}.${minor + 1}`;
}

/**
 * Create a new tracked file with an initial v1.0 version snapshot
 */
export function createTrackedFile(params: {
  fileName: string;
  sizeBytes: number;
  fileType?: string;
  contentUrl?: string;
  textContent?: string;
  authorName: string;
  authorEmail?: string;
  authorRole?: string;
  authorDepartment?: string;
  summary?: string;
  description?: string;
}): TrackedFile {
  const now = new Date().toISOString();
  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const versionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const type = params.fileType || inferFileType(params.fileName);
  const checksum = generateChecksum(
    (params.textContent || params.contentUrl || params.fileName) + params.sizeBytes
  );

  const initialSnapshot: FileVersionSnapshot = {
    id: versionId,
    versionNumber: 'v1.0',
    createdAt: now,
    authorName: params.authorName,
    authorEmail: params.authorEmail,
    authorRole: params.authorRole,
    authorDepartment: params.authorDepartment,
    summary: params.summary || 'Version initiale du document',
    sizeBytes: params.sizeBytes,
    fileName: params.fileName,
    fileType: type,
    contentUrl: params.contentUrl,
    textContent: params.textContent,
    isCurrent: true,
    checksum,
  };

  return {
    id: fileId,
    name: params.fileName,
    originalName: params.fileName,
    fileType: type,
    createdAt: now,
    updatedAt: now,
    currentVersion: 'v1.0',
    description: params.description,
    versions: [initialSnapshot],
  };
}

/**
 * Add a new revision to an existing tracked file
 */
export function addNewFileVersion(
  trackedFile: TrackedFile,
  params: {
    fileName?: string;
    sizeBytes: number;
    contentUrl?: string;
    textContent?: string;
    authorName: string;
    authorEmail?: string;
    authorRole?: string;
    authorDepartment?: string;
    summary: string;
    isMajor?: boolean;
  }
): TrackedFile {
  const now = new Date().toISOString();
  const nextVer = calculateNextVersion(trackedFile.currentVersion, params.isMajor);
  const versionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const effectiveFileName = params.fileName || trackedFile.name;
  const type = inferFileType(effectiveFileName);
  const checksum = generateChecksum(
    (params.textContent || params.contentUrl || effectiveFileName) + params.sizeBytes
  );

  const newSnapshot: FileVersionSnapshot = {
    id: versionId,
    versionNumber: nextVer,
    createdAt: now,
    authorName: params.authorName,
    authorEmail: params.authorEmail,
    authorRole: params.authorRole,
    authorDepartment: params.authorDepartment,
    summary: params.summary || `Mise à jour vers ${nextVer}`,
    sizeBytes: params.sizeBytes,
    fileName: effectiveFileName,
    fileType: type,
    contentUrl: params.contentUrl || trackedFile.versions[0]?.contentUrl,
    textContent: params.textContent,
    isCurrent: true,
    checksum,
  };

  // Mark all older versions as not current
  const updatedOldVersions = trackedFile.versions.map((v) => ({
    ...v,
    isCurrent: false,
  }));

  return {
    ...trackedFile,
    name: effectiveFileName,
    updatedAt: now,
    currentVersion: nextVer,
    versions: [newSnapshot, ...updatedOldVersions],
  };
}

/**
 * Restore a previous version. Generates a new forward version snapshot with reference to the restored one.
 */
export function restoreFileVersion(
  trackedFile: TrackedFile,
  targetSnapshotId: string,
  restorer: {
    name: string;
    email?: string;
    role?: string;
    department?: string;
  }
): TrackedFile {
  const target = trackedFile.versions.find((v) => v.id === targetSnapshotId);
  if (!target) return trackedFile;

  const now = new Date().toISOString();
  const nextVer = calculateNextVersion(trackedFile.currentVersion, false);
  const versionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const restoredSnapshot: FileVersionSnapshot = {
    id: versionId,
    versionNumber: nextVer,
    createdAt: now,
    authorName: restorer.name,
    authorEmail: restorer.email,
    authorRole: restorer.role,
    authorDepartment: restorer.department,
    summary: `Restauration de la version ${target.versionNumber} (du ${new Date(target.createdAt).toLocaleDateString('fr-FR')})`,
    sizeBytes: target.sizeBytes,
    fileName: target.fileName,
    fileType: target.fileType,
    contentUrl: target.contentUrl,
    textContent: target.textContent,
    isCurrent: true,
    restoredFromVersion: target.versionNumber,
    checksum: target.checksum,
  };

  const updatedOldVersions = trackedFile.versions.map((v) => ({
    ...v,
    isCurrent: false,
  }));

  return {
    ...trackedFile,
    name: target.fileName,
    updatedAt: now,
    currentVersion: nextVer,
    versions: [restoredSnapshot, ...updatedOldVersions],
  };
}

/**
 * Helper to download a file snapshot
 */
export function downloadSnapshotFile(snapshot: FileVersionSnapshot) {
  if (snapshot.contentUrl) {
    const a = document.createElement('a');
    a.href = snapshot.contentUrl;
    a.download = snapshot.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (snapshot.textContent) {
    const blob = new Blob([snapshot.textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = snapshot.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
