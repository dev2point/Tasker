'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Calendar as CalendarIcon,
  X,
  Smartphone,
  Share2,
  PlusSquare,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { soundManager } from '@/lib/sound';

export const PWAFloatingInstallCard: React.FC = () => {
  const {
    isCompatible,
    isInstalled,
    isInstallable,
    isIOS,
    isDesktop,
    platformName,
    install,
  } = usePWAInstall();

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('planit_pwa_card_minimized') === 'true';
    } catch {
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showManualHelp, setShowManualHelp] = useState<boolean>(false);

  const handleMinimize = () => {
    soundManager.playClickSound();
    setIsMinimized(true);
    try {
      sessionStorage.setItem('planit_pwa_card_minimized', 'true');
    } catch {
      // ignore
    }
  };

  const handleExpand = () => {
    soundManager.playClickSound();
    setIsMinimized(false);
    try {
      sessionStorage.removeItem('planit_pwa_card_minimized');
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    soundManager.playClickSound();
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowManualHelp(true);
      }
    } else {
      // Browser supports PWA, but prompt hasn't fired yet or requires address bar
      const success = await install();
      if (!success) {
        setShowManualHelp(true);
      }
    }
  };

  // 1. If already installed in standalone window or locally confirmed -> never show
  if (isInstalled) {
    return null;
  }

  // 2. If browser/OS is not compatible with PWA installation -> do not display
  if (!isCompatible) {
    return null;
  }

  return (
    <>
      <div
        id="pwa-floating-container"
        className="fixed bottom-6 left-5 sm:left-6 z-40 pointer-events-none"
      >
        <AnimatePresence mode="wait">
          {isMinimized ? (
            /* ============================================================ */
            /* MINIMIZED FLOATING PILL BUTTON                               */
            /* ============================================================ */
            <motion.button
              key="minimized-pill"
              type="button"
              id="pwa-reopen-card-btn"
              onClick={handleExpand}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 10 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              title="Installer l'application PlanIt"
              className="pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-lg shadow-slate-900/10 text-slate-800 hover:text-[#59240A] hover:border-[#F7C59F] transition-all group"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] flex items-center justify-center font-bold shadow-xs">
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="flex items-center gap-1.5 pr-1">
                <span className="text-xs font-bold whitespace-nowrap">
                  Installer l&apos;application
                </span>
                <span className="w-2 h-2 rounded-full bg-[#BA5316] animate-pulse" />
              </div>
            </motion.button>
          ) : (
            /* ============================================================ */
            /* EXPANDED INVITATION FLOATING CARD                            */
            /* ============================================================ */
            <motion.div
              key="expanded-card"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="pointer-events-auto w-[calc(100vw-2.5rem)] max-w-[320px] sm:max-w-[340px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/12 p-3.5 sm:p-4 text-slate-800 relative overflow-hidden"
            >
              {/* Subtle Warm Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F7C59F] via-[#EE8D4B] to-[#BA5316]" />

              {/* Card Header */}
              <div className="flex items-start justify-between gap-2.5 pt-0.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F7C59F] to-[#EE8D4B] text-[#422006] flex items-center justify-center font-bold shadow-xs shrink-0">
                    <CalendarIcon className="w-4.5 h-4.5 stroke-[2.3]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        PlanIt
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F7C59F]/30 text-[#59240A]">
                        {isDesktop ? `App ${platformName}` : 'Application'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Version installable disponible
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMinimize}
                  aria-label="Réduire l'invitation"
                  title="Réduire"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Card Body Message */}
              <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                {isDesktop ? (
                  <>
                    Installez PlanIt sur votre <strong>{platformName}</strong> pour un accès direct depuis le bureau, en plein écran et avec alertes garanties hors-ligne.
                  </>
                ) : (
                  <>
                    Ajoutez PlanIt à votre écran d&apos;accueil pour profiter d&apos;une expérience plein écran rapide et sans barre de navigation.
                  </>
                )}
              </p>

              {/* Feature Highlights Pills */}
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  <Zap className="w-2.5 h-2.5 text-[#BA5316]" />
                  Accès instantané
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  Mode hors-ligne
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  id="pwa-floating-install-action"
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#BA5316] hover:bg-[#933F15] active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
                >
                  {isIOS ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Installer sur iOS</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                      <span>
                        {isDesktop ? `Installer sur ${platformName}` : 'Installer l\'application'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleMinimize}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* IOS SAFARI STEP-BY-STEP MODAL                                */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#F7C59F]/30 text-[#BA5316] flex items-center justify-center font-bold">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Installer sur iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ajouter à l&apos;écran d&apos;accueil
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#F7C59F]/40 text-[#59240A] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-medium">
                      Dans Safari, touchez le bouton{' '}
                      <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-[#BA5316]" />{' '}
                      <strong>Partager</strong> en bas de l&apos;écran.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#F7C59F]/40 text-[#59240A] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-medium">
                      Faites défiler vers le bas et sélectionnez{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#BA5316]" />{' '}
                      <strong>Sur l&apos;écran d&apos;accueil</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-[#F7C59F]/40 text-[#59240A] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-medium">
                      Touchez <strong>Ajouter</strong> en haut à droite pour finaliser.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-[#BA5316] text-white font-bold text-xs hover:bg-[#933F15] transition-colors"
              >
                Compris
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* DESKTOP BROWSER MANUAL TIP (if prompt not yet auto-triggered) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showManualHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Installation dans le navigateur
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Barre d&apos;adresse {platformName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualHelp(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <p>
                  Pour installer PlanIt, cliquez sur l&apos;icône d&apos;installation{' '}
                  <Download className="w-3.5 h-3.5 inline mx-0.5 text-[#BA5316]" />{' '}
                  située à l&apos;extrémité droite de la barre d&apos;adresse de votre navigateur (Chrome, Edge ou Brave).
                </p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                  💡 <strong>Astuce :</strong> Vous pouvez également ouvrir le menu du navigateur (⋮ ou ⋯) et choisir <em>« Installer PlanIt »</em>.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManualHelp(false)}
                className="w-full py-2 rounded-xl bg-[#BA5316] text-white font-bold text-xs hover:bg-[#933F15] transition-colors"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
