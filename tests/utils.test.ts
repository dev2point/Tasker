import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility cn (Tailwind & Clsx Merger)', () => {
  it('merges class names seamlessly', () => {
    const result = cn('px-2 py-1', 'bg-blue-500', 'text-white');
    expect(result).toBe('px-2 py-1 bg-blue-500 text-white');
  });

  it('handles conditional class names properly', () => {
    const isActive = true;
    const isError = false;
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isError && 'error-class'
    );
    expect(result).toBe('base-class active-class');
  });

  it('resolves conflicting tailwind classes with precedence to the latter', () => {
    const result = cn('p-2 text-red-500', 'p-4 text-green-500');
    expect(result).toBe('p-4 text-green-500');
  });
});
