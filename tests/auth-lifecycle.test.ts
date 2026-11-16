import { describe, it, expect } from 'vitest';
import {
  getInitialAuthPhase,
  resolveSessionTransition,
  getEffectiveViewMode,
  shouldPreserveAuthenticatedSession,
  mapSessionUserToDomainUser,
  InitialAuthSession,
} from '@/lib/auth-lifecycle';

describe('Authentication Lifecycle & Flash-Free State Transitions', () => {
  const sampleSsrSession: InitialAuthSession = {
    user: {
      id: 'usr_1',
      name: 'Maître Sophie Martin',
      email: 'sophie@cabinet.fr',
      role: 'admin',
      department: 'Fiscalité',
      status: 'active',
    },
  };

  it('starts immediately in authenticated phase when SSR resolves an active session (0ms AuthGate flash)', () => {
    expect(getInitialAuthPhase(sampleSsrSession)).toBe('authenticated');
  });

  it('starts in checking phase when SSR finds no cookie session (shows checking veil instead of AuthGate flash)', () => {
    expect(getInitialAuthPhase(null)).toBe('checking');
    expect(getInitialAuthPhase(undefined)).toBe('checking');
  });

  it('transitions from checking to authenticated or unauthenticated deterministically', () => {
    expect(
      resolveSessionTransition('checking', { type: 'CLIENT_CHECK_RESOLVED_AUTH' })
    ).toBe('authenticated');

    expect(
      resolveSessionTransition('checking', { type: 'CLIENT_CHECK_RESOLVED_NONE' })
    ).toBe('unauthenticated');
  });

  it('never drops an already authenticated session when a background client check resolves null', () => {
    expect(
      resolveSessionTransition('authenticated', { type: 'CLIENT_CHECK_RESOLVED_NONE' })
    ).toBe('authenticated');
  });

  it('locks into signing_out immediately on sign-out and ignores background events until FINISH_SIGN_OUT', () => {
    let phase = resolveSessionTransition('authenticated', { type: 'START_SIGN_OUT' });
    expect(phase).toBe('signing_out');

    // Background auth events cannot flash back to authenticated or unauthenticated early
    phase = resolveSessionTransition(phase, { type: 'CLIENT_CHECK_RESOLVED_AUTH' });
    expect(phase).toBe('signing_out');
    phase = resolveSessionTransition(phase, { type: 'AUTH_SUCCESS' });
    expect(phase).toBe('signing_out');

    // Only FINISH_SIGN_OUT moves cleanly to unauthenticated
    phase = resolveSessionTransition(phase, { type: 'FINISH_SIGN_OUT' });
    expect(phase).toBe('unauthenticated');
  });

  it('prevents non-admin users from seeing AdminView for even a single render frame', () => {
    expect(getEffectiveViewMode('admin', 'member')).toBe('list');
    expect(getEffectiveViewMode('admin', 'manager')).toBe('list');
    expect(getEffectiveViewMode('admin', undefined)).toBe('list');
    expect(getEffectiveViewMode('admin', 'admin')).toBe('admin');
    expect(getEffectiveViewMode('review', 'member')).toBe('review');
  });

  it('preserves authenticated session during Better Auth useSession background revalidation', () => {
    expect(
      shouldPreserveAuthenticatedSession({
        currentPhase: 'authenticated',
        isHookPending: true,
        hasHookUser: false,
        withinAuthGraceWindow: false,
      })
    ).toBe(true);

    expect(
      shouldPreserveAuthenticatedSession({
        currentPhase: 'authenticated',
        isHookPending: false,
        hasHookUser: false,
        withinAuthGraceWindow: true,
      })
    ).toBe(true);
  });

  it('normalizes SSR/session user payloads cleanly into domain User model', () => {
    const user = mapSessionUserToDomainUser({
      id: 'u-42',
      name: '',
      email: 'consultant@mfisca.fr',
      role: 'member',
    });

    expect(user.id).toBe('u-42');
    expect(user.name).toBe('consultant');
    expect(user.role).toBe('member');
    expect(user.status).toBe('active');
    expect(typeof user.createdAt).toBe('string');
  });
});
