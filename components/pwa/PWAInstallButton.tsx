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
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone PWA window, don't show
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Desktop PWA flow
  if (isInstallable) {
    return (
      <Button
        id="pwa-install-btn"
        variant={variant}
        size={size}
        onClick={install}
        className={`font-semibold text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 ${className}`}
        title="Installer l'application PlanIt"
      >
        <Download className="w-3.5 h-3.5" />
        {showText && <span>Installer l&apos;application</span>}
      </Button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <Button
          id="pwa-ios-install-btn"
          variant={variant}
          size={size}
          onClick={() => setShowIOSGuide(true)}
          className={`font-semibold text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 ${className}`}
          title="Installer sur iPhone/iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          {showText && <span>Installer sur iOS</span>}
        </Button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 id="ios-install-title" className="font-bold text-sm text-slate-900">
                      Installer sur iPhone / iPad
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Accédez à PlanIt comme une vraie app
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

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">
                      Touchez le bouton <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-indigo-600" />{' '}
                      <strong>Partager</strong> dans Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">
                      Faites défiler et sélectionnez{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-indigo-600" />{' '}
                      <strong>Sur l&apos;écran d&apos;accueil</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSGuide(false)}
                className="w-full font-bold text-xs"
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

  // Fallback if not directly installable yet (gives guidance or manual prompt)
  return (
    <Button
      id="pwa-install-ambient-btn"
      variant={variant}
      size={size}
      onClick={() => setShowIOSGuide(true)}
      className={`font-semibold text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-100 ${className}`}
      title="Installer l'application"
    >
      <Download className="w-3.5 h-3.5 text-indigo-600" />
      {showText && <span>Installer PWA</span>}
    </Button>
  );
};
