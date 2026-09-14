'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Briefcase,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar as CalendarIcon,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signIn, signUp } from '@/lib/auth-client';
import { UserRole } from '@/types/user';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';

interface AuthGateProps {
  onAuthSuccess?: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
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

      if (res?.error) {
        setErrorMessage(
          res.error.message ||
            'Identifiants non reconnus. Vérifiez votre adresse email et votre mot de passe.'
        );
      } else {
        setSuccessMessage('Authentification réussie. Chargement de votre espace...');
        setTimeout(() => {
          onAuthSuccess?.();
          window.location.reload();
        }, 400);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Une erreur inattendue est survenue lors de la connexion.'
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
        role: 'member',
        department: signUpDepartment.trim() || undefined,
      } as any);

      if (res?.error) {
        setErrorMessage(
          res.error.message ||
            'Impossible de créer le compte. Cette adresse email est peut-être déjà enregistrée.'
        );
        return;
      }

      // Automatically sign in the newly registered user
      const loginRes = await signIn.email({
        email: signUpEmail.trim(),
        password: signUpPassword,
      });

      if (loginRes?.error) {
        setSuccessMessage('Compte créé ! Veuillez vous identifier avec votre mot de passe.');
        setMode('signin');
        setSignInEmail(signUpEmail.trim());
      } else {
        setSuccessMessage('Compte créé et session initialisée. Accès en cours...');
        setTimeout(() => {
          onAuthSuccess?.();
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Une erreur inattendue est survenue lors de la création.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 relative bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Dynamic Animated Dotted Ambient Background */}
      <DottedGlowBackground
        className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden"
        gap={16}
        radius={1.5}
        color="rgba(148, 163, 184, 0.3)"
        glowColor="rgba(238, 141, 75, 0.8)"
        speedMin={0.3}
        speedMax={1.2}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand & Security Header */}
        <div className="text-center mb-6 space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] shadow-lg shadow-[#F7C59F]/20 font-bold mb-1">
            <CalendarIcon className="w-7 h-7 stroke-[2.3]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Planit</h1>
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/60 text-emerald-400 text-[10px] font-bold py-0.5 gap-1">
              <ShieldCheck className="w-3 h-3" />
              Espace Confidentiel
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Application privée réservée aux membres autorisés. Veuillez vous identifier pour accéder à vos tâches, agendas et données.
          </p>
        </div>

        {/* Security Access Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          {/* Top Tabs Switcher */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-[#F7C59F] text-[#422006] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Connexion Sécurisée
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-[#F7C59F] text-[#422006] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Créer un Compte
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#F7C59F] focus:ring-1 focus:ring-[#F7C59F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#F7C59F] focus:ring-1 focus:ring-[#F7C59F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
                disabled={isLoading}
                className="w-full h-10 font-bold bg-[#F7C59F] hover:bg-[#EE8D4B] text-[#422006] transition-all shadow-md shadow-[#F7C59F]/10 gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#422006] border-t-transparent rounded-full animate-spin" />
                    Authentification...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Déverrouiller l’application
                  </span>
                )}
              </Button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="ex. Marie Curie"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#F7C59F] focus:ring-1 focus:ring-[#F7C59F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#F7C59F] focus:ring-1 focus:ring-[#F7C59F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mot de passe (min. 6 caractères)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#F7C59F] focus:ring-1 focus:ring-[#F7C59F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showSignUpPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Département ou équipe (optionnel)
                </label>
                <input
                  type="text"
                  value={signUpDepartment}
                  onChange={(e) => setSignUpDepartment(e.target.value)}
                  placeholder="ex. Marketing, Finance, Technique..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#F7C59F]"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 font-bold bg-[#F7C59F] hover:bg-[#EE8D4B] text-[#422006] transition-all shadow-md shadow-[#F7C59F]/10 gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#422006] border-t-transparent rounded-full animate-spin" />
                    Création en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Créer mon compte & Accéder
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Security and Confidentiality Guarantee Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Protection cryptographique des données • Accès strictement confidentiel</span>
        </div>
      </div>
    </div>
  );
};
