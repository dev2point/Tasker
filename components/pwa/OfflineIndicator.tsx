'use client';

import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 left-4 z-40 flex items-center gap-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-slate-700/80 animate-in slide-in-from-bottom-2 duration-200"
    >
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <div className="flex items-center gap-1.5 text-[11px]">
        <span>Mode Hors-ligne</span>
        <span className="text-slate-400">•</span>
        <span className="text-indigo-300 flex items-center gap-1">
          <Database className="w-3 h-3" />
          IndexedDB actif
        </span>
      </div>
    </div>
  );
};
