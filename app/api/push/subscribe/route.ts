import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { ensureDatabaseTables, getDrizzleDb, isDatabaseConfigured } from '@/lib/db/pg';
import { pushSubscriptions } from '@/src/db/schema';
import { parsePushSubscriptionInput } from '@/lib/web-push/validation';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch (error: unknown) {
    console.warn('Invalid push subscription JSON:', error);
    return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
  }

  const parsed = parsePushSubscriptionInput(body);
  if (!parsed) return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });

  const db = getDrizzleDb();
  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });
  }
  const setup = await ensureDatabaseTables();
  if (!setup.success) return NextResponse.json({ error: 'Base indisponible' }, { status: 503 });

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, parsed.endpoint))
    .limit(1);

  const current = existing[0];
  if (current && current.userId !== user.id) {
    return NextResponse.json({ error: 'Endpoint déjà associé' }, { status: 409 });
  }

  const userAgent = request.headers.get('user-agent');
  const now = new Date();

  await db
    .insert(pushSubscriptions)
    .values({
      id: `push-sub-${randomUUID()}`,
      userId: user.id,
      endpoint: parsed.endpoint,
      p256dh: parsed.p256dh,
      auth: parsed.auth,
      userAgent,
      failureCount: 0,
      lastStatusCode: null,
      lastError: null,
      updatedAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh: parsed.p256dh,
        auth: parsed.auth,
        userAgent,
        failureCount: 0,
        lastStatusCode: null,
        lastError: null,
        updatedAt: now,
      },
    });

  return NextResponse.json({ ok: true });
}
