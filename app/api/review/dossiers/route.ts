import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getAuthenticatedUser } from '@/lib/auth-server';
import {
  canUserDeleteDossier,
  stripDossierFileBytesForBroadcast,
} from '@/lib/review-service';
import {
  getRuntimeDossiers,
  setRuntimeDossiers,
} from '@/lib/review-runtime-store';
import { dataUrlToUint8Array } from '@/lib/file-version-service';
import { ReviewDossier, ReviewStatus } from '@/types/review';
import { TrackedFile } from '@/types/file-version';
import { realtimeHub, RealtimeEventType } from '@/lib/realtime-hub';

export const dynamic = 'force-dynamic';

function extractClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function isPlaceholderIp(ip?: string): boolean {
  return (
    !ip ||
    ip === 'server-pending' ||
    ip === 'client-pending' ||
    ip === '192.168.1.42' ||
    ip === '192.168.1.88'
  );
}

/**
 * Compute real server-side SHA-256 on uploaded file bytes when available (DT-ARCH-17).
 */
function normalizeTrackedFilesWithServerSha256(files: unknown): TrackedFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .filter((f): f is TrackedFile => Boolean(f && typeof f === 'object' && typeof f.id === 'string'))
    .map((file) => ({
      ...file,
      versions: Array.isArray(file.versions)
        ? file.versions.map((ver) => {
            const bytes = ver.contentUrl ? dataUrlToUint8Array(ver.contentUrl) : null;
            if (bytes && bytes.byteLength > 0) {
              const serverSha = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
              return { ...ver, checksum: serverSha };
            }
            return ver;
          })
        : [],
    }));
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous connecter.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const department = searchParams.get('department');
  const status = searchParams.get('status');

  let filtered = [...getRuntimeDossiers()];
  if (department && department !== 'Tous') {
    filtered = filtered.filter((d) => d.department === department);
  }
  if (status && status !== 'Tous') {
    filtered = filtered.filter((d) => d.status === status);
  }

  return NextResponse.json({
    dossiers: filtered,
    total: filtered.length,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const clientIp = extractClientIp(req);
    const now = new Date().toISOString();

    const normalizedTrackedFiles = normalizeTrackedFilesWithServerSha256(body.trackedFiles);
    const incomingAudit = Array.isArray(body.auditTrail)
      ? body.auditTrail.map((entry: any) => ({
          ...entry,
          ipAddress: isPlaceholderIp(entry?.ipAddress) ? clientIp : entry.ipAddress,
        }))
      : [];

    const newDossier: ReviewDossier = {
      id: typeof body.id === 'string' && body.id.trim() ? body.id : `dossier-${Date.now()}`,
      ref:
        body.ref ||
        `DOS-${new Date().getFullYear()}-${body.department?.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      title: body.title,
      clientName: body.clientName,
      clientSiret: body.clientSiret || '',
      department: body.department,
      typology: body.typology || 'Livrable Métier',
      priority: body.priority || 'medium',
      status: 'brouillon',
      version: 1,
      maker: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: (user.department as any) || body.department,
        role: (user.role as any) || 'collaborateur',
      },
      checker: body.checker || undefined,
      lock: {
        isLocked: false,
      },
      dataFields: Array.isArray(body.dataFields) ? body.dataFields : [],
      textDocument: body.textDocument || {
        documentId: `doc-${Date.now()}`,
        title: body.title,
        type: 'note_synthese',
        previousContent: '',
        currentContent: body.initialContent || '',
      },
      trackedFiles: normalizedTrackedFiles,
      interDepRequests: Array.isArray(body.interDepRequests) ? body.interDepRequests : [],
      auditTrail:
        incomingAudit.length > 0
          ? incomingAudit
          : [
              {
                id: `aud-${Date.now()}`,
                timestamp: now,
                actorId: user.id,
                actorName: user.name,
                actorDepartment: (user.department as any) || body.department,
                actorRole: user.role || 'Collaborateur',
                ipAddress: clientIp,
                action: 'creation',
                details: `Création du dossier "${body.title}" pour le client ${body.clientName}.`,
              },
            ],
      createdAt: body.createdAt || now,
      updatedAt: now,
      estimatedDeliverableDate: body.estimatedDeliverableDate || now.split('T')[0],
    };

    setRuntimeDossiers([newDossier, ...getRuntimeDossiers()]);

    // Broadcast SSE event WITHOUT inline base64 file bytes (DT-ARCH-18)
    const safeBroadcastDossier = stripDossierFileBytesForBroadcast(newDossier);
    realtimeHub.broadcast({
      type: 'DOSSIER_CREATED',
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
      targetId: newDossier.id,
      targetRef: newDossier.ref,
      message: `Nouveau dossier fiscal "${newDossier.title}" (${newDossier.ref}) créé par ${user.name}.`,
      payload: { dossier: safeBroadcastDossier },
    });

    return NextResponse.json({
      success: true,
      dossier: newDossier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { dossierId, updatedDossier, expectedVersion, force } = body;
    const clientIp = extractClientIp(req);

    if (!dossierId || !updatedDossier) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    let previousStatus: ReviewStatus | undefined;
    let previousLock = false;
    let finalizedDossier: ReviewDossier;

    const currentList = getRuntimeDossiers();
    const index = currentList.findIndex((d) => d.id === dossierId);

    // Stamp real server-extracted IP on new or placeholder audit entries (DT-ARCH-05)
    const stampedAuditTrail = Array.isArray(updatedDossier.auditTrail)
      ? updatedDossier.auditTrail.map((entry: any) => ({
          ...entry,
          ipAddress: isPlaceholderIp(entry?.ipAddress) ? clientIp : entry.ipAddress,
        }))
      : [];

    const normalizedTrackedFiles = updatedDossier.trackedFiles
      ? normalizeTrackedFilesWithServerSha256(updatedDossier.trackedFiles)
      : undefined;

    if (index >= 0) {
      const existing = currentList[index];
      const existingVersion = existing.version || 1;
      const clientExpectedVersion =
        typeof expectedVersion === 'number'
          ? expectedVersion
          : (updatedDossier.version || 1);

      // OCC Validation: Check if client version is behind existing server version
      if (!force && clientExpectedVersion < existingVersion) {
        const safeExisting = stripDossierFileBytesForBroadcast(existing);
        realtimeHub.broadcast({
          type: 'DOSSIER_CONFLICT',
          actor: {
            id: user.id,
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role,
          },
          targetId: existing.id,
          targetRef: existing.ref,
          message: `Conflit de concurrence sur le dossier ${existing.ref} : modification rejetée (version serveur v${existingVersion} > version client v${clientExpectedVersion}).`,
          payload: {
            serverVersion: existingVersion,
            clientVersion: clientExpectedVersion,
            existingDossier: safeExisting,
          },
        });

        return NextResponse.json(
          {
            error: `Conflit de concurrence détecté : le dossier "${existing.ref}" a été modifié entre-temps par un autre utilisateur. Version serveur actuelle : v${existingVersion}, votre version : v${clientExpectedVersion}.`,
            conflict: true,
            serverVersion: existingVersion,
            clientVersion: clientExpectedVersion,
            serverDossier: existing,
          },
          { status: 409 }
        );
      }

      previousStatus = existing.status;
      previousLock = Boolean(existing.lock?.isLocked);

      // SEC-05: RBAC check
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      const isMaker = existing.maker?.id === user.id || existing.maker?.email === user.email;
      const isChecker = existing.checker?.id === user.id || existing.checker?.email === user.email;
      const isSameDepartment = Boolean(
        user.department &&
          existing.department &&
          user.department.toLowerCase() === existing.department.toLowerCase()
      );

      if (!isAdminOrManager && !isMaker && !isChecker && !isSameDepartment) {
        return NextResponse.json(
          { error: "Action non autorisée. Vous n'avez pas les droits pour modifier ce dossier." },
          { status: 403 }
        );
      }

      // Increment version monotonically
      const nextVersion = Math.max(existingVersion, clientExpectedVersion) + 1;
      finalizedDossier = {
        ...updatedDossier,
        trackedFiles: normalizedTrackedFiles ?? existing.trackedFiles,
        auditTrail: stampedAuditTrail,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      };

      const nextList = [...currentList];
      nextList[index] = finalizedDossier;
      setRuntimeDossiers(nextList);
    } else {
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      const isMaker =
        updatedDossier.maker?.id === user.id || updatedDossier.maker?.email === user.email;
      if (!isAdminOrManager && !isMaker) {
        return NextResponse.json(
          { error: 'Action non autorisée pour créer un dossier assigné à autrui.' },
          { status: 403 }
        );
      }
      finalizedDossier = {
        ...updatedDossier,
        trackedFiles: normalizedTrackedFiles ?? updatedDossier.trackedFiles,
        auditTrail: stampedAuditTrail,
        version: updatedDossier.version || 1,
        updatedAt: new Date().toISOString(),
      };
      setRuntimeDossiers([finalizedDossier, ...currentList]);
    }

    // Determine specific real-time event type for collaborative alerts
    let eventType: RealtimeEventType = 'DOSSIER_VALIDATED';
    let alertMessage = `Le dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) a été mis à jour par ${user.name}.`;

    if (previousLock !== Boolean(finalizedDossier.lock?.isLocked)) {
      eventType = finalizedDossier.lock?.isLocked ? 'DOSSIER_LOCKED' : 'DOSSIER_UNLOCKED';
      alertMessage = finalizedDossier.lock?.isLocked
        ? `Le dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) a été verrouillé par ${user.name}.`
        : `Le verrou sur le dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) a été libéré par ${user.name}.`;
    } else if (finalizedDossier.status !== previousStatus) {
      switch (finalizedDossier.status) {
        case 'soumis':
          eventType = 'DOSSIER_SUBMITTED';
          alertMessage = finalizedDossier.checker?.name
            ? `${user.name} a soumis le dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) à ${finalizedDossier.checker.name} pour revue.`
            : `Le Maker ${user.name} a soumis le dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) pour validation.`;
          break;
        case 'en_revision':
          eventType = 'DOSSIER_REVIEW_STARTED';
          alertMessage = `Le Checker ${user.name} a débuté l'audit du dossier ${finalizedDossier.ref} (v${finalizedDossier.version}).`;
          break;
        case 'amendements':
          eventType = 'DOSSIER_AMENDED';
          alertMessage = `Des amendements ont été annotés sur ${finalizedDossier.ref} (v${finalizedDossier.version}) par ${user.name}.`;
          break;
        case 'demande_corrections':
          eventType = 'DOSSIER_REJECTED';
          alertMessage = `Corrections demandées par le Checker ${user.name} sur ${finalizedDossier.ref} (v${finalizedDossier.version}).`;
          break;
        case 'valide':
          eventType = 'DOSSIER_VALIDATED';
          alertMessage = `Dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) validé & scellé avec succès par ${user.name}.`;
          break;
        case 'archive':
          eventType = 'DOSSIER_ARCHIVED';
          alertMessage = `Dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) archivé par ${user.name}.`;
          break;
      }
    }

    // Broadcast SSE event WITHOUT inline base64 file bytes (DT-ARCH-18)
    const safeBroadcastDossier = stripDossierFileBytesForBroadcast(finalizedDossier);
    realtimeHub.broadcast({
      type: eventType,
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
      targetId: finalizedDossier.id,
      targetRef: finalizedDossier.ref,
      message: alertMessage,
      payload: {
        dossier: safeBroadcastDossier,
        version: finalizedDossier.version,
        previousStatus,
        newStatus: finalizedDossier.status,
      },
    });

    return NextResponse.json({
      success: true,
      dossier: finalizedDossier,
      version: finalizedDossier.version,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let dossierId = searchParams.get('id') || searchParams.get('dossierId');

    if (!dossierId) {
      const body = await req.json().catch(() => null);
      dossierId = body?.id || body?.dossierId || null;
    }

    if (!dossierId || typeof dossierId !== 'string') {
      return NextResponse.json({ error: 'Identifiant du dossier manquant' }, { status: 400 });
    }

    const currentList = getRuntimeDossiers();
    const existing = currentList.find((d) => d.id === dossierId);
    if (existing && !canUserDeleteDossier(existing, user)) {
      return NextResponse.json(
        {
          error:
            "Action non autorisée. Seul le créateur (avant validation) ou un administrateur peut supprimer ce dossier.",
        },
        { status: 403 }
      );
    }

    setRuntimeDossiers(currentList.filter((d) => d.id !== dossierId));

    realtimeHub.broadcast({
      type: 'DOSSIER_DELETED',
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
      },
      targetId: dossierId,
      targetRef: existing?.ref,
      message: existing
        ? `Le dossier ${existing.ref} (« ${existing.title} ») a été supprimé par ${user.name}.`
        : `Dossier supprimé par ${user.name}.`,
      payload: { dossierId },
    });

    return NextResponse.json({
      success: true,
      deletedId: dossierId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * Test helpers to reset or inspect in-memory dossiers across test suites
 */
export function _setRuntimeDossiersForTesting(dossiers: ReviewDossier[]) {
  setRuntimeDossiers(dossiers);
}

export function _getRuntimeDossiersForTesting(): ReviewDossier[] {
  return [...getRuntimeDossiers()];
}
