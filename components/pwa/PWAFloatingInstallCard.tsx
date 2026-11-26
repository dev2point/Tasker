'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  X,
  Smartphone,
  Share2,
  PlusSquare,
  Info,
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { soundManager } from '@/lib/sound';

const cardStorageListeners = new Set<() => void>();

function notifyCardStorage() {
  cardStorageListeners.forEach((cb) => cb());
}

function subscribeCardStorage(cb: () => void) {
  cardStorageListeners.add(cb);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', cb);
  }
  return () => {
    cardStorageListeners.delete(cb);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', cb);
    }
  };
}

function getDismissedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('planit_pwa_dismissed') === 'true';
  } catch {
    return false;
  }
}

export const PWAFloatingInstallCard: React.FC = () => {
  const {
    isCompatible,
    isInstalled,
    isIOS,
    platformName,
    promptInstall,
  } = usePWAInstall();

  const isDismissed = useSyncExternalStore(
    subscribeCardStorage,
    getDismissedSnapshot,
    () => false
  );

  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showManualHelp, setShowManualHelp] = useState<boolean>(false);

  useEffect(() => {
    const handleManualRequest = () => {
      if (isIOS) {
        setShowIOSGuide(true);
      } else {
        setShowManualHelp(true);
      }
    };

    window.addEventListener('planit:pwa-manual-install', handleManualRequest);
    return () => {
      window.removeEventListener('planit:pwa-manual-install', handleManualRequest);
    };
  }, [isIOS]);

  const handleDismissPermanently = () => {
    soundManager.playClickSound();
    try {
      localStorage.setItem('planit_pwa_dismissed', 'true');
    } catch {
      // ignore
    }
    notifyCardStorage();
  };

  const handleInstallClick = async () => {
    soundManager.playClickSound();
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    const outcome = await promptInstall();
    if (outcome === 'unavailable') {
      setShowManualHelp(true);
    }
  };

  if (isInstalled || !isCompatible) {
    return null;
  }

  return (
    <>
      {!isDismissed && (
        <div
          id="pwa-floating-container"
          className="fixed bottom-22 left-4 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:left-6 md:left-auto md:right-8 md:bottom-8 z-40 pointer-events-none flex flex-col items-start md:items-end"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            className="pointer-events-auto flex items-center rounded-full bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 shadow-xl hover:border-[#004266]/45 dark:hover:border-[#3895C9]/50 transition-all"
          >
            <button
              type="button"
              id="pwa-reopen-card-btn"
              onClick={handleInstallClick}
              title="Installer l'application PlanIt"
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 text-[#0B1F30] dark:text-slate-200 hover:text-[#004266] dark:hover:text-white cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] flex items-center justify-center">
                <Download className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span className="text-xs font-semibold whitespace-nowrap text-[#004266] dark:text-[#7CC4EB]">
                Installer l&apos;App
              </span>
            </button>
            <button
              type="button"
              onClick={handleDismissPermanently}
              aria-label="Masquer le bouton d'installation"
              title="Masquer"
              className="pr-2.5 pl-1 py-1.5 text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IOS SAFARI STEP-BY-STEP MODAL (Fallback when no native prompt) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B2438] backdrop-blur-2xl p-5 shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#0B1F30] dark:text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 flex items-center justify-center font-bold">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0B1F30] dark:text-white">
                      Installer sur iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                      Ajouter à l&apos;écran d&apos;accueil
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fermer"
                  className="p-1 rounded-lg text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#486075] dark:text-slate-200">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826] border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                  <span className="w-5 h-5 rounded-full bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-[#0B1F30] dark:text-slate-200">
                      Dans Safari, touchez le bouton{' '}
                      <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-[#004266] dark:text-[#7CC4EB]" />{' '}
                      <strong className="text-[#0B1F30] dark:text-white">Partager</strong> en bas de l&apos;écran.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826] border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                  <span className="w-5 h-5 rounded-full bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-[#0B1F30] dark:text-slate-200">
                      Faites défiler vers le bas et sélectionnez{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#004266] dark:text-[#7CC4EB]" />{' '}
                      <strong className="text-[#0B1F30] dark:text-white">Sur l&apos;écran d&apos;accueil</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826] border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                  <span className="w-5 h-5 rounded-full bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-[#0B1F30] dark:text-slate-200">
                      Touchez <strong className="text-[#0B1F30] dark:text-white">Ajouter</strong> en haut à droite pour finaliser.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-[#F77F00] hover:bg-[#DE7200] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Compris
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* DESKTOP BROWSER MANUAL TIP (Fallback if prompt unavailable)  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showManualHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B2438] backdrop-blur-2xl p-5 shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#0B1F30] dark:text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 flex items-center justify-center font-bold">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0B1F30] dark:text-white">
                      Installation dans le navigateur
                    </h3>
                    <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8]">
                      Barre d&apos;adresse {platformName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualHelp(false)}
                  aria-label="Fermer"
                  className="p-1 rounded-lg text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-[#486075] dark:text-slate-200 leading-relaxed">
                <p>
                  Pour installer PlanIt, cliquez sur l&apos;icône d&apos;installation{' '}
                  <Download className="w-3.5 h-3.5 inline mx-0.5 text-[#004266] dark:text-[#7CC4EB]" />{' '}
                  située à l&apos;extrémité droite de la barre d&apos;adresse de votre navigateur (Chrome, Edge ou Brave).
                </p>
                <div className="p-3 rounded-xl bg-[#FFF4E8] dark:bg-[#F77F00]/15 border border-[#F77F00]/30 text-[11px] text-[#B45309] dark:text-[#FFB35C]">
                  <strong className="text-[#0B1F30] dark:text-white">Astuce :</strong> Vous pouvez également ouvrir le menu du navigateur (⋮ ou ⋯) et choisir <em>« Installer PlanIt »</em>.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManualHelp(false)}
                className="w-full py-2 rounded-xl bg-[#004266] hover:bg-[#00314D] dark:bg-[#3895C9] dark:hover:bg-[#50A9DA] text-white dark:text-[#061826] font-bold text-xs transition-colors cursor-pointer"
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
