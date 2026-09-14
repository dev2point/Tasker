import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getDrizzleDb, isDatabaseConfigured } from '@/lib/db/pg';
import { session as sessionTable, user as userTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  status?: string;
  image?: string;
}

/**
 * Validates the Better Auth session from the incoming NextRequest.
 * Returns the AuthenticatedUser if valid, or null if unauthenticated.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    if (!isDatabaseConfigured()) {
      return null;
    }

    // 1. Better Auth session check via internal API
    const session = await auth.api.getSession({
      headers: req.headers,
    }).catch(() => null);

    if (session?.user) {
      const u = session.user as any;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'member',
        department: u.department,
        status: u.status,
        image: u.image,
      };
    }

    // 2. Direct fallback check for Bearer or Cookie token
    const authHeader = req.headers.get('authorization') || req.headers.get('x-session-token');
    let token = '';
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (authHeader) {
      token = authHeader.trim();
    }

    if (!token) {
      // Check cookies for token
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1].trim());
      }
    }

    if (token) {
      const db = getDrizzleDb();
      if (db) {
        const dbSessions = await db
          .select()
          .from(sessionTable)
          .where(eq(sessionTable.token, token))
          .limit(1)
          .catch(() => []);

        if (dbSessions.length > 0) {
          const s = dbSessions[0];
          if (new Date(s.expiresAt) > new Date()) {
            const dbUsers = await db
              .select()
              .from(userTable)
              .where(eq(userTable.id, s.userId))
              .limit(1)
              .catch(() => []);

            if (dbUsers.length > 0) {
              const u = dbUsers[0];
              return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role || 'member',
                department: u.department || undefined,
                status: u.status || 'active',
                image: u.image || undefined,
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Authentication verification check error:', error);
    return null;
  }
}
