'use client';

import { useEffect, useState } from 'react';
import {
  parsePublicKeyResponse,
  subscribeCurrentBrowser,
  type SubscribeResult,
} from '@/lib/web-push/client';

const LABELS: Record<SubscribeResult, string> = {
  subscribed: 'Notifications activées',
  'already-subscribed': 'Notifications déjà activées',
  denied: 'Notifications refusées par le navigateur',
  unsupported: 'Notifications non supportées',
  failed: "L'activation a échoué",
};

export const PushNotifications: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/push/public-key')
      .then((response) => response.json())
      .then((payload: unknown) => {
        const parsed = parsePublicKeyResponse(payload);
        if (active) setEnabled(Boolean(parsed?.enabled));
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        disabled={busy}
        className="rounded-md border px-2 py-1 disabled:opacity-60"
        onClick={() => {
          setBusy(true);
          subscribeCurrentBrowser()
            .then((result) => setStatus(LABELS[result]))
            .catch(() => setStatus(LABELS.failed))
            .finally(() => setBusy(false));
        }}
      >
        Activer les notifications
      </button>
      {status ? <span aria-live="polite">{status}</span> : null}
    </div>
  );
};
