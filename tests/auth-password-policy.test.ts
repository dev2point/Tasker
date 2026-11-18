import { describe, it, expect } from 'vitest';
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  evaluatePasswordPolicy,
  validateSignInFields,
  validateSignUpFields,
  formatAuthErrorFrench,
} from '@/lib/auth-password-policy';

describe('Auth Password Policy & French Error Localization', () => {
  it('enforces 12-character minimum matching BetterAuth server config', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(MAX_PASSWORD_LENGTH).toBe(128);
  });

  it('evaluates live password strength and criteria accurately', () => {
    const empty = evaluatePasswordPolicy('');
    expect(empty.score).toBe(0);
    expect(empty.isValidForSignUp).toBe(false);

    const tooShort = evaluatePasswordPolicy('Ab1!short');
    expect(tooShort.length).toBe(9);
    expect(tooShort.score).toBe(1);
    expect(tooShort.label).toBe('Trop court');
    expect(tooShort.hasMinLength).toBe(false);
    expect(tooShort.hasUppercase).toBe(true);
    expect(tooShort.hasNumber).toBe(true);
    expect(tooShort.hasSpecial).toBe(true);
    expect(tooShort.isValidForSignUp).toBe(false);
    expect(tooShort.blockingError).toContain('12 caractères');

    const minimalValid = evaluatePasswordPolicy('abcdefghijkl');
    expect(minimalValid.score).toBe(2);
    expect(minimalValid.label).toBe('Valide');
    expect(minimalValid.isValidForSignUp).toBe(true);
    expect(minimalValid.blockingError).toBeNull();

    const good = evaluatePasswordPolicy('Cabinet2026aa');
    expect(good.score).toBe(3);
    expect(good.label).toBe('Bon');
    expect(good.isValidForSignUp).toBe(true);

    const excellent = evaluatePasswordPolicy('Cabinet#2026!Ok');
    expect(excellent.score).toBe(4);
    expect(excellent.label).toBe('Excellent');
    expect(excellent.isValidForSignUp).toBe(true);

    const tooLong = evaluatePasswordPolicy('a'.repeat(130));
    expect(tooLong.isWithinMaxLength).toBe(false);
    expect(tooLong.isValidForSignUp).toBe(false);
    expect(tooLong.blockingError).toContain('128 caractères');
  });

  it('validates sign-in and sign-up fields with French error messages', () => {
    expect(validateSignInFields({ email: '', password: '' })).toBe(
      'Veuillez renseigner votre adresse email.'
    );
    expect(validateSignInFields({ email: 'invalide', password: 'secret' })).toBe(
      'Veuillez saisir une adresse email valide.'
    );
    expect(validateSignInFields({ email: 'user@cabinet.fr', password: '' })).toBe(
      'Veuillez saisir votre mot de passe.'
    );
    expect(
      validateSignInFields({ email: 'user@cabinet.fr', password: 'secret' })
    ).toBeNull();

    expect(
      validateSignUpFields({
        name: '',
        email: 'user@cabinet.fr',
        password: 'ValidPassword12!',
      })
    ).toBe('Veuillez renseigner votre nom complet.');

    expect(
      validateSignUpFields({
        name: 'Claire Martin',
        email: 'claire@cabinet.fr',
        password: 'short',
      })
    ).toContain('12 caractères');

    expect(
      validateSignUpFields({
        name: 'Claire Martin',
        email: 'claire@cabinet.fr',
        password: 'ClaireCabinet#2026',
      })
    ).toBeNull();
  });

  it('translates BetterAuth codes, English messages, and network errors to French', () => {
    expect(
      formatAuthErrorFrench(
        { code: 'PASSWORD_TOO_SHORT', message: 'Password is too short' },
        'signup'
      )
    ).toBe('Le mot de passe doit contenir au moins 12 caractères.');

    expect(
      formatAuthErrorFrench(
        { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
        'signin'
      )
    ).toBe('Adresse email ou mot de passe incorrect.');

    expect(
      formatAuthErrorFrench(
        { code: 'USER_ALREADY_EXISTS', message: 'User already exists' },
        'signup'
      )
    ).toBe('Un compte existe déjà avec cette adresse email.');

    expect(
      formatAuthErrorFrench({ message: 'Failed to fetch' }, 'signin')
    ).toContain('Impossible de joindre le serveur');

    expect(formatAuthErrorFrench({ status: 429 }, 'signin')).toContain(
      'Trop de tentatives'
    );
  });
});
