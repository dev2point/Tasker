import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../src/db/schema';

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERREUR: La variable d\'environnement DATABASE_URL est manquante.');
    process.exit(1);
  }

  console.log('🚀 Initialisation de la connexion PostgreSQL...');
  
  // Connection configured with SSL support for Supabase / Cloud Postgres
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('supabase.co') || databaseUrl.includes('sslmode=require') ? 'require' : undefined,
  });

  const db = drizzle(sql, { schema });

  try {
    console.log('📦 Application des migrations Drizzle...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations appliquées avec succès sur la base de données PostgreSQL !');
  } catch (error) {
    console.error('❌ Échec lors de l\'exécution des migrations:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
