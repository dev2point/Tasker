import { NextResponse } from 'next/server';
import { isDatabaseConfigured, getPostgresClient, ensureDatabaseTables } from '@/lib/db/pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const dbConfigured = isDatabaseConfigured();
  let dbConnected = false;
  let dbLatencyMs: number | null = null;
  let pgVersion: string | null = null;
  let schemaMessage = '';
  let dbError: string | null = null;

  if (dbConfigured) {
    try {
      const sql = getPostgresClient();
      if (sql) {
        const pingStart = Date.now();
        const [result] = await sql`SELECT 1 as ping, NOW() as current_time, version() as pg_version;`;
        dbLatencyMs = Date.now() - pingStart;
        dbConnected = true;
        pgVersion = result?.pg_version || null;

        const schemaInit = await ensureDatabaseTables();
        schemaMessage = schemaInit.message;
      }
    } catch (err) {
      dbConnected = false;
      dbError = err instanceof Error ? err.message : 'Database ping failure';
    }
  }

  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.VERCEL);

  // In production with DB configured, failure to connect degrades health
  const isHealthy = !isProd ? true : (dbConfigured ? dbConnected : true);
  const overallStatus = isHealthy ? (dbConnected ? 'healthy' : 'degraded') : 'unhealthy';

  const responseBody = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.RENDER ? 'render' : (process.env.VERCEL ? 'vercel' : 'node'),
    durationMs: Date.now() - startTime,
    services: {
      database: {
        configured: dbConfigured,
        connected: dbConnected,
        driver: 'Drizzle ORM (PostgreSQL)',
        latencyMs: dbLatencyMs,
        pgVersion: pgVersion ? pgVersion.split(' ')[0] + ' ' + (pgVersion.split(' ')[1] || '') : null,
        schemaStatus: schemaMessage || (dbConfigured ? 'checked' : 'offline_fallback'),
        error: dbError,
      },
      auth: {
        engine: 'Better Auth 1.7',
        mode: dbConnected ? 'postgresql' : 'json_fallback',
        secureSecretConfigured: Boolean(process.env.BETTER_AUTH_SECRET),
        secureCookies: isProd,
      },
      ai: {
        engine: 'Google Gemini 2.5 Flash',
        configured: Boolean(process.env.GEMINI_API_KEY),
      },
    },
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  return NextResponse.json(responseBody, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
