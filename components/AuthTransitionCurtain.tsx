'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#F4F7FA] dark:bg-[#061826] px-4 text-[#0B1F30] dark:text-slate-100 select-none"
    >
      {/* Subtle static ambient radial lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,66,102,0.08),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(247,127,0,0.07),transparent_55%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(56,149,201,0.14),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(247,127,0,0.10),transparent_55%)]"
      />

      <motion.div
        initial={isSigningOut ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 bg-white/95 dark:bg-[#0B2438]/95 p-7 shadow-2xl shadow-[#004266]/10 dark:shadow-black/60 backdrop-blur-2xl text-center"
      >
        <div className="mx-auto mb-5 flex justify-center">
          {isSigningOut ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F77F00]/30 bg-[#F77F00]/12 text-[#F77F00] shadow-sm">
              <LogOut className="h-6 w-6 stroke-[2.2]" />
            </div>
          ) : (
            <BrandLogo size="lg" />
          )}
        </div>

        <h2 className="text-lg font-extrabold tracking-tight text-[#0B1F30] dark:text-white">
          {isSigningOut ? 'Déconnexion en cours...' : 'Vérification de votre session'}
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-[#486075] dark:text-slate-300">
          {isSigningOut
            ? 'Clôture sécurisée de votre espace de travail et redirection vers la connexion.'
            : 'Chargement sécurisé de votre environnement La Maison de la Fiscalité...'}
        </p>

        <div className="mt-6 flex items-center justify-center gap-2.5 rounded-xl border border-[#D8E2EC] dark:border-[#3895C9]/25 bg-[#EDF2F7] dark:bg-[#103049]/70 px-4 py-2.5 text-xs font-semibold text-[#004266] dark:text-[#7CC4EB]">
          <Loader2 className="h-4 w-4 animate-spin text-[#F77F00]" />
          <span>{isSigningOut ? 'Fermeture de session...' : 'Authentification SSR...'}</span>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#486075] dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-[#004266] dark:text-[#3895C9]" />
          <span>La Maison de la Fiscalité • Session chiffrée</span>
        </div>
      </motion.div>
    </div>
  );
};
