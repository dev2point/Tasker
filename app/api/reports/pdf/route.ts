import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toWinAnsiSafe(input: unknown): string {
  return String(input ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentification requise pour générer un rapport PDF.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const metrics = body?.metrics || {};
    const config = body?.config || {};

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(toWinAnsiSafe(config.customTitle || 'Rapport Executif MFisca'));
    pdfDoc.setAuthor(toWinAnsiSafe(config.authorName || user.name || 'Direction Qualite'));

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
    const { width, height } = page.getSize();
    const margin = 48;
    let y = height - 56;

    const ensureSpace = (needed: number) => {
      if (y - needed < 56) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 56;
      }
    };

    const drawText = (
      text: string,
      opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}
    ) => {
      const size = opts.size ?? 10;
      const font = opts.bold ? fontBold : fontRegular;
      const color = opts.color ?? rgb(0.12, 0.16, 0.22);
      const x = opts.x ?? margin;
      const clean = toWinAnsiSafe(text);
      const maxWidth = width - margin - x;

      // Simple word wrap
      const words = clean.split(/\s+/);
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          ensureSpace(size + 6);
          page.drawText(line, { x, y, size, font, color });
          y -= size + 5;
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) {
        ensureSpace(size + 6);
        page.drawText(line, { x, y, size, font, color });
        y -= size + 6;
      }
    };

    // Header band
    page.drawRectangle({
      x: 0,
      y: height - 96,
      width,
      height: 96,
      color: rgb(0.024, 0.102, 0.075),
    });

    page.drawText(toWinAnsiSafe(config.customTitle || 'Synthese Executive & Supervision'), {
      x: margin,
      y: height - 46,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(
      toWinAnsiSafe(
        `Perimetre : ${metrics.departmentLabel || 'Tous'} | Periode : ${metrics.periodLabel || 'Courante'}`
      ),
      {
        x: margin,
        y: height - 68,
        size: 10,
        font: fontRegular,
        color: rgb(0.43, 0.9, 0.72),
      }
    );

    y = height - 122;

    drawText(
      `Genere par ${config.authorName || user.name} le ${new Date().toLocaleString('fr-FR')}`,
      { size: 9, color: rgb(0.4, 0.45, 0.52) }
    );
    y -= 8;

    // KPI Section
    drawText('1. Indicateurs Cles de Performance', {
      size: 13,
      bold: true,
      color: rgb(0.04, 0.35, 0.24),
    });
    y -= 4;

    const kpis: Array<[string, string]> = [
      ['Total des taches suivies', String(metrics.totalTasks ?? 0)],
      ['Taches achevees', `${metrics.completedTasks ?? 0} (${metrics.completionRate ?? 0}%)`],
      ['Taches en retard', String(metrics.overdueTasks ?? 0)],
      ['Taches urgentes actives', String(metrics.urgentTasks ?? 0)],
      ['Dossiers en revue', String(metrics.totalDossiers ?? 0)],
      ['Dossiers valides / archives', String(metrics.validatedDossiers ?? 0)],
      ['Requetes inter-poles bloquees', String(metrics.blockedInterDepRequests ?? 0)],
    ];

    for (const [label, val] of kpis) {
      ensureSpace(18);
      page.drawText(toWinAnsiSafe(label), {
        x: margin + 8,
        y,
        size: 10,
        font: fontRegular,
        color: rgb(0.2, 0.24, 0.3),
      });
      page.drawText(toWinAnsiSafe(val), {
        x: width - margin - fontBold.widthOfTextAtSize(toWinAnsiSafe(val), 10),
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.04, 0.28, 0.18),
      });
      y -= 16;
    }

    y -= 10;

    // Department / Category Breakdown
    if (Array.isArray(metrics.departmentStats) && metrics.departmentStats.length > 0) {
      drawText('2. Repartition par Pole Metier', {
        size: 13,
        bold: true,
        color: rgb(0.04, 0.35, 0.24),
      });
      y -= 4;

      for (const dept of metrics.departmentStats) {
        drawText(
          `- ${dept.department}: ${dept.dossierCount ?? 0} dossier(s), ${dept.validatedCount ?? 0} valide(s), ${dept.overdueCount ?? 0} retard(s)`,
          { size: 10, x: margin + 8 }
        );
      }
      y -= 8;
    }

    // Risks & Recommendations
    if (Array.isArray(metrics.riskItems) && metrics.riskItems.length > 0) {
      drawText('3. Points de Vigilance & Risques Identifies', {
        size: 13,
        bold: true,
        color: rgb(0.6, 0.15, 0.15),
      });
      y -= 4;

      for (const risk of metrics.riskItems.slice(0, 12)) {
        drawText(
          `[${risk.severity || 'ALERTE'}] ${risk.title || ''} - ${risk.description || ''}`,
          { size: 9.5, x: margin + 8 }
        );
      }
    }

    // Footer with page numbers
    const pages = pdfDoc.getPages();
    pages.forEach((p, idx) => {
      p.drawText(
        toWinAnsiSafe(`Document genere cote serveur - Page ${idx + 1} / ${pages.length}`),
        {
          x: margin,
          y: 26,
          size: 8,
          font: fontRegular,
          color: rgb(0.45, 0.5, 0.55),
        }
      );
    });

    const pdfBytes = await pdfDoc.save();
    const dateSlug = new Date().toISOString().split('T')[0];

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-mfisca-${dateSlug}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de la génération PDF serveur.' },
      { status: 500 }
    );
  }
}
