import postgres from 'postgres';

async function verifyDatabase() {
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERREUR: La variable DATABASE_URL est manquante.");
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
    sanitizedUrl = 'format masqué';
  }

  console.log(`\n🔍 Vérification des tables sur la base de données : ${sanitizedUrl}`);

  const isRemote = databaseUrl.includes('supabase') || databaseUrl.includes('pooler') || databaseUrl.includes('sslmode=require');
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: isRemote ? 'require' : undefined,
  });

  try {
    const tables = await sql`
      SELECT 
        t.tablename as table_name,
        t.rowsecurity as rls_enabled,
        COUNT(p.policyname) as policy_count
      FROM pg_tables t
      LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
      WHERE t.schemaname = 'public'
      GROUP BY t.tablename, t.rowsecurity
      ORDER BY t.tablename ASC;
    `;

    console.log(`\n📊 Nombre de tables trouvées dans le schéma 'public' : ${tables.length}`);
    if (tables.length > 0) {
      console.log("Détail des tables et politiques RLS :");
      tables.forEach((t) => {
        const rlsStatus = t.rls_enabled ? "🛡️ RLS Activé" : "⚠️ RLS Désactivé";
        console.log(`  - 📋 ${t.table_name} (${rlsStatus}, ${t.policy_count} politique(s))`);
      });

      const policies = await sql`
        SELECT tablename, policyname, cmd, roles
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `;

      if (policies.length > 0) {
        console.log(`\n🛡️ Total de ${policies.length} politiques RLS configurées :`);
        policies.forEach((p) => {
          console.log(`  - [${p.tablename}] ${p.policyname} (${p.cmd})`);
        });
      }
    } else {
      console.warn("⚠️ Aucune table trouvée dans le schéma 'public' sur cette base de données.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des tables :", error.message);
  } finally {
    await sql.end();
  }
}

verifyDatabase();
