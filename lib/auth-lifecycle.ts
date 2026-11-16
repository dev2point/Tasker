import { ViewMode } from '@/types/task';
import { User, UserRole } from '@/types/user';

export type AuthPhase =
  | 'checking'
  | 'authenticated'
  | 'signing_in'
  | 'signing_out'
  | 'unauthenticated';

export interface SessionUserSnapshot {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  pole?: string;
  grade?: string;
  status?: string;
  image?: string;
  createdAt?: string;
}

export interface InitialAuthSession {
  user: SessionUserSnapshot;
}

export type AuthLifecycleEvent =
  | { type: 'CLIENT_CHECK_RESOLVED_AUTH' }
  | { type: 'CLIENT_CHECK_RESOLVED_NONE' }
  | { type: 'START_SIGN_IN' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILED' }
  | { type: 'START_SIGN_OUT' }
  | { type: 'FINISH_SIGN_OUT' }
  | { type: 'SESSION_CONFIRMED_EXPIRED' };

/**
 * Determines the initial auth phase synchronously on both SSR and initial client hydration.
 * If the Server Component already resolved a valid user session, render the workspace immediately (0ms flash).
 * Otherwise, hold on the smooth 'checking' veil until client verification completes.
 */
export function getInitialAuthPhase(initialSession: InitialAuthSession | null | undefined): AuthPhase {
  return initialSession?.user?.id ? 'authenticated' : 'checking';
}

/**
 * Pure deterministic state machine transition for auth lifecycle.
 * Guarantees:
 * - While signing out, no background session event can revert away from 'signing_out' until 'FINISH_SIGN_OUT'.
 * - Background negative checks ('CLIENT_CHECK_RESOLVED_NONE') only transition from 'checking'.
 * - An authenticated session is never dropped unless explicitly signed out or confirmed expired.
 */
export function resolveSessionTransition(
  currentPhase: AuthPhase,
  event: AuthLifecycleEvent
): AuthPhase {
  if (currentPhase === 'signing_out') {
    return event.type === 'FINISH_SIGN_OUT' ? 'unauthenticated' : 'signing_out';
  }

  switch (event.type) {
    case 'START_SIGN_OUT':
      return 'signing_out';
    case 'FINISH_SIGN_OUT':
      return 'unauthenticated';
    case 'START_SIGN_IN':
      return 'signing_in';
    case 'AUTH_SUCCESS':
      return 'authenticated';
    case 'AUTH_FAILED':
      return currentPhase === 'authenticated' ? 'authenticated' : 'unauthenticated';
    case 'CLIENT_CHECK_RESOLVED_AUTH':
      return 'authenticated';
    case 'CLIENT_CHECK_RESOLVED_NONE':
      return currentPhase === 'checking' ? 'unauthenticated' : currentPhase;
    case 'SESSION_CONFIRMED_EXPIRED':
      return currentPhase === 'signing_in' ? 'signing_in' : 'unauthenticated';
    default:
      return currentPhase;
  }
}

/**
 * Guards view rendering directly at render time so a non-admin never flashes the Admin view
 * even for a single frame after switching accounts.
 */
export function getEffectiveViewMode(currentView: ViewMode, userRole?: UserRole | string | null): ViewMode {
  if (currentView === 'admin' && userRole !== 'admin') {
    return 'list';
  }
  return currentView;
}

/**
 * Ensures Better Auth's background hook revalidation (`isPending: true` or transient null)
 * never unexpectedly clears an already established authenticated session.
 */
export function shouldPreserveAuthenticatedSession(params: {
  currentPhase: AuthPhase;
  isHookPending: boolean;
  hasHookUser: boolean;
  withinAuthGraceWindow: boolean;
}): boolean {
  const { currentPhase, isHookPending, hasHookUser, withinAuthGraceWindow } = params;
  if (currentPhase === 'signing_out' || currentPhase === 'signing_in') {
    return currentPhase === 'signing_in';
  }
  if (hasHookUser) return true;
  if (currentPhase !== 'authenticated') return false;
  if (isHookPending || withinAuthGraceWindow) return true;
  return true;
}

/**
 * Normalizes a Better Auth / SSR session user object into the domain User interface.
 */
export function mapSessionUserToDomainUser(u: SessionUserSnapshot | any): User {
  return {
    id: u.id,
    name: u.name || u.email?.split('@')[0] || 'Utilisateur',
    email: u.email,
    role: (u.role as UserRole) || 'member',
    department: u.department || undefined,
    pole: u.pole || undefined,
    grade: u.grade || undefined,
    status: (u.status as User['status']) || 'active',
    avatarUrl: u.image || undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
  };
}
