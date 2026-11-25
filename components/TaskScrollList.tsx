import React from 'react';
import { ProgressiveBlur } from '@/components/magicui/progressive-blur';

interface TaskScrollListProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function TaskScrollList({ children, className, maxHeight = '65vh' }: TaskScrollListProps) {
  return (
    <div
      className={`relative bg-white dark:bg-[#0B2438] rounded-3xl border border-[#D8E2EC] dark:border-[#94B8D6]/20 shadow-lg overflow-hidden ${className || ''}`}
    >
      <div
        className="divide-y divide-[#D8E2EC] dark:divide-[#94B8D6]/15 overflow-y-auto pb-24 text-[#0B1F30] dark:text-[#F1F5F9]"
        style={{ maxHeight }}
      >
        {children}
      </div>
      <ProgressiveBlur position="bottom" height="28%" intensity={1} className="pointer-events-none" />
    </div>
  );
}
