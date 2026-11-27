'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { authClient, signIn, signUp, useSession } from '@/lib/auth-client';
import { User } from '@/types/user';
import { ViewMode } from '@/types/task';
import { BorderBeam } from '@/components/magicui/border-beam';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { BrandLogo } from '@/components/BrandLogo';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  evaluatePasswordPolicy,
  formatAuthErrorFrench,
  validateSignInFields,
  validateSignUpFields,
} from '@/lib/auth-password-policy';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user?: any) => void;
  currentUser?: User | null;
  onSignOut?: () => void | Promise<void>;
  onViewChange?: (view: ViewMode) => void;
  isSidebarCollapsed?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  ...props
}) => {
  if (!isOpen) return null;
  return <AuthModalInner key={props.currentUser?.id || 'anonymous'} {...props} />;
};

const AuthModalInner: React.FC<Omit<AuthModalProps, 'isOpen'>> = ({
  onClose,
  onAuthSuccess,
  currentUser: propCurrentUser,
  onSignOut,
  onViewChange,
}) => {
  const { data: session } = useSession();
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
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [hasAttemptedSignUp, setHasAttemptedSignUp] = useState(false);
  const [isSignUpPasswordFocused, setIsSignUpPasswordFocused] = useState(false);

  const passwordEvaluation = evaluatePasswordPolicy(signUpPassword);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fieldError = validateSignInFields({
      email: signInEmail,
      password: signInPassword,
    });
    if (fieldError) {
      setErrorMessage(fieldError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn.email({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (res?.error) {
        setErrorMessage(formatAuthErrorFrench(res.error, 'signin'));
        setIsLoading(false);
      } else {
        setSuccessMessage('Connexion réussie !');
        setIsSignedOut(false);
        if (typeof window !== 'undefined' && res?.data?.token) {
          try {
            localStorage.setItem('planit_auth_token', res.data.token);
          } catch {}
        }
        onAuthSuccess?.(res?.data?.user);
        onClose();
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

    const fieldError = validateSignUpFields({
      name: signUpName,
      email: signUpEmail,
      password: signUpPassword,
    });
    if (fieldError) {
      setErrorMessage(fieldError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp.email({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword,
        role: 'member',
        department: signUpDepartment.trim() || undefined,
      } as any);

      if (res?.error) {
        setErrorMessage(formatAuthErrorFrench(res.error, 'signup'));
        setIsLoading(false);
      } else {
        setSuccessMessage('Compte créé avec succès et connecté !');
        setIsSignedOut(false);
        if (typeof window !== 'undefined' && res?.data?.token) {
          try {
            localStorage.setItem('planit_auth_token', res.data.token);
          } catch {}
        }
        onAuthSuccess?.(res?.data?.user);
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(formatAuthErrorFrench(err, 'signup'));
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (onSignOut) {
      await onSignOut();
      return;
    }
    try {
      let signedOut = false;
      try {
        const res = await authClient.signOut();
        signedOut = !res?.error;
      } catch {
        signedOut = false;
      }
      if (!signedOut) {
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }).catch(() => {});
      }
      try {
        localStorage.removeItem('planit_auth_token');
        localStorage.removeItem('better-auth.session_token');
      } catch {}
      setIsSignedOut(true);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatAuthErrorFrench(err, 'signout'));
      setIsLoading(false);
    }
  };

  const currentUser = isSignedOut ? null : (propCurrentUser || (session?.user as any));

  return (
    <ModalPortal>
      <div
        id="auth-modal-backdrop"
        className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-[#061826]/70 backdrop-blur-md animate-in fade-in duration-150"
        onClick={onClose}
      >
      <div
        id="auth-modal-dialog"
        className="bg-white dark:bg-[#0B2438] rounded-3xl shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] animate-in zoom-in-95 duration-150 relative text-[#0B1F30] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <BorderBeam size={250} duration={12} delay={9} colorFrom="#004266" colorTo="#F77F00" />

        {/* LEFT PANEL: Corporate Cabinet Blue Split Screen */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#004266] via-[#00314D] to-[#061826] p-8 flex-col justify-between border-r border-[#004266]/30 relative overflow-hidden shrink-0 text-white">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#3895C9]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#F77F00]/12 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <BrandLogo variant="white" size="md" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#FFD09B] text-xs font-bold shadow-sm">
              <Shield className="w-3.5 h-3.5 text-[#F77F00]" />
              <span>La Maison de la Fiscalité</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                Plateforme Collaborative de Gestion & Revue Métier
              </h2>
              <p className="text-xs text-slate-200/85 mt-2 leading-relaxed">
                Espace sécurisé dédié aux équipes et collaborateurs du cabinet pour le suivi des tâches, des échéances et des révisions inter-pôles.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-3 my-6">
            <div className="p-3 rounded-2xl bg-white/8 border border-white/15 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Shield className="w-4 h-4 text-[#F77F00]" />
                <span>Sécurité & Conformité RGPD</span>
              </div>
              <p className="text-[11px] text-slate-200/85 leading-relaxed">
                Chiffrement de bout en bout, cloisonnement strict des accès par rôle et journal d&apos;audit légal infalsifiable.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-100/90 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#F77F00]/20 border border-[#F77F00]/50 flex items-center justify-center text-[#FFD09B]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Gestionnaire de tâches & Calendrier iCal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#F77F00]/20 border border-[#F77F00]/50 flex items-center justify-center text-[#FFD09B]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Validation Maker-Checker & Revue métier</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#F77F00]/20 border border-[#F77F00]/50 flex items-center justify-center text-[#FFD09B]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Sauvegarde sécurisée &amp; Mode Hors-ligne</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/15 text-[11px] text-slate-300/80 flex items-center justify-between">
            <span>La Maison de la Fiscalité</span>
            <span className="font-mono">Cabinet Connecté</span>
          </div>
        </div>

        {/* RIGHT PANEL: Form / Account Management */}
        <div className="flex-1 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 bg-[#F4F7FA] dark:bg-[#061826]/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/40 flex items-center justify-center shadow-xs font-bold md:hidden">
                <KeyRound className="w-4.5 h-4.5 stroke-[2.3]" />
              </div>
              <div>
                <h3 className="font-bold text-[#0B1F30] dark:text-white text-base sm:text-lg tracking-tight">
                  {currentUser ? 'Mon Compte' : mode === 'signin' ? 'Connexion — La Maison de la Fiscalité' : 'Créer un compte'}
                </h3>
              </div>
            </div>
            <button
              id="close-auth-modal-btn"
              type="button"
              onClick={onClose}
              className="text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white p-1.5 rounded-lg hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
            {/* Status Banners */}
            {errorMessage && (
              <div
                id="auth-error-banner"
                className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div
                id="auth-success-banner"
                className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </div>
            )}

            {/* IF ALREADY LOGGED IN */}
            {currentUser ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#F4F7FA] dark:bg-[#061826]/70 rounded-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#004266] text-white flex items-center justify-center font-bold text-lg shadow-inner">
                      {currentUser.name
                        ? currentUser.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#0B1F30] dark:text-white truncate text-sm sm:text-base">
                          {currentUser.name}
                        </h4>
                        <Badge
                          variant="default"
                          onClick={
                            currentUser.role === 'admin'
                              ? () => {
                                  if (onViewChange) onViewChange('admin');
                                  onClose();
                                }
                              : undefined
                          }
                          title={
                            currentUser.role === 'admin'
                              ? "Cliquer pour accéder à la Console d'Administration"
                              : `Rôle : ${currentUser.role || 'member'}`
                          }
                          className={`text-[10px] uppercase font-bold py-0.5 px-2 bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/25 dark:border-[#3895C9]/40 shadow-2xs gap-1 inline-flex items-center ${
                            currentUser.role === 'admin'
                              ? 'hover:bg-[#004266]/20 cursor-pointer transition-all'
                              : ''
                          }`}
                        >
                          <Shield className="w-3 h-3 text-[#F77F00] shrink-0" />
                          {currentUser.role || 'member'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#486075] dark:text-slate-300 truncate">{currentUser.email}</p>
                      {currentUser.department && (
                        <p className="text-[11px] text-[#486075] dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-[#004266] dark:text-[#3895C9]" />
                          {currentUser.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between text-xs text-[#486075] dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Connecté en session sécurisée
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    id="signout-btn"
                    variant="destructive"
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoading ? 'Déconnexion...' : 'Se déconnecter'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full text-xs rounded-xl cursor-pointer"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            ) : (
              /* IF LOGGED OUT: SIGNIN / SIGNUP FORM */
              <div>
                {/* Segmented Mode Control */}
                <div className="flex p-1 bg-[#EDF2F7] dark:bg-[#061826] rounded-xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 mb-5">
                  <button
                    id="auth-tab-signin"
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                      setHasAttemptedSignUp(false);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'signin'
                        ? 'bg-[#004266] text-white shadow-xs'
                        : 'text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white'
                    }`}
                  >
                    Se connecter
                  </button>
                  <button
                    id="auth-tab-signup"
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                      setHasAttemptedSignUp(false);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-[#004266] text-white shadow-xs'
                        : 'text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white'
                    }`}
                  >
                    Créer un compte
                  </button>
                </div>

                {/* SIGN IN FORM */}
                {mode === 'signin' && (
                  <form onSubmit={handleSignIn} noValidate className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="signin-email-input"
                        className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                      >
                        Adresse email professionnelle
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#004266] dark:text-[#3895C9] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="signin-email-input"
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="vous@lamaisondelafiscalite.fr"
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 focus:border-[#004266] dark:focus:border-[#3895C9] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signin-password-input"
                        className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                      >
                        Mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#004266] dark:text-[#3895C9] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="signin-password-input"
                          type={showSignInPassword ? 'text' : 'password'}
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="Votre mot de passe"
                          className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 focus:border-[#004266] dark:focus:border-[#3895C9] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
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
                      id="submit-signin-btn"
                      type="submit"
                      variant="accent"
                      disabled={isLoading}
                      className="w-full mt-3 font-bold py-2.5 rounded-xl shadow-md cursor-pointer text-xs sm:text-sm"
                    >
                      {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                    </Button>
                  </form>
                )}

                {/* SIGN UP FORM */}
                {mode === 'signup' && (
                  <form onSubmit={handleSignUp} noValidate className="space-y-3">
                    <div>
                      <label
                        htmlFor="signup-name-input"
                        className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                      >
                        Nom complet
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-[#004266] dark:text-[#3895C9] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="signup-name-input"
                          type="text"
                          required
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          placeholder="Ex: Maître Sophie Martin"
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 focus:border-[#004266] dark:focus:border-[#3895C9] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-email-input"
                        className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                      >
                        Adresse email professionnelle
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#004266] dark:text-[#3895C9] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="signup-email-input"
                          type="email"
                          required
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          placeholder="sophie@lamaisondelafiscalite.fr"
                          className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 focus:border-[#004266] dark:focus:border-[#3895C9] transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-password-input"
                        className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                      >
                        Mot de passe sécurisé ({MIN_PASSWORD_LENGTH} caractères min.)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#004266] dark:text-[#3895C9] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="signup-password-input"
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
                          aria-describedby="authmodal-password-rules"
                          placeholder="12 caractères minimum"
                          className={`w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-[#F4F7FA] dark:bg-[#061826]/70 border rounded-xl text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                            (signUpPassword.length > 0 || hasAttemptedSignUp) &&
                            !passwordEvaluation.isValidForSignUp
                              ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
                              : signUpPassword.length > 0 && passwordEvaluation.isValidForSignUp
                                ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20'
                                : 'border-[#D8E2EC] dark:border-[#94B8D6]/25 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 focus:border-[#004266] dark:focus:border-[#3895C9]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          aria-label={showSignUpPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#486075] dark:text-slate-400 hover:text-[#0B1F30] dark:hover:text-white cursor-pointer"
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
                          id="authmodal-password-rules"
                          password={signUpPassword}
                          showBlockingAlert={hasAttemptedSignUp}
                        />
                      )}
                    </div>

                    <div className="pt-0.5">
                      <label
                        htmlFor="signup-dept-input"
                        className="block text-xs font-semibold text-[#0B1F30] dark:text-slate-200 mb-1"
                      >
                        Département / Équipe (optionnel)
                      </label>
                      <input
                        id="signup-dept-input"
                        type="text"
                        value={signUpDepartment}
                        onChange={(e) => setSignUpDepartment(e.target.value)}
                        placeholder="Ex: Fiscalité, Comptabilité, Juridique..."
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-[#F4F7FA] dark:bg-[#061826]/70 border border-[#D8E2EC] dark:border-[#94B8D6]/25 rounded-xl text-[#0B1F30] dark:text-white placeholder:text-[#64748B] dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004266]/20 dark:focus:ring-[#3895C9]/30 focus:border-[#004266] dark:focus:border-[#3895C9]"
                      />
                    </div>

                    <Button
                      id="submit-signup-btn"
                      type="submit"
                      variant="accent"
                      disabled={isLoading}
                      className="w-full mt-3 font-bold py-2.5 rounded-xl shadow-md cursor-pointer text-xs sm:text-sm"
                    >
                      {isLoading ? 'Création en cours...' : 'Créer mon compte'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
