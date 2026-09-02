import { NextResponse } from 'next/server';
import { isDatabaseConfigured, ensureDatabaseTables, getPostgresClient } from '@/lib/db/pg';

export async function GET() {
  const configured = isDatabaseConfigured();

  if (!configured) {
    return NextResponse.json({
      connected: false,
      configured: false,
      driver: 'drizzle-orm (PostgreSQL / Supabase)',
      message:
        'DATABASE_URL non configurée ou incomplète. Configurez DATABASE_URL dans les paramètres pour connecter Supabase.',
    });
  }

  try {
    const sql = getPostgresClient();
    if (!sql) {
      return NextResponse.json({
        connected: false,
        configured: true,
        message: 'Impossible d’initialiser le client PostgreSQL.',
      });
    }

    // Ping PostgreSQL
    const [result] = await sql`SELECT NOW() as current_time, version() as pg_version;`;
    const initResult = await ensureDatabaseTables();

    return NextResponse.json({
      connected: true,
      configured: true,
      driver: 'drizzle-orm (PostgreSQL / Supabase)',
      serverTime: result.current_time,
      pgVersion: result.pg_version,
      schemaReady: initResult.success,
      schemaMessage: initResult.message,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      configured: true,
      error: error instanceof Error ? error.message : 'Erreur de connexion à PostgreSQL',
    });
  }
}
