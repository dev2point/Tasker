'use client';

import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { Button } from '@/components/ui/button';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs' | 'icon-sm';
  showText?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'outline',
  size = 'sm',
  showText = true,
}) => {
  const { isInstallable, isInstalled, isIOS, isCompatible, install, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || !isCompatible) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        id="pwa-install-btn"
        variant={variant}
        size={size}
        onClick={install}
        className={`font-semibold text-xs gap-1.5 border-[#004266]/25 dark:border-[#3895C9]/40 text-[#004266] dark:text-[#7CC4EB] bg-[#004266]/10 dark:bg-[#3895C9]/20 hover:bg-[#004266] hover:text-white dark:hover:bg-[#3895C9] dark:hover:text-[#061826] backdrop-blur-md cursor-pointer ${className}`}
        title="Installer l'application PlanIt"
      >
        <Download className="w-3.5 h-3.5" />
        {showText && <span>Installer l&apos;application</span>}
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          id="pwa-ios-install-btn"
          variant={variant}
          size={size}
          onClick={() => setShowIOSGuide(true)}
          className={`font-semibold text-xs gap-1.5 border-[#004266]/25 dark:border-[#3895C9]/40 text-[#004266] dark:text-[#7CC4EB] bg-[#004266]/10 dark:bg-[#3895C9]/20 hover:bg-[#004266] hover:text-white dark:hover:bg-[#3895C9] dark:hover:text-[#061826] backdrop-blur-md cursor-pointer ${className}`}
          title="Installer sur iPhone/iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          {showText && <span>Installer sur iOS</span>}
        </Button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#061826]/45 dark:bg-[#04101A]/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B2438] backdrop-blur-2xl p-5 shadow-2xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#0B1F30] dark:text-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#D8E2EC] dark:border-[#94B8D6]/18 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 flex items-center justify-center">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 id="ios-install-title" className="font-bold text-sm text-[#0B1F30] dark:text-white">
                      Installer sur iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8] font-medium">
                      Accédez à PlanIt comme une vraie app
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
                    <p className="font-medium text-[#0B1F30] dark:text-slate-100">
                      Touchez le bouton <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-[#004266] dark:text-[#7CC4EB]" />{' '}
                      <strong className="text-[#0B1F30] dark:text-white">Partager</strong> dans Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F4F7FA] dark:bg-[#061826] border border-[#D8E2EC] dark:border-[#94B8D6]/20">
                  <span className="w-5 h-5 rounded-full bg-[#004266]/10 dark:bg-[#3895C9]/20 text-[#004266] dark:text-[#7CC4EB] border border-[#004266]/20 dark:border-[#3895C9]/35 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-[#0B1F30] dark:text-slate-100">
                      Faites défiler et sélectionnez{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#004266] dark:text-[#7CC4EB]" />{' '}
                      <strong className="text-[#0B1F30] dark:text-white">Sur l&apos;écran d&apos;accueil</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSGuide(false)}
                variant="accent"
                className="w-full font-bold text-xs cursor-pointer"
                size="sm"
              >
                Compris
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <Button
      id="pwa-install-ambient-btn"
      variant={variant}
      size={size}
      onClick={async () => {
        const outcome = await promptInstall();
        if (outcome === 'unavailable') {
          window.dispatchEvent(new CustomEvent('planit:pwa-manual-install'));
        }
      }}
      className={`font-semibold text-xs gap-1.5 border-[#004266]/25 dark:border-[#3895C9]/40 text-[#004266] dark:text-[#7CC4EB] bg-[#004266]/10 dark:bg-[#3895C9]/20 hover:bg-[#004266] hover:text-white dark:hover:bg-[#3895C9] dark:hover:text-[#061826] backdrop-blur-md cursor-pointer ${className}`}
      title="Installer l'application"
    >
      <Download className="w-3.5 h-3.5" />
      {showText && <span>Installer PWA</span>}
    </Button>
  );
};
