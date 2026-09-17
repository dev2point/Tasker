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
  const { isInstallable, isInstalled, isIOS, isCompatible, install } = usePWAInstall();
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
        className={`font-semibold text-xs gap-1.5 border-emerald-500/40 text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/35 hover:text-white backdrop-blur-md cursor-pointer ${className}`}
        title="Installer l'application PlanIt"
      >
        <Download className="w-3.5 h-3.5 text-emerald-300" />
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
          className={`font-semibold text-xs gap-1.5 border-emerald-500/40 text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/35 hover:text-white backdrop-blur-md cursor-pointer ${className}`}
          title="Installer sur iPhone/iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
          {showText && <span>Installer sur iOS</span>}
        </Button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-[#061A13]/95 backdrop-blur-2xl p-5 shadow-2xl border border-emerald-500/30 text-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 id="ios-install-title" className="font-bold text-sm text-white">
                      Installer sur iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-emerald-300/80 font-medium">
                      Accédez à PlanIt comme une vraie app
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-500/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/20">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">
                      Touchez le bouton <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />{' '}
                      <strong className="text-white">Partager</strong> dans Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/20">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-slate-100">
                      Faites défiler et sélectionnez{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />{' '}
                      <strong className="text-white">Sur l&apos;écran d&apos;accueil</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSGuide(false)}
                className="w-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
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
      onClick={() => setShowIOSGuide(true)}
      className={`font-semibold text-xs gap-1.5 border-emerald-500/40 text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/35 hover:text-white backdrop-blur-md cursor-pointer ${className}`}
      title="Installer l'application"
    >
      <Download className="w-3.5 h-3.5 text-emerald-300" />
      {showText && <span>Installer PWA</span>}
    </Button>
  );
};
