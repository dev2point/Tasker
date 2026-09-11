import { auth } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/db/pg';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

const authHandlers = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    const url = new URL(req.url);
    if (url.pathname.includes('/get-session') || url.pathname.includes('/session')) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ message: 'Authentication database not configured' }, { status: 200 });
  }
  try {
    return await authHandlers.GET(req);
  } catch (error) {
    console.warn('Auth GET error:', error);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Base de données non configurée. Veuillez configurer Cloud SQL ou PostgreSQL.' },
      { status: 400 }
    );
  }
  try {
    return await authHandlers.POST(req);
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur authentification' },
      { status: 500 }
    );
  }
}

