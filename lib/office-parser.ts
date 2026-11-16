import { SpreadsheetSheet } from '@/types/file-version';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';

export interface WordDiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface GridDiffResult {
  totalModifiedCells: number;
  totalAddedRows: number;
  totalRemovedRows: number;
  modifiedCellMap: Map<string, { oldValue: string | number | boolean | null; newValue: string | number | boolean | null }>;
  modifiedRowSet: Set<number>;
}

/**
 * Extract raw textual content from a Word document (.docx) using mammoth
 */
export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const cleanText = (result.value || '').trim();
    if (!cleanText) {
      return '(Document Word vide ou sans paragraphe textuel direct)';
    }
    return cleanText;
  } catch (error) {
    console.warn('Erreur lors de l\'extraction du document Word (.docx):', error);
    return `[Erreur d'extraction du document Word : ${(error as Error)?.message || 'Format non supporté'}]`;
  }
}

/**
 * Extract structured sheets, headers, and rows from an Excel workbook (.xlsx) using exceljs
 */
export async function extractXlsxData(arrayBuffer: ArrayBuffer): Promise<SpreadsheetSheet[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheets: SpreadsheetSheet[] = [];

    workbook.eachSheet((worksheet) => {
      const rows: (string | number | boolean | null)[][] = [];
      const headers: string[] = [];

      let maxCols = 0;

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowValues: (string | number | boolean | null)[] = [];
        const cellCount = row.cellCount;
        if (cellCount > maxCols) maxCols = cellCount;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let val = cell.value;

          // If formula cell, take formula result if available
          if (val && typeof val === 'object' && 'result' in val) {
            val = (val as { result: any }).result;
          } else if (val && typeof val === 'object' && 'text' in val) {
            val = (val as { text: any }).text;
          } else if (val instanceof Date) {
            val = val.toISOString().split('T')[0];
          }

          const safeVal =
            typeof val === 'number' || typeof val === 'boolean'
              ? val
              : val !== null && val !== undefined
              ? String(val).trim()
              : null;

          rowValues[colNumber - 1] = safeVal;

          if (rowNumber === 1 && safeVal !== null) {
            headers[colNumber - 1] = String(safeVal);
          }
        });

        // Fill gaps if any
        for (let c = 0; c < rowValues.length; c++) {
          if (rowValues[c] === undefined) rowValues[c] = null;
        }

        rows.push(rowValues);
      });

      // Provide default letters for empty headers (A, B, C...)
      const resolvedHeaders: string[] = [];
      const colLimit = Math.max(maxCols, headers.length, 1);
      for (let c = 0; c < colLimit; c++) {
        resolvedHeaders.push(headers[c] || getColumnLetter(c + 1));
      }

      sheets.push({
        name: worksheet.name || `Feuille ${sheets.length + 1}`,
        rowCount: rows.length,
        colCount: colLimit,
        headers: resolvedHeaders,
        rows,
      });
    });

    return sheets.length > 0 ? sheets : [createEmptySheet('Feuille 1')];
  } catch (error) {
    console.warn('Erreur lors de l\'extraction du classeur Excel (.xlsx):', error);
    return [createEmptySheet('Erreur extraction Excel')];
  }
}

/**
 * Parse plain CSV text into a structured SpreadsheetSheet
 */
