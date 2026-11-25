'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/ThemeProvider';

export interface BrandLogoProps {
  variant?: 'auto' | 'normal' | 'white' | 'white-on-blue' | 'black';
  compact?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'auto',
  compact = false,
  className = '',
  size = 'md',
}) => {
  const { isDark } = useTheme();

  if (compact) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-[#004266] text-white border border-[#004266]/20 dark:border-[#2D82B5]/40 shadow-sm shrink-0 select-none ${
          size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9'
        } ${className}`}
        aria-label="La Maison de la Fiscalité"
      >
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] font-black tracking-tight text-white">LM</span>
          <span className="h-[2px] w-4 rounded-full bg-[#F77F00] mt-0.5" />
        </div>
      </div>
    );
  }

  let src = '/logos/logo-normal-512.png';
  if (variant === 'white') {
    src = '/logos/logo-blanc-512.png';
  } else if (variant === 'white-on-blue') {
    src = '/logos/logo-blanc-fond-bleu-512.png';
  } else if (variant === 'black') {
    src = '/logos/logo-noir-512.png';
  } else if (variant === 'auto') {
    src = isDark ? '/logos/logo-blanc-512.png' : '/logos/logo-normal-512.png';
  }

  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';

  return (
    <div className={`inline-flex items-center shrink-0 select-none ${className}`}>
      <Image
        src={src}
        alt="La Maison de la Fiscalité"
        width={512}
        height={188}
        priority
        referrerPolicy="no-referrer"
        className={`${heightClass} w-auto object-contain`}
      />
    </div>
  );
};
