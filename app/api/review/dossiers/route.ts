import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { INITIAL_DOSSIERS } from '@/lib/review-service';
import { ReviewDossier } from '@/types/review';

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
    const { dossierId, updatedDossier } = body;

    if (!dossierId || !updatedDossier) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const index = runtimeDossiers.findIndex((d) => d.id === dossierId);
    if (index >= 0) {
      runtimeDossiers[index] = updatedDossier;
    } else {
      runtimeDossiers = [updatedDossier, ...runtimeDossiers];
    }

    return NextResponse.json({
      success: true,
      dossier: updatedDossier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
