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
      className="fixed top-16 sm:top-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-[#061A13]/90 backdrop-blur-xl px-4 py-1.5 text-xs font-bold text-amber-200 shadow-2xl border border-amber-500/40 animate-in slide-in-from-top-2 duration-200"
    >
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <div className="flex items-center gap-1.5 text-[11px]">
        <span>Mode Hors-ligne</span>
        <span className="text-amber-500/60">•</span>
        <span className="text-amber-300 font-bold flex items-center gap-1">
          <Database className="w-3 h-3 text-amber-400" />
          IndexedDB actif
        </span>
      </div>
    </div>
  );
};
