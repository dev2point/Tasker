import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { findFileVersionInRuntimeDossiers } from '@/lib/review-runtime-store';
import { dataUrlToUint8Array } from '@/lib/file-version-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getMimeTypeForExtension(fileName: string, dataUrl?: string): string {
  if (dataUrl?.startsWith('data:')) {
    const semi = dataUrl.indexOf(';');
    const comma = dataUrl.indexOf(',');
    const end = semi !== -1 && semi < comma ? semi : comma;
    if (end > 5) {
      return dataUrl.slice(5, end);
    }
  }
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'md':
      return 'text/markdown; charset=utf-8';
    case 'txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentification requise pour télécharger cette pièce jointe.' },
      { status: 401 }
    );
  }

  const { versionId } = await context.params;
  const { searchParams } = new URL(req.url);
  const dossierId = searchParams.get('dossierId');

  const found = findFileVersionInRuntimeDossiers(versionId, dossierId);
  if (!found) {
    return NextResponse.json(
      { error: 'Version de fichier introuvable.' },
      { status: 404 }
    );
  }

  const { dossier, snapshot } = found;

  // Enforce same RBAC as review dossiers (SEC-05)
  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
  const isMaker = dossier.maker?.id === user.id || dossier.maker?.email === user.email;
  const isChecker = dossier.checker?.id === user.id || dossier.checker?.email === user.email;
  const isSameDepartment = Boolean(
    user.department &&
      dossier.department &&
      user.department.toLowerCase() === dossier.department.toLowerCase()
  );

  if (!isAdminOrManager && !isMaker && !isChecker && !isSameDepartment) {
    return NextResponse.json(
      { error: "Accès refusé à cette pièce jointe." },
      { status: 403 }
    );
  }

  const bytes =
    (snapshot.contentUrl ? dataUrlToUint8Array(snapshot.contentUrl) : null) ??
    (snapshot.textContent ? new TextEncoder().encode(snapshot.textContent) : null);

  if (!bytes) {
    return NextResponse.json(
      { error: 'Contenu binaire indisponible pour cette version.' },
      { status: 404 }
    );
  }

  const safeFileName = snapshot.fileName.replace(/["\r\n]/g, '_');
  const mimeType = getMimeTypeForExtension(safeFileName, snapshot.contentUrl);

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${safeFileName}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
