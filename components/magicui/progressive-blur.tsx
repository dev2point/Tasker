import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveBlurProps {
  position?: 'top' | 'bottom' | 'left' | 'right';
  direction?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  blurLevels?: number[];
  intensity?: number;
  height?: string | number;
  width?: string | number;
  layers?: number;
}

export function ProgressiveBlur({
  position = 'bottom',
  direction,
  className,
  blurLevels,
  intensity = 1,
  height,
  width,
  layers = 8,
}: ProgressiveBlurProps) {
  const pos = direction || position;
  const isVertical = pos === 'top' || pos === 'bottom';

  // Generate smooth gradient layers if blurLevels not explicitly provided
  const levels = blurLevels || Array.from({ length: layers }, (_, i) => Math.pow(i + 1, 1.5));

  const getGradient = (index: number, total: number) => {
    const p1 = (index / total) * 100;
    const p2 = ((index + 1) / total) * 100;
    const p3 = ((index + 2) / total) * 100;

    if (pos === 'bottom') {
      return `linear-gradient(to bottom, rgba(0,0,0,0) ${p1}%, rgba(0,0,0,1) ${p2}%, rgba(0,0,0,1) ${p3}%, rgba(0,0,0,0) 100%)`;
    }
    if (pos === 'top') {
      return `linear-gradient(to top, rgba(0,0,0,0) ${p1}%, rgba(0,0,0,1) ${p2}%, rgba(0,0,0,1) ${p3}%, rgba(0,0,0,0) 100%)`;
    }
    if (pos === 'right') {
      return `linear-gradient(to right, rgba(0,0,0,0) ${p1}%, rgba(0,0,0,1) ${p2}%, rgba(0,0,0,1) ${p3}%, rgba(0,0,0,0) 100%)`;
    }
    return `linear-gradient(to left, rgba(0,0,0,0) ${p1}%, rgba(0,0,0,1) ${p2}%, rgba(0,0,0,1) ${p3}%, rgba(0,0,0,1) 100%)`;
  };

  const style: React.CSSProperties = {
    ...(isVertical
      ? { height: height || '30%', width: '100%' }
      : { width: width || '30%', height: '100%' }),
    ...(pos === 'top' && { top: 0, left: 0, right: 0 }),
    ...(pos === 'bottom' && { bottom: 0, left: 0, right: 0 }),
    ...(pos === 'left' && { top: 0, bottom: 0, left: 0 }),
    ...(pos === 'right' && { top: 0, bottom: 0, right: 0 }),
  };

  return (
    <div
      className={cn('pointer-events-none absolute z-20 overflow-hidden', className)}
      style={style}
    >
      {levels.map((blur, index) => (
        <div
          key={index}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blur * intensity}px)`,
            WebkitBackdropFilter: `blur(${blur * intensity}px)`,
            maskImage: getGradient(index, levels.length),
            WebkitMaskImage: getGradient(index, levels.length),
          }}
        />
      ))}
    </div>
  );
}
