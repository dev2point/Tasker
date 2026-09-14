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
import { BorderBeam } from '@/components/magicui/border-beam';

interface AuthGateProps {
  onAuthSuccess?: (user?: any) => void;
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

    const email = signInEmail.trim();
    const password = signInPassword;

    if (!email || !password) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting sign in for:', email, 'baseURL:', window.location.origin);
      const res = await signIn.email({
        email,
        password,
      });

      console.log('Sign in response:', res);

      if (res?.error) {
        const errDetail = res.error.message || JSON.stringify(res.error);
        setErrorMessage(`Erreur de connexion (${res.error.status || 'API'}): ${errDetail}`);
      } else {
        setSuccessMessage('Connexion réussie ! Chargement de votre espace...');
        const user = res?.data?.user;
        if (typeof window !== 'undefined' && res?.data?.token) {
          try {
            localStorage.setItem('planit_auth_token', res.data.token);
          } catch {}
        }
        setTimeout(() => {
          onAuthSuccess?.(user);
        }, 150);
      }
    } catch (err: any) {
      console.error('Sign in exception:', err);
      const msg = err?.message || err?.toString() || 'Erreur réseau ou CORS';
      setErrorMessage(`Échec de la requête de connexion: ${msg} (URL: ${window.location.origin})`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const name = signUpName.trim();
    const email = signUpEmail.trim();
    const password = signUpPassword;

    if (!name || !email || !password) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting sign up for:', email, 'baseURL:', window.location.origin);
      const res = await signUp.email({
        name,
        email,
        password,
        department: signUpDepartment.trim() || undefined,
      } as any);

      console.log('Sign up response:', res);

      if (res?.error) {
        const errDetail = res.error.message || JSON.stringify(res.error);
        setErrorMessage(`Erreur de création de compte (${res.error.status || 'API'}): ${errDetail}`);
        return;
      }

      setSuccessMessage('Compte créé avec succès ! Bienvenue.');
      const user = res?.data?.user;
      if (typeof window !== 'undefined' && res?.data?.token) {
        try {
          localStorage.setItem('planit_auth_token', res.data.token);
        } catch {}
      }
      setTimeout(() => {
        onAuthSuccess?.(user);
      }, 200);
    } catch (err: any) {
      console.error('Sign up exception:', err);
      const msg = err?.message || err?.toString() || 'Erreur réseau ou CORS';
      setErrorMessage(`Échec de la requête d'inscription: ${msg} (URL: ${window.location.origin})`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 relative bg-slate-50 text-slate-900 overflow-hidden select-none">
      {/* Dynamic Animated Dotted Ambient Background */}
      <DottedGlowBackground
        className="pointer-events-none absolute inset-0 opacity-60 overflow-hidden"
        gap={16}
        radius={1.5}
        color="rgba(148, 163, 184, 0.25)"
        glowColor="rgba(238, 141, 75, 0.4)"
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
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Planit</h1>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-bold py-0.5 gap-1">
              <ShieldCheck className="w-3 h-3" />
              Espace Confidentiel
            </Badge>
          </div>
          <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
            Application privée réservée aux membres autorisés. Veuillez vous identifier pour accéder à vos tâches, agendas et données.
          </p>
        </div>

        {/* Security Access Card */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/90 rounded-2xl p-6 shadow-2xl shadow-slate-900/15 relative overflow-hidden text-slate-800">
          {/* Glass Inner Reflection Highlight */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/70 via-transparent to-black/5 pointer-events-none" />
          <BorderBeam size={250} duration={10} colorFrom="#F7C59F" colorTo="#EE8D4B" borderWidth={1.5} />
          {/* Top Tabs Switcher */}
          <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 mb-6 relative z-10">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/80 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#EE8D4B] focus:ring-1 focus:ring-[#EE8D4B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-white/80 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#EE8D4B] focus:ring-1 focus:ring-[#EE8D4B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                className="w-full h-10 font-bold bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] hover:opacity-95 text-[#422006] transition-all shadow-md shadow-[#F7C59F]/20 gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#422006] border-t-transparent rounded-full animate-spin" />
                    Connexion en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Se connecter
                  </span>
                )}
              </Button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="ex. Marie Curie"
                    className="w-full pl-9 pr-3 py-2 bg-white/80 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#EE8D4B] focus:ring-1 focus:ring-[#EE8D4B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="nom@entreprise.com"
                    className="w-full pl-9 pr-3 py-2 bg-white/80 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#EE8D4B] focus:ring-1 focus:ring-[#EE8D4B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mot de passe (min. 6 caractères)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-white/80 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#EE8D4B] focus:ring-1 focus:ring-[#EE8D4B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Département ou équipe (optionnel)
                </label>
                <input
                  type="text"
                  value={signUpDepartment}
                  onChange={(e) => setSignUpDepartment(e.target.value)}
                  placeholder="ex. Marketing, Finance, Technique..."
                  className="w-full px-3 py-2 bg-white/80 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#EE8D4B]"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 font-bold bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] hover:opacity-95 text-[#422006] transition-all shadow-md shadow-[#F7C59F]/20 gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#422006] border-t-transparent rounded-full animate-spin" />
                    Création en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Créer mon compte
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
