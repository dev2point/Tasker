import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { users } from '@/src/db/schema';
import { User, UserRole } from '@/types/user';

const DEFAULT_TEAM_USERS: User[] = [
  {
    id: 'usr_admin_1',
    name: 'Alexandre Roy (Admin)',
    email: 'alexandre.roy@entreprise.com',
    role: 'admin',
    department: 'Direction & Produit',
    status: 'active',
  },
  {
    id: 'usr_mgr_1',
    name: 'Sophie Martin (Manager)',
    email: 'sophie.martin@entreprise.com',
    role: 'manager',
    department: 'Gestion de Projet',
    status: 'active',
  },
  {
    id: 'usr_dev_1',
    name: 'Thomas Dubois',
    email: 'thomas.dubois@entreprise.com',
    role: 'member',
    department: 'Ingénierie & Tech',
    status: 'active',
  },
  {
    id: 'usr_des_1',
    name: 'Camille Leroy',
    email: 'camille.leroy@entreprise.com',
    role: 'member',
    department: 'Design UI/UX',
    status: 'active',
  },
  {
    id: 'usr_gst_1',
    name: 'Invité Client (Lecture)',
    email: 'guest@partenaire.com',
    role: 'guest',
    department: 'Partenariat',
    status: 'active',
  },
];

export async function GET() {
  const db = getDrizzleDb();

  if (!db || !isDatabaseConfigured()) {
    // Return standard team members
    return NextResponse.json({
      source: 'local_cache',
      users: DEFAULT_TEAM_USERS,
    });
  }

  try {
    await ensureDatabaseTables();
    let dbUsers = await db.select().from(users);

    // Seed default team users if DB is empty
    if (dbUsers.length === 0) {
      for (const u of DEFAULT_TEAM_USERS) {
        await db.insert(users).values({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          status: u.status || 'active',
        });
      }
      dbUsers = await db.select().from(users);
    }

    const formatted: User[] = dbUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: (u.role as UserRole) || 'member',
      department: u.department || undefined,
      status: (u.status as 'active' | 'away' | 'offline') || 'active',
      avatarUrl: u.avatarUrl || undefined,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      source: 'postgresql_supabase',
      users: formatted,
    });
  } catch (error) {
    console.error('Error querying users from PostgreSQL:', error);
    return NextResponse.json({
      source: 'fallback',
      users: DEFAULT_TEAM_USERS,
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, department } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nom et adresse email obligatoires' },
        { status: 400 }
      );
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role: (role as UserRole) || 'member',
      department: department || 'Équipe',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const db = getDrizzleDb();
    if (db && isDatabaseConfigured()) {
      await ensureDatabaseTables();
      await db.insert(users).values({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        status: newUser.status,
      });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
