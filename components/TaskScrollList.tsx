import React from 'react';
import { ProgressiveBlur } from '@/components/magicui/progressive-blur';

interface TaskScrollListProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function TaskScrollList({ children, className, maxHeight = '65vh' }: TaskScrollListProps) {
  return (
    <div className={`relative bg-[#061A13]/85 backdrop-blur-2xl rounded-3xl border border-emerald-500/20 shadow-2xl overflow-hidden ${className || ''}`}>
      <div 
        className="divide-y divide-emerald-500/10 overflow-y-auto pb-24 text-slate-100"
        style={{ maxHeight }}
      >
        {children}
      </div>
      <ProgressiveBlur position="bottom" height="28%" intensity={1} className="pointer-events-none" />
    </div>
  );
}
