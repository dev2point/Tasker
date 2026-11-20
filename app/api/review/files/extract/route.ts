import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { extractText } from 'unpdf';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { extractDocxText, extractXlsxData, extractCsvData } from '@/lib/office-parser';
import { dataUrlToUint8Array } from '@/lib/file-version-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentification requise pour analyser un fichier.' },
      { status: 401 }
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let fileName = 'document';
    let bytes: Uint8Array | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
      }
      fileName = file.name;
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const body = await req.json();
      fileName = typeof body?.fileName === 'string' ? body.fileName : 'document';
      if (typeof body?.contentUrl === 'string') {
        bytes = dataUrlToUint8Array(body.contentUrl);
      }
    }

    if (!bytes || bytes.byteLength === 0) {
      return NextResponse.json(
        { error: 'Contenu du fichier invalide ou vide.' },
        { status: 400 }
      );
    }

    const sha256 = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    let textContent = '';
    let gridData: unknown[] | undefined = undefined;

    if (ext === 'pdf') {
      const pdfResult = await extractText(bytes, { mergePages: true });
      const extracted = Array.isArray(pdfResult.text)
        ? pdfResult.text.join('\n\n')
        : String(pdfResult.text || '');
      textContent =
        extracted.trim() ||
        '(Document PDF scanné ou sans couche textuelle extractible)';
    } else if (ext === 'docx') {
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      textContent = await extractDocxText(ab);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const sheets = await extractXlsxData(ab);
      gridData = sheets;
      textContent = sheets
        .map(
          (s) =>
            `--- Feuille : ${s.name} (${s.rowCount} lignes) ---\n` +
            s.rows.map((r) => r.join(' | ')).join('\n')
        )
        .join('\n\n');
    } else if (ext === 'csv') {
      const rawText = new TextDecoder('utf-8').decode(bytes);
      const sheet = extractCsvData(rawText, fileName);
      gridData = [sheet];
      textContent = rawText;
    } else {
      textContent = new TextDecoder('utf-8').decode(bytes);
    }

    return NextResponse.json({
      success: true,
      fileName,
      sizeBytes: bytes.byteLength,
      checksum: sha256,
      textContent,
      gridData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erreur lors de l'analyse serveur du document." },
      { status: 500 }
    );
  }
}
