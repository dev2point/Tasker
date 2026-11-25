'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signIn, signUp } from '@/lib/auth-client';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';
import { BorderBeam } from '@/components/magicui/border-beam';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/components/ThemeProvider';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  evaluatePasswordPolicy,
  formatAuthErrorFrench,
  validateSignInFields,
  validateSignUpFields,
} from '@/lib/auth-password-policy';

interface AuthGateProps {
  onAuthSuccess?: (user?: any) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  const { isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpDepartment, setSignUpDepartment] = useState('');

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasAttemptedSignUp, setHasAttemptedSignUp] = useState(false);
  const [isSignUpPasswordFocused, setIsSignUpPasswordFocused] = useState(false);

  const passwordEvaluation = evaluatePasswordPolicy(signUpPassword);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = signInEmail.trim();
    const password = signInPassword;

    const fieldError = validateSignInFields({ email, password });
    if (fieldError) {
      setErrorMessage(fieldError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res?.error) {
        setErrorMessage(formatAuthErrorFrench(res.error, 'signin'));
        setIsLoading(false);
      } else {
        setSuccessMessage('Connexion réussie ! Chargement de votre espace...');
        const user = res?.data?.user;
        if (typeof window !== 'undefined' && res?.data?.token) {
          try {
            localStorage.setItem('planit_auth_token', res.data.token);
          } catch {}
        }
        onAuthSuccess?.(user);
      }
    } catch (err: unknown) {
      setErrorMessage(formatAuthErrorFrench(err, 'signin'));
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setHasAttemptedSignUp(true);

    const name = signUpName.trim();
    const email = signUpEmail.trim();
    const password = signUpPassword;

    const fieldError = validateSignUpFields({ name, email, password });
    if (fieldError) {
      setErrorMessage(fieldError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp.email({
        name,
        email,
        password,
        department: signUpDepartment.trim() || undefined,
      } as any);

      if (res?.error) {
        setErrorMessage(formatAuthErrorFrench(res.error, 'signup'));
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Compte créé avec succès ! Bienvenue.');
      const user = res?.data?.user;
      if (typeof window !== 'undefined' && res?.data?.token) {
        try {
          localStorage.setItem('planit_auth_token', res.data.token);
        } catch {}
      }
      onAuthSuccess?.(user);
    } catch (err: unknown) {
      setErrorMessage(formatAuthErrorFrench(err, 'signup'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 relative bg-[#F4F7FA] dark:bg-[#061826] text-[#0B1F30] dark:text-slate-100 overflow-hidden select-none">
      {/* Subtle Top-Right Theme Quick Switch */}
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        className="fixed top-4 right-4 z-20 inline-flex items-center gap-2 rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white/90 dark:bg-[#0B2438]/90 px-3 py-1.5 text-xs font-semibold text-[#0B1F30] dark:text-slate-200 shadow-sm hover:border-[#004266]/40 dark:hover:border-[#3895C9]/50 transition-colors cursor-pointer"
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-[#F77F00]" />
            <span>Clair</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-[#004266]" />
            <span>Sombre</span>
          </>
        )}
      </button>

      {/* Ambient Corporate Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(0,66,102,0.08),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(247,127,0,0.07),transparent_55%)] dark:bg-[radial-gradient(circle_at_25%_20%,rgba(56,149,201,0.14),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(247,127,0,0.10),transparent_55%)]"
      />

      {/* Dynamic Animated Dotted Ambient Background */}
      <DottedGlowBackground
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-60 overflow-hidden"
        gap={18}
        radius={1.4}
        color="rgba(0, 66, 102, 0.16)"
        darkColor="rgba(56, 149, 201, 0.22)"
        glowColor="rgba(247, 127, 0, 0.35)"
        darkGlowColor="rgba(247, 127, 0, 0.45)"
        speedMin={0.3}
        speedMax={1.1}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand & Security Header */}
        <div className="text-center mb-6 space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <div className="flex flex-col items-center justify-center gap-1.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#004266] dark:text-white">
              La Maison de la Fiscalité
            </h1>
            <Badge
              variant="outline"
              className="border-[#004266]/25 dark:border-[#3895C9]/40 bg-[#004266]/8 dark:bg-[#004266]/40 text-[#004266] dark:text-[#7CC4EB] text-[10px] font-bold py-0.5 gap-1"
            >
              <ShieldCheck className="w-3 h-3 text-[#F77F00]" />
              Espace Confidentiel Cabinet
            </Badge>
          </div>
          <p className="text-xs text-[#486075] dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
            Plateforme privée dédiée aux équipes du cabinet. Identifiez-vous pour accéder à vos dossiers, tâches et revues métier.
          </p>
        </div>

        {/* Security Access Card */}
        <div className="bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#004266]/10 dark:shadow-black/60 relative overflow-hidden text-[#0B1F30] dark:text-slate-100">
          <BorderBeam size={250} duration={10} colorFrom="#004266" colorTo="#F77F00" borderWidth={1.5} />

          {/* Top Tabs Switcher */}
          <div className="flex bg-[#EDF2F7] dark:bg-[#061826] p-1 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 mb-6 relative z-10">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
                setHasAttemptedSignUp(false);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[#004266] text-white shadow-md shadow-[#004266]/20'
                  : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
                setHasAttemptedSignUp(false);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#004266] text-white shadow-md shadow-[#004266]/20'
                  : 'text-[#486075] dark:text-slate-300 hover:text-[#0B1F30] dark:hover:text-white'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1.5">
                  Adresse email professionnelle
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="nom@lamaisondelafiscalite.fr"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-sm text-[#0B1F30] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#004266] dark:focus:border-[#3895C9] focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-sm text-[#0B1F30] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#004266] dark:focus:border-[#3895C9] focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
                  >
                    {showSignInPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="accent"
                disabled={isLoading}
                className="w-full h-11 font-bold transition-all shadow-lg shadow-[#F77F00]/25 gap-2 mt-2 cursor-pointer rounded-xl"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connexion en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 font-bold text-white">
                    <Lock className="w-4 h-4" />
                    Se connecter
                  </span>
                )}
              </Button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} noValidate className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="ex. Maître Sophie Martin"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-sm text-[#0B1F30] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#004266] dark:focus:border-[#3895C9] focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1">
                  Adresse email professionnelle
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="nom@lamaisondelafiscalite.fr"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-sm text-[#0B1F30] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#004266] dark:focus:border-[#3895C9] focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="authgate-signup-password"
                  className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                >
                  Mot de passe ({MIN_PASSWORD_LENGTH} caractères min.)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004266] dark:text-[#3895C9]" />
                  <input
                    id="authgate-signup-password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    value={signUpPassword}
                    onFocus={() => setIsSignUpPasswordFocused(true)}
                    onBlur={() => setIsSignUpPasswordFocused(false)}
                    onChange={(e) => {
                      setSignUpPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    aria-invalid={Boolean(
                      (signUpPassword.length > 0 || hasAttemptedSignUp) &&
                        !passwordEvaluation.isValidForSignUp
                    )}
                    aria-describedby="authgate-password-rules"
                    placeholder="12 caractères minimum"
                    className={`w-full pl-10 pr-10 py-2.5 bg-[#F4F7FA] dark:bg-[#061826]/70 border rounded-xl text-sm text-[#0B1F30] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                      (signUpPassword.length > 0 || hasAttemptedSignUp) &&
                      !passwordEvaluation.isValidForSignUp
                        ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
                        : signUpPassword.length > 0 && passwordEvaluation.isValidForSignUp
                          ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20'
                          : 'border-[#D8E2EC] dark:border-[#94B8D6]/25 focus:border-[#004266] dark:focus:border-[#3895C9] focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    aria-label={showSignUpPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
                  >
                    {showSignUpPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {(isSignUpPasswordFocused || signUpPassword.length > 0 || hasAttemptedSignUp) && (
                  <PasswordStrengthIndicator
                    id="authgate-password-rules"
                    password={signUpPassword}
                    showBlockingAlert={hasAttemptedSignUp}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1">
                  Département ou équipe (optionnel)
                </label>
                <input
                  type="text"
                  value={signUpDepartment}
                  onChange={(e) => setSignUpDepartment(e.target.value)}
                  placeholder="ex. Fiscalité, Comptabilité, Juridique..."
                  className="w-full px-3.5 py-2.5 bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-xs text-[#0B1F30] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 focus:outline-none focus:border-[#004266] dark:focus:border-[#3895C9]"
                />
              </div>

              <Button
                type="submit"
                variant="accent"
                disabled={isLoading}
                className="w-full h-11 font-bold transition-all shadow-lg shadow-[#F77F00]/25 gap-2 mt-2 cursor-pointer rounded-xl"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Création en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4" />
                    Créer mon compte
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Security and Confidentiality Guarantee Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#486075] dark:text-slate-400 text-center">
          <ShieldAlert className="w-3.5 h-3.5 text-[#F77F00] shrink-0" />
          <span>La Maison de la Fiscalité • Accès strictement confidentiel</span>
        </div>
      </div>
    </div>
  );
};
