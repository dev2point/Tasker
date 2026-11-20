import { TrackedFile, FileVersionSnapshot } from '@/types/file-version';

// Pure FIPS 180-4 SHA-256 implementation working synchronously in Browser, Node, and Vitest
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SHARED_TEXT_ENCODER = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const SHA_W = new Uint32Array(64);
const SMALL_PADDED_SCRATCH = new Uint8Array(512);

function toHex8(val: number): string {
  return (val >>> 0).toString(16).padStart(8, '0');
}

export function computeSha256HexFromBytes(bytes: Uint8Array): string {
  const len = bytes.length;
  const bitLen = len * 8;
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  let padded: Uint8Array;
  if (paddedLen <= SMALL_PADDED_SCRATCH.length) {
    padded = SMALL_PADDED_SCRATCH;
    padded.fill(0, len, paddedLen);
  } else {
    padded = new Uint8Array(paddedLen);
  }
  padded.set(bytes);
  padded[len] = 0x80;

  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  padded[paddedLen - 8] = (highBits >>> 24) & 0xff;
  padded[paddedLen - 7] = (highBits >>> 16) & 0xff;
  padded[paddedLen - 6] = (highBits >>> 8) & 0xff;
  padded[paddedLen - 5] = highBits & 0xff;
  padded[paddedLen - 4] = (lowBits >>> 24) & 0xff;
  padded[paddedLen - 3] = (lowBits >>> 16) & 0xff;
  padded[paddedLen - 2] = (lowBits >>> 8) & 0xff;
  padded[paddedLen - 1] = lowBits & 0xff;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = SHA_W;

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = offset + (i << 2);
      w[i] =
        ((padded[idx] << 24) |
          (padded[idx + 1] << 16) |
          (padded[idx + 2] << 8) |
          padded[idx + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return (
    toHex8(h0) +
    toHex8(h1) +
    toHex8(h2) +
    toHex8(h3) +
    toHex8(h4) +
    toHex8(h5) +
    toHex8(h6) +
    toHex8(h7)
  );
}

/**
 * Decode a base64 data URL into raw bytes if possible.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  if (!dataUrl.startsWith('data:')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const meta = dataUrl.slice(0, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  if (!meta.includes(';base64')) {
    const decoded = decodeURIComponent(payload);
    return SHARED_TEXT_ENCODER ? SHARED_TEXT_ENCODER.encode(decoded) : new TextEncoder().encode(decoded);
  }
  try {
    if (typeof Buffer !== 'undefined') {
      return new Uint8Array(Buffer.from(payload, 'base64'));
    }
    const binary = atob(payload);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Compute real SHA-256 checksum (`sha256:<64 hex chars>`) from raw bytes or UTF-8 string (DT-ARCH-17)
 */
export function generateChecksum(input: string | Uint8Array | ArrayBuffer): string {
  if (input instanceof ArrayBuffer) {
    return `sha256:${computeSha256HexFromBytes(new Uint8Array(input))}`;
  }
  if (input instanceof Uint8Array) {
    return `sha256:${computeSha256HexFromBytes(input)}`;
  }
  const bytes =
    (input.startsWith('data:') ? dataUrlToUint8Array(input) : null) ??
    (SHARED_TEXT_ENCODER ? SHARED_TEXT_ENCODER.encode(input) : new TextEncoder().encode(input));
  return `sha256:${computeSha256HexFromBytes(bytes)}`;
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
  rawBytes?: Uint8Array | ArrayBuffer;
  checksum?: string;
  textContent?: string;
  gridData?: import('@/types/file-version').SpreadsheetSheet[];
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
  const checksum =
    params.checksum ||
    generateChecksum(
      params.rawBytes ??
        (params.contentUrl || params.textContent || `${params.fileName}:${params.sizeBytes}`)
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
    gridData: params.gridData,
    isCurrent: true,
    checksum,
    moderationStatus: 'pending',
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
    rawBytes?: Uint8Array | ArrayBuffer;
    checksum?: string;
    textContent?: string;
    gridData?: import('@/types/file-version').SpreadsheetSheet[];
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
  const resolvedContentUrl = params.contentUrl || trackedFile.versions[0]?.contentUrl;
  const checksum =
    params.checksum ||
    generateChecksum(
      params.rawBytes ??
        (resolvedContentUrl || params.textContent || `${effectiveFileName}:${params.sizeBytes}`)
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
    contentUrl: resolvedContentUrl,
    textContent: params.textContent,
    gridData: params.gridData,
    isCurrent: true,
    checksum,
    moderationStatus: 'pending',
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
 * Update the moderation status of a specific snapshot (approved or rejected with mandatory note)
 */
export function updateSnapshotModeration(
  trackedFile: TrackedFile,
  snapshotId: string,
  status: 'approved' | 'rejected',
  note: string,
  moderator: { name: string; role?: string }
): TrackedFile {
  const now = new Date().toISOString();
  const updatedVersions = trackedFile.versions.map((v) => {
    if (v.id === snapshotId) {
      return {
        ...v,
        moderationStatus: status,
        moderationNote: note.trim(),
        moderatedBy: moderator.name,
        moderatedAt: now,
      };
    }
    return v;
  });

  return {
    ...trackedFile,
    updatedAt: now,
    versions: updatedVersions,
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
    gridData: target.gridData,
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
 * Helper to download a file snapshot (supports data URLs, authenticated server download URLs, or extracted text fallback)
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
