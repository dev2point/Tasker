import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { InitialAuthSession } from '@/lib/auth-lifecycle';
import { HomeWorkspace } from '@/components/HomeWorkspace';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initialSession: InitialAuthSession | null = null;

  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders }).catch(() => null);
    if (session?.user) {
      const u = session.user as any;
      initialSession = {
        user: {
          id: u.id,
          name: u.name || u.email?.split('@')[0] || 'Utilisateur',
          email: u.email,
          role: u.role || 'member',
          department: u.department ?? undefined,
          pole: u.pole ?? undefined,
          grade: u.grade ?? undefined,
          status: u.status || 'active',
          image: u.image ?? undefined,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
        },
      };
    }
  } catch {
    initialSession = null;
  }

  return <HomeWorkspace initialSession={initialSession} />;
}
