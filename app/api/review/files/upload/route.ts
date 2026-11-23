import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getAuthenticatedUser } from '@/lib/auth-server';
import {
  buildR2ObjectKey,
  getR2MissingConfigKeys,
  isR2Configured,
  uploadBufferToR2,
} from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentification requise pour téléverser une pièce jointe.' },
      { status: 401 }
    );
  }

  if (!isR2Configured()) {
    const missingR2ConfigKeys = getR2MissingConfigKeys();
    return NextResponse.json(
      {
        error: `Stockage Cloudflare R2 non configuré (${missingR2ConfigKeys.join(', ')}) : téléversement indisponible.`,
        missingR2ConfigKeys,
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Aucun fichier valide fourni.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Le fichier dépasse la limite maximale de 25 Mo.' },
        { status: 413 }
      );
    }

    const dossierId =
      typeof formData.get('dossierId') === 'string' && String(formData.get('dossierId')).trim()
        ? String(formData.get('dossierId')).trim()
        : `dossier-pending-${Date.now()}`;
    const fileId =
      typeof formData.get('fileId') === 'string' && String(formData.get('fileId')).trim()
        ? String(formData.get('fileId')).trim()
        : `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const versionId =
      typeof formData.get('versionId') === 'string' && String(formData.get('versionId')).trim()
        ? String(formData.get('versionId')).trim()
        : `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const checksum = `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
    const downloadUrl = `/api/review/file-versions/${encodeURIComponent(versionId)}/download?dossierId=${encodeURIComponent(dossierId)}`;

    const r2Key = buildR2ObjectKey({
      dossierId,
      fileId,
      versionId,
      fileName: file.name,
    });

    await uploadBufferToR2({
      key: r2Key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
      checksumSha256: checksum,
      metadata: {
        uploadedBy: user.id,
        originalName: file.name.slice(0, 120),
      },
    });

    return NextResponse.json({
      success: true,
      storageProvider: 'r2',
      r2Key,
      fileId,
      versionId,
      dossierId,
      fileName: file.name,
      sizeBytes: buffer.byteLength,
      checksum,
      downloadUrl,
    });
  } catch (err: any) {
    console.error('[POST /api/review/files/upload] Upload failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur lors du téléversement du fichier.' },
      { status: 500 }
    );
  }
}
