export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordEvaluation {
  length: number;
  minLength: number;
  maxLength: number;
  hasMinLength: boolean;
  isWithinMaxLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  score: PasswordStrengthLevel;
  label: string;
  isValidForSignUp: boolean;
  blockingError: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function evaluatePasswordPolicy(password: string): PasswordEvaluation {
  const length = password.length;
  const hasMinLength = length >= MIN_PASSWORD_LENGTH;
  const isWithinMaxLength = length <= MAX_PASSWORD_LENGTH;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const bonusCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  let score: PasswordStrengthLevel = 0;
  let label = 'À saisir';

  if (length === 0) {
    score = 0;
    label = 'À saisir';
  } else if (!hasMinLength) {
    score = 1;
    label = 'Trop court';
  } else if (bonusCount >= 4 || (bonusCount >= 3 && length >= 14)) {
    score = 4;
    label = 'Excellent';
  } else if (bonusCount >= 2) {
    score = 3;
    label = 'Bon';
  } else {
    score = 2;
    label = 'Valide';
  }

  let blockingError: string | null = null;
  if (length === 0) {
    blockingError = 'Veuillez saisir un mot de passe.';
  } else if (!hasMinLength) {
    blockingError = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères (actuellement ${length}).`;
  } else if (!isWithinMaxLength) {
    blockingError = `Le mot de passe ne doit pas dépasser ${MAX_PASSWORD_LENGTH} caractères.`;
  }

  return {
    length,
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
    hasMinLength,
    isWithinMaxLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    score,
    label,
    isValidForSignUp: hasMinLength && isWithinMaxLength,
    blockingError,
  };
}

export function validateSignInFields(input: {
  email: string;
  password: string;
}): string | null {
  const email = input.email.trim();
  if (!email) {
    return 'Veuillez renseigner votre adresse email.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'Veuillez saisir une adresse email valide.';
  }
  if (!input.password) {
    return 'Veuillez saisir votre mot de passe.';
  }
  return null;
}

export function validateSignUpFields(input: {
  name: string;
  email: string;
  password: string;
}): string | null {
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name) {
    return 'Veuillez renseigner votre nom complet.';
  }
  if (!email) {
    return 'Veuillez renseigner votre adresse email.';
  }
  if (!EMAIL_PATTERN.test(email)) {
    return 'Veuillez saisir une adresse email valide.';
  }
  const evaluation = evaluatePasswordPolicy(input.password);
  if (!evaluation.isValidForSignUp) {
    return evaluation.blockingError;
  }
  return null;
}

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

function extractAuthErrorDetails(error: unknown): AuthErrorLike {
  if (!error) return {};
  if (typeof error === 'string') return { message: error };
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      code: typeof obj.code === 'string' ? obj.code : undefined,
      message: typeof obj.message === 'string' ? obj.message : undefined,
      status: typeof obj.status === 'number' ? obj.status : undefined,
    };
  }
  return {};
}

/**
 * Translates BetterAuth and network authentication errors into clear French messages.
 */
export function formatAuthErrorFrench(
  error: unknown,
  context: 'signin' | 'signup' | 'signout' = 'signin'
): string {
  const { code, message, status } = extractAuthErrorDetails(error);
  const normalizedCode = (code || '').toUpperCase().trim();
  const normalizedMsg = (message || '').toLowerCase().trim();

  if (
    normalizedCode === 'PASSWORD_TOO_SHORT' ||
    normalizedMsg.includes('password is too short') ||
    normalizedMsg.includes('password too short') ||
    normalizedMsg.includes('too short') ||
    normalizedMsg.includes('at least')
  ) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }

  if (
    normalizedCode === 'PASSWORD_TOO_LONG' ||
    normalizedMsg.includes('password is too long') ||
    normalizedMsg.includes('password too long') ||
    normalizedMsg.includes('too long')
  ) {
    return `Le mot de passe ne doit pas dépasser ${MAX_PASSWORD_LENGTH} caractères.`;
  }

  if (
    normalizedCode === 'INVALID_EMAIL_OR_PASSWORD' ||
    normalizedCode === 'INVALID_PASSWORD' ||
    normalizedCode === 'CREDENTIAL_ACCOUNT_NOT_FOUND' ||
    normalizedMsg.includes('invalid email or password') ||
    normalizedMsg.includes('invalid credentials') ||
    normalizedMsg.includes('invalid password') ||
    normalizedMsg.includes('credential account not found')
  ) {
    return 'Adresse email ou mot de passe incorrect.';
  }

  if (
    normalizedCode === 'USER_ALREADY_EXISTS' ||
    normalizedCode === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ||
    normalizedMsg.includes('user already exists') ||
    normalizedMsg.includes('already exists') ||
    normalizedMsg.includes('use another email')
  ) {
    return 'Un compte existe déjà avec cette adresse email.';
  }

  if (
    normalizedCode === 'INVALID_EMAIL' ||
    normalizedMsg.includes('invalid email')
  ) {
    return 'L’adresse email saisie n’est pas valide.';
  }

  if (
    normalizedCode === 'USER_NOT_FOUND' ||
    normalizedMsg.includes('user not found')
  ) {
    return 'Aucun compte associé à cette adresse email.';
  }

  if (
    normalizedCode === 'EMAIL_NOT_VERIFIED' ||
    normalizedMsg.includes('email not verified')
  ) {
    return 'Votre adresse email n’a pas encore été vérifiée.';
  }

  if (
    normalizedCode === 'TOO_MANY_REQUESTS' ||
    status === 429 ||
    normalizedMsg.includes('too many requests') ||
    normalizedMsg.includes('rate limit')
  ) {
    return 'Trop de tentatives effectuées. Veuillez patienter quelques instants avant de réessayer.';
  }

  if (
    normalizedCode === 'SESSION_EXPIRED' ||
    normalizedMsg.includes('session expired')
  ) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }

  if (
    normalizedMsg.includes('failed to fetch') ||
    normalizedMsg.includes('networkerror') ||
    normalizedMsg.includes('network error') ||
    normalizedMsg.includes('load failed')
  ) {
    return 'Impossible de joindre le serveur d’authentification. Vérifiez votre connexion et réessayez.';
  }

  if (status === 401) {
    return 'Adresse email ou mot de passe incorrect.';
  }

  if (status === 409) {
    return 'Un compte existe déjà avec cette adresse email.';
  }

  if (status && status >= 500) {
    return 'Le serveur d’authentification rencontre une erreur temporaire. Veuillez réessayer.';
  }

  if (context === 'signup') {
    return 'Impossible de créer le compte. Vérifiez vos informations et réessayez.';
  }
  if (context === 'signout') {
    return 'Impossible de finaliser la déconnexion pour le moment.';
  }
  return 'Impossible de vous connecter. Vérifiez vos identifiants et réessayez.';
}
