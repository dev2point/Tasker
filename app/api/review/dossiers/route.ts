import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { INITIAL_DOSSIERS } from '@/lib/review-service';
import { ReviewDossier, ReviewStatus } from '@/types/review';
import { realtimeHub, RealtimeEventType } from '@/lib/realtime-hub';

export const dynamic = 'force-dynamic';

// In-memory runtime cache for dossiers when PostgreSQL is not configured
let runtimeDossiers: ReviewDossier[] = [...INITIAL_DOSSIERS];

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

  let filtered = [...runtimeDossiers];
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
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const now = new Date().toISOString();
    const newDossier: ReviewDossier = {
      id: `dossier-${Date.now()}`,
      ref: body.ref || `DOS-${new Date().getFullYear()}-${body.department?.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
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
      lock: {
        isLocked: false,
      },
      dataFields: body.dataFields || [],
      textDocument: body.textDocument || {
        documentId: `doc-${Date.now()}`,
        title: body.title,
        type: 'note_synthese',
        previousContent: '',
        currentContent: body.initialContent || '',
      },
      interDepRequests: [],
      auditTrail: [
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
      createdAt: now,
      updatedAt: now,
      estimatedDeliverableDate: body.estimatedDeliverableDate || now.split('T')[0],
    };

    runtimeDossiers = [newDossier, ...runtimeDossiers];

    // Broadcast SSE event for real-time collaborative updates
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
      payload: { dossier: newDossier },
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

    if (!dossierId || !updatedDossier) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    let previousStatus: ReviewStatus | undefined;
    let previousLock = false;
    let finalizedDossier: ReviewDossier;

    const index = runtimeDossiers.findIndex((d) => d.id === dossierId);
    if (index >= 0) {
      const existing = runtimeDossiers[index];
      const existingVersion = existing.version || 1;
      const clientExpectedVersion =
        typeof expectedVersion === 'number'
          ? expectedVersion
          : (updatedDossier.version || 1);

      // OCC Validation: Check if client version is behind existing server version
      if (!force && clientExpectedVersion < existingVersion) {
        // Broadcast conflict notification via SSE
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
            existingDossier: existing,
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

      // SEC-05: RBAC check - Admin / Manager has global edit rights; Maker, assigned Checker, or Department colleagues have access
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      const isMaker = existing.maker?.id === user.id || existing.maker?.email === user.email;
      const isChecker = existing.checker?.id === user.id || existing.checker?.email === user.email;
      const isSameDepartment = Boolean(user.department && existing.department && user.department.toLowerCase() === existing.department.toLowerCase());

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
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      };

      runtimeDossiers[index] = finalizedDossier;
    } else {
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      const isMaker = updatedDossier.maker?.id === user.id || updatedDossier.maker?.email === user.email;
      if (!isAdminOrManager && !isMaker) {
        return NextResponse.json(
          { error: "Action non autorisée pour créer un dossier assigné à autrui." },
          { status: 403 }
        );
      }
      finalizedDossier = {
        ...updatedDossier,
        version: updatedDossier.version || 1,
        updatedAt: new Date().toISOString(),
      };
      runtimeDossiers = [finalizedDossier, ...runtimeDossiers];
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
          alertMessage = `Le Maker ${user.name} a soumis le dossier ${finalizedDossier.ref} (v${finalizedDossier.version}) pour validation.`;
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

    // Broadcast SSE event to all connected active sessions
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
        dossier: finalizedDossier,
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

/**
 * Test helpers to reset or inspect in-memory dossiers across test suites
 */
export function _setRuntimeDossiersForTesting(dossiers: ReviewDossier[]) {
  runtimeDossiers = [...dossiers];
}

export function _getRuntimeDossiersForTesting(): ReviewDossier[] {
  return [...runtimeDossiers];
}
