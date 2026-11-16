'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Loader2, LogOut, ShieldCheck } from 'lucide-react';

export interface AuthTransitionCurtainProps {
  mode: 'checking' | 'signing_out';
}

export const AuthTransitionCurtain: React.FC<AuthTransitionCurtainProps> = ({ mode }) => {
  const isSigningOut = mode === 'signing_out';

  return (
    <div
      id={isSigningOut ? 'auth-signout-curtain' : 'auth-checking-curtain'}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#03140E] px-4 text-slate-100 select-none"
    >
      {/* Subtle static ambient radial lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(5,150,105,0.12),transparent_55%)]"
      />

      <motion.div
        initial={isSigningOut ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-[#061A13]/95 p-7 shadow-2xl shadow-emerald-950/80 backdrop-blur-2xl text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-950/60">
          {isSigningOut ? (
            <LogOut className="h-6 w-6 stroke-[2.2]" />
          ) : (
            <CalendarIcon className="h-6 w-6 stroke-[2.2]" />
          )}
        </div>

        <h2 className="text-lg font-extrabold tracking-tight text-white">
          {isSigningOut ? 'Déconnexion en cours...' : 'Vérification de votre session'}
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-emerald-200/80">
          {isSigningOut
            ? 'Clôture sécurisée de votre espace de travail et redirection vers la connexion.'
            : 'Chargement sécurisé de votre environnement mfisca-tasks...'}
        </p>

        <div className="mt-6 flex items-center justify-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/50 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          <span>{isSigningOut ? 'Fermeture de session...' : 'Authentification SSR...'}</span>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>mfisca-tasks • Session chiffrée</span>
        </div>
      </motion.div>
    </div>
  );
};
