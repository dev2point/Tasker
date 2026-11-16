import { describe, it, expect } from 'vitest';
import {
  computeWordDiff,
  computeGridDiff,
  extractCsvData,
  getColumnLetter,
} from '@/lib/office-parser';
import { SpreadsheetSheet } from '@/types/file-version';

describe('Office Diff & Parsing Engine', () => {
  describe('getColumnLetter', () => {
    it('returns correct letters for 1-based column indices', () => {
      expect(getColumnLetter(1)).toBe('A');
      expect(getColumnLetter(2)).toBe('B');
      expect(getColumnLetter(26)).toBe('Z');
      expect(getColumnLetter(27)).toBe('AA');
      expect(getColumnLetter(28)).toBe('AB');
      expect(getColumnLetter(52)).toBe('AZ');
      expect(getColumnLetter(53)).toBe('BA');
    });
  });

  describe('extractCsvData', () => {
    it('parses standard comma-separated and semicolon-separated CSV text into grid data', () => {
      const csv = `Compte,Libellé,Débit,Crédit\n401000,Fournisseur Alpha,1500.00,0\n512000,Banque BNP,0,1500.00`;
      const sheet = extractCsvData(csv, 'grand_livre.csv');

      expect(sheet.name).toBe('grand_livre.csv');
      expect(sheet.rowCount).toBe(3);
      expect(sheet.colCount).toBe(4);
      expect(sheet.rows[0]).toEqual(['Compte', 'Libellé', 'Débit', 'Crédit']);
      // Numeric values are automatically parsed as numbers by extractCsvData
      expect(sheet.rows[1]).toEqual([401000, 'Fournisseur Alpha', 1500, 0]);
    });

    it('handles semicolon delimiters frequently used in French Excel exports', () => {
      const csv = `Code;Intitulé;Montant\nFR01;Audit fiscal;12500\nFR02;CIR 2026;45000`;
      const sheet = extractCsvData(csv, 'synthese.csv');

      expect(sheet.rowCount).toBe(3);
      expect(sheet.colCount).toBe(3);
      expect(sheet.rows[1]).toEqual(['FR01', 'Audit fiscal', 12500]);
    });
  });

  describe('computeWordDiff (Word-by-word comparison with French punctuation & accents)', () => {
    it('detects unchanged identical text without diff tokens', () => {
      const text = 'Le contrôle de conformité fiscale a été validé avec succès.';
      const tokens = computeWordDiff(text, text);

      const added = tokens.filter((t) => t.type === 'added');
      const removed = tokens.filter((t) => t.type === 'removed');

      expect(added.length).toBe(0);
      expect(removed.length).toBe(0);
      expect(tokens.every((t) => t.type === 'unchanged')).toBe(true);
    });

    it('identifies word insertions and marks them as added', () => {
      const oldText = 'Dossier de révision comptable pour le client.';
      const newText = 'Dossier de révision comptable annuelle approfondie pour le client.';
      const tokens = computeWordDiff(oldText, newText);

      const addedTokens = tokens.filter((t) => t.type === 'added').map((t) => t.value.trim()).filter(Boolean);
      const removedTokens = tokens.filter((t) => t.type === 'removed');

      expect(addedTokens.length).toBeGreaterThan(0);
      expect(removedTokens.length).toBe(0);
      expect(addedTokens).toContain('annuelle');
      expect(addedTokens).toContain('approfondie');
    });

    it('identifies word deletions and marks them as removed', () => {
      const oldText = 'Validation sous réserve de transmission du quitus fiscal.';
      const newText = 'Validation sans réserve.';
      const tokens = computeWordDiff(oldText, newText);

      const removedTokens = tokens.filter((t) => t.type === 'removed').map((t) => t.value.trim()).filter(Boolean);
      expect(removedTokens.length).toBeGreaterThan(0);
      expect(removedTokens).toContain('sous');
      expect(removedTokens).toContain('de');
      expect(removedTokens).toContain('transmission');
      expect(removedTokens).toContain('du');
      expect(removedTokens).toContain('quitus');
      expect(removedTokens).toContain('fiscal');
    });

    it('correctly handles French accented characters and symbols', () => {
      const oldText = 'Impôt sur les sociétés calculé : 33 333 €';
      const newText = 'Impôt sur les sociétés rectifié : 25 000 €';
      const tokens = computeWordDiff(oldText, newText);

      const removed = tokens.filter((t) => t.type === 'removed').map((t) => t.value.trim());
      const added = tokens.filter((t) => t.type === 'added').map((t) => t.value.trim());

      expect(removed).toContain('calculé');
      expect(added).toContain('rectifié');
    });
  });

  describe('computeGridDiff (Excel side-by-side grid comparison)', () => {
    it('flags modified cells, preserves identical ones, and tracks row-level changes', () => {
      const sheetA: SpreadsheetSheet = {
        name: 'Feuille 1',
        rowCount: 3,
        colCount: 3,
        headers: ['A', 'B', 'C'],
        rows: [
          ['Rubrique', 'Exercice N-1', 'Exercice N'],
          ['Chiffre d’affaires', 1000000, 1200000],
          ['Résultat net', 80000, 95000],
        ],
      };

      const sheetB: SpreadsheetSheet = {
        name: 'Feuille 1',
        rowCount: 3,
        colCount: 3,
        headers: ['A', 'B', 'C'],
        rows: [
          ['Rubrique', 'Exercice N-1', 'Exercice N'],
          ['Chiffre d’affaires', 1000000, 1250000], // Modified cell (row 1, col 2)
          ['Résultat net', 80000, 95000],
        ],
      };

      const result = computeGridDiff(sheetA, sheetB);

      expect(result.totalModifiedCells).toBe(1);
      expect(result.modifiedRowSet.has(1)).toBe(true);
      expect(result.modifiedRowSet.has(0)).toBe(false);
      expect(result.modifiedRowSet.has(2)).toBe(false);

      const mod = result.modifiedCellMap.get('r1_c2');
      expect(mod).toBeDefined();
      expect(mod?.oldValue).toBe(1200000);
      expect(mod?.newValue).toBe(1250000);
    });

    it('identifies newly appended rows in sheet B as modified', () => {
      const sheetA: SpreadsheetSheet = {
        name: 'Budget',
        rowCount: 2,
        colCount: 2,
        headers: ['A', 'B'],
        rows: [
          ['Poste', 'Montant'],
          ['Salaires', 50000],
        ],
      };

      const sheetB: SpreadsheetSheet = {
        name: 'Budget',
        rowCount: 3,
        colCount: 2,
        headers: ['A', 'B'],
        rows: [
          ['Poste', 'Montant'],
          ['Salaires', 50000],
          ['Cotisations', 22000], // Added row
        ],
      };

      const result = computeGridDiff(sheetA, sheetB);
      expect(result.totalAddedRows).toBe(1);
      expect(result.modifiedRowSet.has(2)).toBe(true);
      expect(result.modifiedCellMap.get('r2_c0')?.newValue).toBe('Cotisations');
      expect(result.modifiedCellMap.get('r2_c1')?.newValue).toBe(22000);
    });

    it('handles comparison when one of the sheets is undefined or empty', () => {
      const sheetB: SpreadsheetSheet = {
        name: 'Nouveau',
        rowCount: 1,
        colCount: 1,
        headers: ['A'],
        rows: [['Nouveau contenu']],
      };

      const result = computeGridDiff(undefined, sheetB);
      expect(result.totalAddedRows).toBe(1);
      expect(result.totalModifiedCells).toBe(1);
      expect(result.modifiedCellMap.get('r0_c0')?.newValue).toBe('Nouveau contenu');
    });
  });
});
