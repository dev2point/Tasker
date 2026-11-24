import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { ensureDatabaseTables, getDrizzleDb, isDatabaseConfigured } from '@/lib/db/pg';
import { pushSubscriptions } from '@/src/db/schema';

function readEndpoint(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('endpoint' in body)) return null;
  const endpoint = body.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 2048) return null;
  return endpoint;
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch (error: unknown) {
    console.warn('Invalid push unsubscribe JSON:', error);
    return NextResponse.json({ error: 'Endpoint invalide' }, { status: 400 });
  }

  const endpoint = readEndpoint(body);
  if (!endpoint) return NextResponse.json({ error: 'Endpoint invalide' }, { status: 400 });

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  }
  const setup = await ensureDatabaseTables();
  if (!setup.success) return NextResponse.json({ error: 'Base indisponible' }, { status: 503 });

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));

  return NextResponse.json({ ok: true });
}
