import React from 'react';
import { ProgressiveBlur } from '@/components/magicui/progressive-blur';

interface TaskScrollListProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function TaskScrollList({ children, className, maxHeight = '65vh' }: TaskScrollListProps) {
  return (
    <div className={`relative bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden ${className || ''}`}>
      <div 
        className="divide-y divide-slate-100 overflow-y-auto pb-24"
        style={{ maxHeight }}
      >
        {children}
      </div>
      <ProgressiveBlur position="bottom" height="28%" intensity={1} className="pointer-events-none" />
    </div>
  );
}
