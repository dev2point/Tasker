import postgres from 'postgres';
import { ensureDatabaseTables } from '../lib/db/pg';

async function runSafeMigration() {
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERREUR: La variable d'environnement DATABASE_URL est manquante.");
    process.exit(1);
  }

  databaseUrl = databaseUrl.trim();
  if (databaseUrl.startsWith('DATABASE_URL=')) {
    databaseUrl = databaseUrl.substring('DATABASE_URL='.length).trim();
  }
  if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) || (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
    databaseUrl = databaseUrl.substring(1, databaseUrl.length - 1).trim();
  }

  let sanitizedUrl = 'inconnue';
  try {
    const parsed = new URL(databaseUrl.replace(/^postgresql:\/\//, 'http://'));
    sanitizedUrl = `${parsed.hostname}:${parsed.port || 5432}/${parsed.pathname.replace(/^\//, '')}`;
  } catch {
    sanitizedUrl = 'masqué';
  }

  console.log(`\n🚀 Initialisation de la synchronisation de schéma PostgreSQL sur : ${sanitizedUrl}`);

  try {
    console.log('📦 Application sécurisée et idempotente des tables, ENUM et politiques RLS...');
    await ensureDatabaseTables();
    console.log('✅ Schéma PostgreSQL (tables, enum user_role, policies RLS) synchronisé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation :', error);
    process.exit(1);
  }
}

runSafeMigration();
