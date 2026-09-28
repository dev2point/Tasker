'use client';

import ExcelJS from 'exceljs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from 'docx';
import { Task } from '@/types/task';

/**
 * Downloads a binary Blob in the browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an executive, styled Microsoft Excel (.xlsx) workbook for tasks and dossiers
 */
export async function generateExcelReport(
  tasks: Task[],
  cabinetName = 'Cabinet Juridique & Fiscal'
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = cabinetName;
  workbook.lastModifiedBy = cabinetName;
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Feuille Principale : Liste des Tâches & Dossiers
  const sheet = workbook.addWorksheet('Dossiers & Tâches', {
    views: [{ showGridLines: true }],
  });

  // Titre du classeur
  sheet.mergeCells('A1:G1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${cabinetName.toUpperCase()} — SUIVI DES DOSSIERS & ÉCHÉANCES`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF064E3B' }, // Emerald dark
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 32;

  // Sous-titre date
  sheet.mergeCells('A2:G2');
  const dateCell = sheet.getCell('A2');
  dateCell.value = `Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  dateCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // En-têtes de colonnes
  const headers = ['ID', 'Intitulé de la Tâche / Dossier', 'Priorité', 'Statut', 'Catégorie', 'Date d’Échéance', 'Étiquettes / Tags'];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // Emerald 600
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF047857' } },
      left: { style: 'thin', color: { argb: 'FF047857' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      right: { style: 'thin', color: { argb: 'FF047857' } },
    };
  });

  // Lignes de données
  tasks.forEach((task, index) => {
    const rowNumber = 5 + index;
    const row = sheet.getRow(rowNumber);

    const priorityLabels: Record<string, string> = {
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute',
      urgent: 'URGENTE',
    };

    const formattedDate = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Non définie';

    row.values = [
      index + 1,
      task.title,
      priorityLabels[task.priority] || task.priority,
      task.completed ? 'Clôturée' : 'En cours',
      task.category || 'Général',
      formattedDate,
      (task.tags || []).join(', '),
    ];
    row.height = 22;

    const isEven = index % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF0FDF4'; // Light emerald zebra

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Priority color highlight
      if (colNumber === 3) {
        if (task.priority === 'urgent') {
          cell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red
        } else if (task.priority === 'high') {
          cell.font = { bold: true, color: { argb: 'FFD97706' } }; // Amber
        }
      }

      // Status color highlight
      if (colNumber === 4) {
        if (task.completed) {
          cell.font = { bold: true, color: { argb: 'FF059669' } }; // Emerald
        } else {
          cell.font = { bold: true, color: { argb: 'FF2563EB' } }; // Blue
        }
      }
    });
  });

  // Ajustement des largeurs de colonnes
  sheet.columns = [
    { width: 8 },  // ID
    { width: 42 }, // Intitulé
    { width: 16 }, // Priorité
    { width: 16 }, // Statut
    { width: 22 }, // Catégorie
    { width: 20 }, // Date
    { width: 30 }, // Tags
  ];

  // 2. Feuille Synthèse & KPIs
  const summarySheet = workbook.addWorksheet('Synthèse & KPIs');
  summarySheet.views = [{ showGridLines: true }];

  summarySheet.mergeCells('A1:D1');
  const sumTitle = summarySheet.getCell('A1');
  sumTitle.value = 'INDICATEURS CLÉS DE PERFORMANCE';
  sumTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 28;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const urgent = tasks.filter((t) => t.priority === 'urgent' && !t.completed).length;

  const kpis = [
    ['Total des Tâches / Dossiers', total],
    ['Dossiers Clôturés', completed],
    ['Dossiers En Cours', pending],
    ['Dossiers Urgents Ouverts', urgent],
    ['Taux de Réalisation Global', total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%'],
  ];

  kpis.forEach((item, idx) => {
    const r = summarySheet.getRow(3 + idx);
    r.values = [item[0], item[1]];
    r.height = 22;
    r.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    r.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF059669' } };
    r.getCell(2).alignment = { horizontal: 'center' };
  });

  summarySheet.columns = [{ width: 35 }, { width: 18 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generates an executive Microsoft Word (.docx) document for cabinet reports & legal records
 */
export async function generateWordDossier(
  tasks: Task[],
  cabinetName = 'Cabinet Juridique & Fiscal'
): Promise<Blob> {
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'N°', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
        shading: { fill: '059669' },
        width: { size: 800, type: WidthType.DXA },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Intitulé du Dossier / Tâche', bold: true, color: 'FFFFFF' })] })],
        shading: { fill: '059669' },
        width: { size: 4500, type: WidthType.DXA },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Priorité', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
        shading: { fill: '059669' },
        width: { size: 1600, type: WidthType.DXA },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Échéance', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
        shading: { fill: '059669' },
        width: { size: 1800, type: WidthType.DXA },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: 'Statut', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
        shading: { fill: '059669' },
        width: { size: 1600, type: WidthType.DXA },
      }),
    ],
  });

  const tableDataRows = tasks.map((t, idx) => {
    const formattedDate = t.dueDate
      ? new Date(t.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '—';

    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: `${idx + 1}`, alignment: AlignmentType.CENTER })],
          shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F0FDF4' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: t.title, bold: true }),
                ...(t.description ? [new TextRun({ text: `\n${t.description}`, italics: true, size: 18, color: '64748B' })] : []),
              ],
            }),
          ],
          shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F0FDF4' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: t.priority.toUpperCase(),
                  bold: true,
                  color: t.priority === 'urgent' ? 'DC2626' : t.priority === 'high' ? 'D97706' : '1E293B',
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F0FDF4' },
        }),
        new TableCell({
          children: [new Paragraph({ text: formattedDate, alignment: AlignmentType.CENTER })],
          shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F0FDF4' },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: t.completed ? 'Clôturée' : 'En cours',
                  bold: true,
                  color: t.completed ? '059669' : '2563EB',
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F0FDF4' },
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        children: [
          // En-tête de document
          new Paragraph({
            text: cabinetName.toUpperCase(),
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'RAPPORT EXÉCUTIF D’ACTIVITÉ ET SUIVI DES DOSSIERS',
                bold: true,
                size: 28,
                color: '064E3B',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Document généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Système de Gestion Métier`,
                italics: true,
                size: 18,
                color: '64748B',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Résumé
          new Paragraph({
            text: 'I. SYNTHÈSE DES ENGAGEMENTS',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Total des dossiers analysés : ', bold: true }),
              new TextRun({ text: `${tasks.length} dossiers\n` }),
              new TextRun({ text: '• Dossiers finalisés / clôturés : ', bold: true }),
              new TextRun({ text: `${completedCount} dossiers\n`, color: '059669' }),
              new TextRun({ text: '• Dossiers actifs en cours de révision : ', bold: true }),
              new TextRun({ text: `${pendingCount} dossiers\n`, color: '2563EB' }),
            ],
            spacing: { after: 300 },
          }),

          // Tableau détaillé
          new Paragraph({
            text: 'II. ÉTAT DÉTAILLÉ DES DOSSIERS ET ÉCHÉANCES',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 140 },
          }),
          new Table({
            rows: [tableHeaderRow, ...tableDataRows],
            width: { size: 10300, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '059669' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '059669' },
              left: { style: BorderStyle.SINGLE, size: 4, color: '059669' },
              right: { style: BorderStyle.SINGLE, size: 4, color: '059669' },
            },
          }),

          // Zone de visa / signature
          new Paragraph({
            text: 'III. VISA DE L’ASSOCIÉ OU DU RESPONSABLE DU DOSSIER',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 500, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date et lieu : ________________________\n\n' }),
              new TextRun({ text: 'Signature et cachet du Cabinet :\n\n\n\n' }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
