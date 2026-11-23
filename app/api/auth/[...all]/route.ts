import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const handler = toNextJsHandler(auth.handler);

function extractClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown-ip'
  );
}

export async function GET(req: NextRequest) {
  const ip = extractClientIp(req);
  const rateCheck = checkRateLimit(`auth:get:${ip}`, { windowMs: 60000, max: 120 });
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Trop de requêtes d'authentification. Veuillez patienter." },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)) },
      }
    );
  }
  return handler.GET(req);
}

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req);
  const pathname = new URL(req.url).pathname;
  const rateCheck = checkRateLimit(`auth:post:${ip}:${pathname}`, {
    windowMs: 60000,
    max: 15,
  });
  if (!rateCheck.success) {
    return NextResponse.json(
      {
        error:
          'Trop de tentatives de connexion ou de création de compte. Veuillez réessayer dans une minute.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)) },
      }
    );
  }
  return handler.POST(req);
}

