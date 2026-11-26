'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';
import {
  parsePublicKeyResponse,
  subscribeCurrentBrowser,
  type SubscribeResult,
} from '@/lib/web-push/client';
import { soundManager } from '@/lib/sound';

type PushUiState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

const MESSAGES: Record<SubscribeResult, { text: string; isError?: boolean }> = {
  subscribed: { text: 'Notifications en temps réel activées avec succès !' },
  'already-subscribed': { text: 'Vos notifications sont déjà actives sur ce navigateur.' },
  denied: {
    text: 'Autorisation refusée par le navigateur. Vous devez autoriser les notifications dans les paramètres de votre navigateur.',
    isError: true,
  },
  unsupported: {
    text: 'Votre navigateur ou environnement ne supporte pas les notifications Push.',
    isError: true,
  },
  failed: {
    text: "Une erreur est survenue lors de l'activation des notifications.",
    isError: true,
  },
};

function getInitialUiState(): PushUiState {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted') return 'subscribed';
  return 'unsubscribed';
}

export const PushNotifications: React.FC = () => {
  const [serverEnabled, setServerEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uiState, setUiState] = useState<PushUiState>(getInitialUiState);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isDismissed, setIsDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      sessionStorage.getItem('planit_push_banner_dismissed') === 'true'
  );

  useEffect(() => {
    let active = true;

    if (getInitialUiState() === 'unsupported') return;

    // Query server capability
    fetch('/api/push/public-key')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: unknown) => {
        const parsed = parsePublicKeyResponse(payload);
        if (active) {
          setServerEnabled(Boolean(parsed?.enabled));
          // If already granted, check subscription registration in worker
          if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready
              .then((reg) => reg.pushManager.getSubscription())
              .then((sub) => {
                if (active) {
                  setUiState(sub ? 'subscribed' : 'unsubscribed');
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (active) setServerEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('planit_push_banner_dismissed', 'true');
    } catch {}
  };

  const handleSubscribe = async () => {
    try {
      soundManager.playClickSound();
    } catch {}

    setBusy(true);
    setFeedback(null);

    try {
      const result = await subscribeCurrentBrowser();
      const feedbackConfig = MESSAGES[result] || MESSAGES.failed;
      setFeedback(feedbackConfig);

      if (result === 'subscribed' || result === 'already-subscribed') {
        setUiState('subscribed');
        try {
          soundManager.playReminderChime();
        } catch {}
      } else if (result === 'denied') {
        setUiState('denied');
      } else if (result === 'unsupported') {
        setUiState('unsupported');
      }
    } catch (err) {
      setFeedback(MESSAGES.failed);
    } finally {
      setBusy(false);
    }
  };

  // Do not display if VAPID is not configured on the backend
  if (!serverEnabled) return null;

  // If already subscribed and no feedback active, we can display a subtle indicator or hide
  if (uiState === 'subscribed' && !feedback) {
    return (
      <div className="fixed bottom-4 left-4 z-40 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-md border border-[#D8E2EC] dark:border-[#94B8D6]/25 text-[#004266] dark:text-[#7CC4EB] text-xs shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <BellRing className="w-3.5 h-3.5 text-[#004266] dark:text-[#7CC4EB]" />
        <span className="font-semibold text-[11px]">Notifications web push actives</span>
      </div>
    );
  }

  // If user dismissed and has no pending action, stay hidden
  if (isDismissed && !feedback) return null;

  return (
    <aside
      aria-label="Configuration des alertes et notifications push"
      className="fixed bottom-4 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] rounded-2xl bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-xl border border-[#D8E2EC] dark:border-[#94B8D6]/25 p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 text-[#0B1F30] dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#004266]/10 dark:bg-[#3895C9]/20 border border-[#004266]/20 dark:border-[#3895C9]/35 flex items-center justify-center shrink-0 text-[#004266] dark:text-[#7CC4EB]">
            {uiState === 'denied' ? (
              <BellOff className="w-4 h-4 text-[#F77F00]" />
            ) : uiState === 'subscribed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <BellRing className="w-4 h-4 text-[#F77F00]" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0B1F30] dark:text-white tracking-wide flex items-center gap-1.5 flex-wrap">
              Notifications &amp; Échéances
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#FFF4E8] dark:bg-[#F77F00]/20 text-[#B45309] dark:text-[#FFB35C] border border-[#F77F00]/30">
                PWA Web Push
              </span>
            </h4>
            <p className="text-[11px] text-[#486075] dark:text-[#9FB3C8] leading-relaxed mt-0.5">
              Recevez des alertes instantanées pour vos dossiers en revue et rappels d’échéances fiscales, même hors ligne.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fermer la bannière"
          className="text-[#486075] dark:text-[#9FB3C8] hover:text-[#0B1F30] dark:hover:text-white p-1 rounded-lg hover:bg-[#EDF2F7] dark:hover:bg-[#103049] transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dynamic Feedback Message */}
      {feedback && (
        <div
          role="status"
          className={`mt-3 p-2 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.isError
              ? 'bg-[#FFF4E8] dark:bg-[#F77F00]/15 border-[#F77F00]/35 text-[#B45309] dark:text-[#FFB35C]'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {feedback.isError ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#F77F00]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="leading-tight">{feedback.text}</span>
        </div>
      )}

      {/* Action CTA */}
      <div className="mt-3.5 pt-3 border-t border-[#D8E2EC] dark:border-[#94B8D6]/18 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#486075] dark:text-[#9FB3C8] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Chiffrement VAPID sécurisé
        </span>

        {uiState === 'denied' ? (
          <span className="text-[11px] text-[#B45309] dark:text-[#FFB35C] font-medium px-2.5 py-1 rounded-lg bg-[#FFF4E8] dark:bg-[#F77F00]/15 border border-[#F77F00]/30">
            Bloqué par le navigateur
          </span>
        ) : uiState === 'subscribed' ? (
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/35 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Activé
          </span>
        ) : (
          <button
            type="button"
            disabled={busy || uiState === 'unsupported'}
            onClick={handleSubscribe}
            className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-[#F77F00] hover:bg-[#DE7200] active:scale-95 transition-all shadow-sm border border-[#F77F00] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Activation...</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-white group-hover:rotate-12 transition-transform" />
                <span>Activer les alertes</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
