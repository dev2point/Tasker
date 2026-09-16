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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authClient, signIn, signUp, signOut, useSession } from '@/lib/auth-client';
import { User, UserRole } from '@/types/user';
import { ViewMode } from '@/types/task';
import { BorderBeam } from '@/components/magicui/border-beam';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  currentUser?: User | null;
  onSignOut?: () => void;
  onViewChange?: (view: ViewMode) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  currentUser: propCurrentUser,
  onSignOut,
  onViewChange,
}) => {
  const { data: session, isPending: isSessionLoading } = useSession();
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

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('AuthModal sign in attempt:', signInEmail.trim());
      const res = await signIn.email({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      console.log('AuthModal sign in response:', res);

      if (res?.error) {
        const errDetail = res.error.message || JSON.stringify(res.error);
        setErrorMessage(`Erreur connexion (${res.error.status || 'API'}): ${errDetail}`);
      } else {
        setSuccessMessage('Connexion réussie !');
        setIsSignedOut(false);
        setTimeout(() => {
          onAuthSuccess?.();
          onClose();
          window.location.reload();
        }, 500);
      }
    } catch (err: any) {
      console.error('AuthModal sign in exception:', err);
      const msg = err?.message || err?.toString() || 'Erreur réseau';
      setErrorMessage(`Échec connexion: ${msg} (URL: ${window.location.origin})`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (signUpPassword.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('AuthModal sign up attempt:', signUpEmail.trim());
      const res = await signUp.email({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword,
        role: 'member',
        department: signUpDepartment.trim() || undefined,
      } as any);

      console.log('AuthModal sign up response:', res);

      if (res?.error) {
        const errDetail = res.error.message || JSON.stringify(res.error);
        setErrorMessage(`Erreur inscription (${res.error.status || 'API'}): ${errDetail}`);
      } else {
        setSuccessMessage('Compte créé avec succès et connecté !');
        setIsSignedOut(false);
        setTimeout(() => {
          onAuthSuccess?.();
          onClose();
          window.location.reload();
        }, 600);
      }
    } catch (err: any) {
      console.error('AuthModal sign up exception:', err);
      const msg = err?.message || err?.toString() || 'Erreur réseau';
      setErrorMessage(`Échec inscription: ${msg} (URL: ${window.location.origin})`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // 1. Better Auth client sign out
      try {
        await authClient.signOut();
      } catch (err) {
        console.warn('authClient.signOut error:', err);
      }

      // 2. Direct POST to sign-out endpoint to clear cookies
      try {
        await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {}

      // 3. Clear local storage traces if any
      try {
        localStorage.removeItem('better-auth.session_token');
      } catch {}

      setIsSignedOut(true);
      setSuccessMessage('Déconnexion réussie. Redirection...');
      onSignOut?.();

      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 400);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erreur lors de la déconnexion.'
      );
      setIsLoading(false);
    }
  };

  const currentUser = isSignedOut ? null : (propCurrentUser || (session?.user as any));

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="auth-modal-dialog"
        className="bg-[#061A13]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-emerald-500/30 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-md font-bold">
              <KeyRound className="w-4.5 h-4.5 stroke-[2.3]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                {currentUser ? 'Mon Compte' : mode === 'signin' ? 'Connexion' : 'Créer un compte'}
              </h3>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          {/* Status Banners */}
          {errorMessage && (
            <div
              id="auth-error-banner"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              id="auth-success-banner"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* IF ALREADY LOGGED IN */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/40 shadow-inner">
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
                      <h4 className="font-bold text-white truncate text-sm sm:text-base">
                        {currentUser.name}
                      </h4>
                      <Badge
                        variant="apricot"
                        onClick={() => {
                          console.log('[Planit AuthModal] Role pastille clicked: Navigating to admin');
                          if (onViewChange) onViewChange('admin');
                          onClose();
                        }}
                        title="Cliquer pour accéder à la Console d'Administration"
                        className="text-[10px] uppercase font-bold py-0.5 px-2 bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 cursor-pointer transition-all shadow-2xs gap-1 inline-flex items-center"
                      >
                        <Shield className="w-3 h-3 text-purple-300 shrink-0" />
                        {currentUser.role || 'Admin'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 truncate">{currentUser.email}</p>
                    {currentUser.department && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-emerald-400" />
                        {currentUser.department}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400" />
                    Connecté
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  id="signout-btn"
                  variant="destructive"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoading ? 'Déconnexion...' : 'Se déconnecter'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full border-emerald-500/30 text-slate-300 hover:bg-emerald-500/20 hover:text-white text-xs rounded-xl"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            /* IF LOGGED OUT: SIGNIN / SIGNUP FORM */
            <div>
              {/* Segmented Mode Control */}
              <div className="flex p-1 bg-emerald-950/60 rounded-xl border border-emerald-500/30 mb-5">
                <button
                  id="auth-tab-signin"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-emerald-500/30 text-amber-300 shadow-xs border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
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
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-emerald-500/30 text-amber-300 shadow-xs border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Créer un compte
                </button>
              </div>

              {/* SIGN IN FORM */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="signin-email-input"
                      className="block text-xs font-semibold text-slate-200 mb-1"
                    >
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signin-email-input"
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signin-password-input"
                      className="block text-xs font-semibold text-slate-200 mb-1"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signin-password-input"
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                    disabled={isLoading}
                    className="w-full mt-2 font-bold py-2.5 rounded-xl shadow-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer text-xs sm:text-sm"
                  >
                    {isLoading ? 'Connexion en cours...' : 'Se connecter'}
                  </Button>
                </form>
              )}

              {/* SIGN UP FORM */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div>
                    <label
                      htmlFor="signup-name-input"
                      className="block text-xs font-semibold text-slate-200 mb-1"
                    >
                      Nom complet
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-name-input"
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="Ex: Sophie Martin"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-email-input"
                      className="block text-xs font-semibold text-slate-200 mb-1"
                    >
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-email-input"
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="sophie@entreprise.com"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-password-input"
                      className="block text-xs font-semibold text-slate-200 mb-1"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-password-input"
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Mot de passe sécurisé"
                        className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label
                      htmlFor="signup-dept-input"
                      className="block text-xs font-semibold text-slate-200 mb-1"
                    >
                      Département ou équipe (optionnel)
                    </label>
                    <input
                      id="signup-dept-input"
                      type="text"
                      value={signUpDepartment}
                      onChange={(e) => setSignUpDepartment(e.target.value)}
                      placeholder="Ex: Marketing, Finance, Technique..."
                      className="w-full px-2.5 py-2 text-xs sm:text-sm bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                    />
                  </div>

                  <Button
                    id="submit-signup-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-3 font-bold py-2.5 rounded-xl shadow-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-400/50 cursor-pointer text-xs sm:text-sm"
                  >
                    {isLoading ? 'Création en cours...' : 'Créer mon compte'}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* End of content */}
        </div>
      </div>
    </div>
  );
};
