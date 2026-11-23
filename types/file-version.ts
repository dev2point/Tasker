export interface SpreadsheetCell {
  row: number; // 1-indexed
  col: number; // 1-indexed
  colLetter: string; // "A", "B", "C"...
  value: string | number | boolean | null;
}

export interface SpreadsheetSheet {
  name: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

export interface FileVersionSnapshot {
  id: string; // e.g. "ver-1728834920-a8f"
  versionNumber: string; // e.g. "v1.0", "v1.1", "v2.0"
  createdAt: string; // ISO string
  authorName: string;
  authorEmail?: string;
  authorRole?: string;
  authorDepartment?: string;
  summary: string; // Brief change note e.g. "Création initiale", "Ajustement des calculs fiscaux"
  sizeBytes: number;
  fileName: string;
  fileType: string; // MIME type or extension like "pdf", "docx", "xlsx", "txt", "md"
  // Content storage: R2 object key + authenticated/signed URL, or inline fallback
  storageProvider?: 'r2' | 'inline';
  r2Key?: string;
  contentUrl?: string; // Authenticated download route, signed URL, or data URL fallback
  textContent?: string; // Text content for Word/Markdown/Text for word-by-word diff
  gridData?: SpreadsheetSheet[]; // Extracted multi-sheet grid data for Excel/CSV
  isCurrent?: boolean;
  restoredFromVersion?: string; // if this snapshot was born from a restore action
  checksum?: string; // SHA-256 checksum (`sha256:<hex>`) for tamper-check
  // Moderation & Review metadata
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  moderationNote?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface TrackedFile {
  id: string; // e.g. "file-k8s92-doc"
  name: string;
  originalName: string;
  fileType: string; // "docx" | "xlsx" | "pdf" | "txt" | "md" | "image" | "other"
  createdAt: string;
  updatedAt: string;
  currentVersion: string; // "v1.2"
  versions: FileVersionSnapshot[]; // Sorted descending: latest is index 0
  tags?: string[];
  description?: string;
}