export function extractCsvData(csvText: string, sheetName = 'Données CSV'): SpreadsheetSheet {
  if (!csvText || !csvText.trim()) {
    return createEmptySheet(sheetName);
  }

  const lines = csvText.trim().split(/\r?\n/);
  const rows: (string | number | boolean | null)[][] = [];

  for (const line of lines) {
    // Simple CSV splitter handling quoted cells
    const cells = line.split(/[;,]/).map((c) => {
      const trimmed = c.trim().replace(/^["']|["']$/g, '');
      if (trimmed === '') return null;
      if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
      if (trimmed.toLowerCase() === 'true') return true;
      if (trimmed.toLowerCase() === 'false') return false;
      return trimmed;
    });
    rows.push(cells);
  }

  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  const headers = rows.length > 0 ? rows[0].map((c, i) => (c !== null ? String(c) : getColumnLetter(i + 1))) : [];

  return {
    name: sheetName,
    rowCount: rows.length,
    colCount: maxCols,
    headers,
    rows,
  };
}

/**
 * Convert column 1-based index to Excel letter: 1 -> A, 2 -> B, 27 -> AA
 */
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter || 'A';
}

function createEmptySheet(name: string): SpreadsheetSheet {
  return {
    name,
    rowCount: 0,
    colCount: 1,
    headers: ['A'],
    rows: [],
  };
}

/**
 * Tokenize string into words, spaces and punctuation for word-level diffing
 */
function tokenizeWords(text: string): string[] {
  if (!text) return [];
  // Matches words, punctuation clusters, or spaces
  return text.match(/[\wÀ-ÿ]+|[^\wÀ-ÿ\s]+|\s+/g) || [];
}

/**
 * Word-by-word diff algorithm using Longest Common Subsequence (LCS)
 */
export function computeWordDiff(textA: string, textB: string): WordDiffToken[] {
  const tokensA = tokenizeWords(textA || '');
  const tokensB = tokenizeWords(textB || '');

  const n = tokensA.length;
  const m = tokensB.length;

  // Optimize for very large texts to avoid O(N*M) memory blowup
  if (n * m > 1000000) {
    return computeFastParagraphWordDiff(tokensA, tokensB);
  }

  // DP table for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1) as unknown as number[]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (tokensA[i] === tokensB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to build tokens
  const diff: WordDiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      diff.unshift({ type: 'unchanged', value: tokensA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', value: tokensB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'removed', value: tokensA[i - 1] });
      i--;
    }
  }

  return diff;
}

/**
 * Chunked word diff fallback for very large texts
 */
function computeFastParagraphWordDiff(tokensA: string[], tokensB: string[]): WordDiffToken[] {
  const result: WordDiffToken[] = [];
  const minLen = Math.min(tokensA.length, tokensB.length);
  let idx = 0;

  while (idx < minLen) {
    if (tokensA[idx] === tokensB[idx]) {
      result.push({ type: 'unchanged', value: tokensA[idx] });
    } else {
      result.push({ type: 'removed', value: tokensA[idx] });
      result.push({ type: 'added', value: tokensB[idx] });
    }
    idx++;
  }

  while (idx < tokensA.length) {
    result.push({ type: 'removed', value: tokensA[idx] });
    idx++;
  }

  while (idx < tokensB.length) {
    result.push({ type: 'added', value: tokensB[idx] });
    idx++;
  }

  return result;
}

/**
 * Compare two sheets cell by cell and return modified cells map and row sets
 */
export function computeGridDiff(
  sheetA?: SpreadsheetSheet,
  sheetB?: SpreadsheetSheet
): GridDiffResult {
  const modifiedCellMap = new Map<
    string,
    { oldValue: string | number | boolean | null; newValue: string | number | boolean | null }
  >();
  const modifiedRowSet = new Set<number>();

  const rowsA = sheetA?.rows || [];
  const rowsB = sheetB?.rows || [];

  const maxRows = Math.max(rowsA.length, rowsB.length);

  let totalModifiedCells = 0;
  let totalAddedRows = 0;
  let totalRemovedRows = 0;

  for (let r = 0; r < maxRows; r++) {
    const rowA = rowsA[r];
    const rowB = rowsB[r];

    if (!rowA && rowB) {
      totalAddedRows++;
      modifiedRowSet.add(r);
      for (let c = 0; c < rowB.length; c++) {
        if (rowB[c] !== null && rowB[c] !== undefined && rowB[c] !== '') {
          totalModifiedCells++;
          modifiedCellMap.set(`r${r}_c${c}`, { oldValue: null, newValue: rowB[c] });
        }
      }
      continue;
    }

    if (rowA && !rowB) {
      totalRemovedRows++;
      modifiedRowSet.add(r);
      for (let c = 0; c < rowA.length; c++) {
        if (rowA[c] !== null && rowA[c] !== undefined && rowA[c] !== '') {
          totalModifiedCells++;
          modifiedCellMap.set(`r${r}_c${c}`, { oldValue: rowA[c], newValue: null });
        }
      }
      continue;
    }

    let rowHasChanges = false;
    const maxCols = Math.max(rowA?.length || 0, rowB?.length || 0);

    for (let c = 0; c < maxCols; c++) {
      const valA = rowA?.[c] ?? null;
      const valB = rowB?.[c] ?? null;

      // Check equality (numbers formatted or string normalized)
      const areEqual =
        valA === valB ||
        (valA === null && valB === '') ||
        (valA === '' && valB === null) ||
        (typeof valA === 'number' && typeof valB === 'number' && Math.abs(valA - valB) < 0.0001);

      if (!areEqual) {
        totalModifiedCells++;
        rowHasChanges = true;
        modifiedCellMap.set(`r${r}_c${c}`, { oldValue: valA, newValue: valB });
      }
    }

    if (rowHasChanges) {
      modifiedRowSet.add(r);
    }
  }

  return {
    totalModifiedCells,
    totalAddedRows,
    totalRemovedRows,
    modifiedCellMap,
    modifiedRowSet,
  };
}
