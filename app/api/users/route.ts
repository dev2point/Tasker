import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { users, user as authUser } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { User, UserRole } from '@/types/user';
import { getAuthenticatedUser } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authSessionUser = await getAuthenticatedUser(req);
  if (!authSessionUser) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier pour consulter les utilisateurs.' },
      { status: 401 }
    );
  }

  const db = getDrizzleDb();

  if (!db || !isDatabaseConfigured()) {
    return NextResponse.json({
      source: 'offline',
      users: [],
    });
  }

  try {
    await ensureDatabaseTables();
    const [dbUsers, dbAuthUsers] = await Promise.all([
      db.select().from(users).catch(() => []),
      db.select().from(authUser).catch(() => []),
    ]);

    const userMap = new Map<string, User>();

    // Better Auth users (primary authenticated accounts)
    for (const u of dbAuthUsers) {
      userMap.set(u.email.toLowerCase(), {
        id: u.id,
        name: u.name,
        email: u.email,
        role: (u.role as UserRole) || 'member',
        department: u.department || undefined,
        status: (u.status as 'active' | 'away' | 'offline') || 'active',
        avatarUrl: u.image || undefined,
        createdAt: u.createdAt.toISOString(),
      });
    }

    // Additional team users
    for (const u of dbUsers) {
      if (!userMap.has(u.email.toLowerCase())) {
        userMap.set(u.email.toLowerCase(), {
          id: u.id,
          name: u.name,
          email: u.email,
          role: (u.role as UserRole) || 'member',
          department: u.department || undefined,
          status: (u.status as 'active' | 'away' | 'offline') || 'active',
          avatarUrl: u.avatarUrl || undefined,
          createdAt: u.createdAt.toISOString(),
        });
      }
    }

    const formatted = Array.from(userMap.values());

    return NextResponse.json({
      source: 'postgresql_supabase',
      users: formatted,
    });
  } catch (error) {
    console.warn('Error querying users from PostgreSQL:', error);
    return NextResponse.json({
      source: 'error',
      users: [],
      error: error instanceof Error ? error.message : 'Database error',
    });
  }
}

const ALLOWED_ROLES: UserRole[] = ['admin', 'manager', 'member', 'guest'];

export async function POST(req: NextRequest) {
  const authSessionUser = await getAuthenticatedUser(req);
  if (!authSessionUser) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier.' },
      { status: 401 }
    );
  }

  if (authSessionUser.role !== 'admin') {
    return NextResponse.json(
      { error: 'Accès interdit. Seul un administrateur peut créer des utilisateurs directement.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, role, department } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nom et adresse email obligatoires' },
        { status: 400 }
      );
    }

    const validatedRole: UserRole = role && ALLOWED_ROLES.includes(role) ? role : 'member';

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role: validatedRole,
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
      }).catch(async () => {
        // If users fails, try authUser table
        await db.insert(authUser).values({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          status: newUser.status,
        });
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

export async function PUT(req: NextRequest) {
  const authSessionUser = await getAuthenticatedUser(req);
  if (!authSessionUser) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier.' },
      { status: 401 }
    );
  }

  if (authSessionUser.role !== 'admin') {
    return NextResponse.json(
      { error: 'Accès interdit. Seul un administrateur peut modifier les rôles et permissions des utilisateurs.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id, role, department, status, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide spécifié.' }, { status: 400 });
    }

    const db = getDrizzleDb();
    if (db && isDatabaseConfigured()) {
      await ensureDatabaseTables();
      const updateData: Record<string, any> = {};
      if (role) updateData.role = role;
      if (department !== undefined) updateData.department = department;
      if (status) updateData.status = status;
      if (name) updateData.name = name;

      await Promise.all([
        db.update(users).set(updateData).where(eq(users.id, id)).catch(() => {}),
        db.update(authUser).set(updateData).where(eq(authUser.id, id)).catch(() => {}),
      ]);
    }

    return NextResponse.json({ success: true, updated: { id, role, department, status, name } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authSessionUser = await getAuthenticatedUser(req);
  if (!authSessionUser) {
    return NextResponse.json(
      { error: 'Non autorisé. Veuillez vous authentifier.' },
      { status: 401 }
    );
  }

  if (authSessionUser.role !== 'admin') {
    return NextResponse.json(
      { error: 'Accès interdit. Seul un administrateur peut supprimer des utilisateurs.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    const db = getDrizzleDb();
    if (db && isDatabaseConfigured()) {
      await ensureDatabaseTables();
      await Promise.all([
        db.delete(users).where(eq(users.id, id)).catch(() => {}),
        db.delete(authUser).where(eq(authUser.id, id)).catch(() => {}),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
