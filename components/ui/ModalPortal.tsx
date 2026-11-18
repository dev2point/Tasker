'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

let activeModalPortalCount = 0;
let previousBodyOverflow: string | null = null;

interface ModalPortalProps {
  children: React.ReactNode;
  /** Locks document body scrolling while mounted (default: true). */
  lockScroll?: boolean;
}

/**
 * Mounts modal overlays directly under document.body so they sit cleanly above
 * the sidebar, mobile header, and any parent layout stacking contexts.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({
  children,
  lockScroll = true,
}) => {
  const isClient = useIsClient();

  useEffect(() => {
    if (!isClient || !lockScroll) return;

    if (activeModalPortalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeModalPortalCount += 1;

    return () => {
      activeModalPortalCount = Math.max(0, activeModalPortalCount - 1);
      if (activeModalPortalCount === 0) {
        document.body.style.overflow = previousBodyOverflow ?? '';
        previousBodyOverflow = null;
      }
    };
  }, [isClient, lockScroll]);

  if (!isClient || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
};
