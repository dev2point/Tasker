import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb, isDatabaseConfigured, ensureDatabaseTables } from '@/lib/db/pg';
import { users, user as authUser } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { User, UserRole } from '@/types/user';

export async function GET() {
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
    console.error('Error querying users from PostgreSQL:', error);
    return NextResponse.json({
      source: 'error',
      users: [],
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

export async function DELETE(req: NextRequest) {
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

