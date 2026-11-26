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
      className="fixed top-16 sm:top-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full bg-white/95 dark:bg-[#0B2438]/95 backdrop-blur-xl px-4 py-1.5 text-xs font-bold text-[#B85A00] dark:text-[#FFB35C] shadow-xl border border-[#F77F00]/45 animate-in slide-in-from-top-2 duration-200"
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-[#F77F00]" />
      <WifiOff className="w-3.5 h-3.5 text-[#F77F00] shrink-0" />
      <div className="flex items-center gap-1.5 text-[11px]">
        <span>Mode Hors-ligne</span>
        <span className="text-[#F77F00]/60">•</span>
        <span className="text-[#004266] dark:text-[#7CC4EB] font-bold flex items-center gap-1">
          <Database className="w-3 h-3 text-[#004266] dark:text-[#7CC4EB]" />
          IndexedDB actif
        </span>
      </div>
    </div>
  );
};
