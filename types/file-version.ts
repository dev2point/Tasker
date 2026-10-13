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
  // Content storage: raw text or base64 data URL
  contentUrl?: string; // Data URL for download/preview
  textContent?: string; // Text content if text/markdown/json/csv for instant diff inspection
  isCurrent?: boolean;
  restoredFromVersion?: string; // if this snapshot was born from a restore action
  checksum?: string; // SHA-like or simple hash for tamper-check
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
