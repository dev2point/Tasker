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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { authClient, signIn, signUp, signOut, useSession } from '@/lib/auth-client';
import { User, UserRole } from '@/types/user';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  currentUser?: User | null;
  onSignOut?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  currentUser: propCurrentUser,
  onSignOut,
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
  const [signUpRole, setSignUpRole] = useState<UserRole>('member');
  const [signUpDepartment, setSignUpDepartment] = useState('Tech');

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const res = await signIn.email({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (res.error) {
        setErrorMessage(
          res.error.message ||
            'Identifiants incorrects. Vérifiez votre adresse email et votre mot de passe.'
        );
      } else {
        setSuccessMessage('Connexion réussie !');
        setTimeout(() => {
          onAuthSuccess?.();
          onClose();
        }, 600);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'
      );
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
      const res = await signUp.email({
        name: signUpName.trim(),
        email: signUpEmail.trim(),
        password: signUpPassword,
        role: signUpRole,
        department: signUpDepartment,
      } as any);

      if (res.error) {
        setErrorMessage(
          res.error.message ||
            'Impossible de créer le compte. Cette adresse email est peut-être déjà utilisée.'
        );
      } else {
        setSuccessMessage('Compte créé avec succès et connecté !');
        setTimeout(() => {
          onAuthSuccess?.();
          onClose();
        }, 700);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (session?.user) {
        await signOut();
      }
      onSignOut?.();
      setSuccessMessage('Déconnexion réussie.');
      setTimeout(() => {
        onAuthSuccess?.();
        onClose();
      }, 500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erreur lors de la déconnexion.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const currentUser = propCurrentUser || (session?.user as any);

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="auth-modal-dialog"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] flex items-center justify-center text-[#422006] shadow-xs font-bold">
              <KeyRound className="w-4.5 h-4.5 stroke-[2.3]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                {currentUser ? 'Mon Compte' : mode === 'signin' ? 'Connexion' : 'Créer un compte'}
              </h3>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
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
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#F7C59F]/40 text-[#7c2d12] flex items-center justify-center font-bold text-lg border border-[#F7C59F]/80">
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
                      <h4 className="font-bold text-slate-900 truncate text-sm sm:text-base">
                        {currentUser.name}
                      </h4>
                      <Badge variant="apricot" className="text-[10px] uppercase font-bold py-0">
                        {currentUser.role || 'Membre'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    {currentUser.department && (
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {currentUser.department}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
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
                  className="w-full flex items-center justify-center gap-2 text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoading ? 'Déconnexion...' : 'Se déconnecter'}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full text-slate-600 text-xs"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            /* IF LOGGED OUT: SIGNIN / SIGNUP FORM */
            <div>
              {/* Segmented Mode Control */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-5">
                <button
                  id="auth-tab-signin"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-[#933F15] shadow-xs border border-[#F7C59F]/60'
                      : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-white text-[#933F15] shadow-xs border border-[#F7C59F]/60'
                      : 'text-slate-600 hover:text-slate-900'
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
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signin-email-input"
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signin-password-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signin-password-input"
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    className="w-full mt-2 font-bold py-2.5 rounded-xl shadow-sm text-xs sm:text-sm"
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
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Nom complet
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-name-input"
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="Ex: Sophie Martin"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-email-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-email-input"
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="sophie@entreprise.com"
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-password-input"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="signup-password-input"
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Mot de passe sécurisé"
                        className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label
                        htmlFor="signup-role-select"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Rôle
                      </label>
                      <select
                        id="signup-role-select"
                        value={signUpRole}
                        onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F]"
                      >
                        <option value="member">Membre</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-dept-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Département
                      </label>
                      <input
                        id="signup-dept-input"
                        type="text"
                        value={signUpDepartment}
                        onChange={(e) => setSignUpDepartment(e.target.value)}
                        placeholder="Ex: Produit"
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F7C59F]/40 focus:border-[#F7C59F]"
                      />
                    </div>
                  </div>

                  <Button
                    id="submit-signup-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-3 font-bold py-2.5 rounded-xl shadow-sm text-xs sm:text-sm"
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
