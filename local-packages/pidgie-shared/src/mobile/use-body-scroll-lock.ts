'use client';

import { useEffect, useRef } from 'react';

export interface BodyScrollLockOptions {
  isLocked: boolean;
  /** Breakpoint in px below which the lock activates (default: 640) */
  mobileBreakpoint?: number;
}

/**
 * Locks body scroll when chat is open on mobile.
 * Saves and restores overflow + scrollY to prevent content shift.
 * Only activates below the mobile breakpoint (default 640px).
 */
export function useBodyScrollLock({
  isLocked,
  mobileBreakpoint = 640,
}: BodyScrollLockOptions): void {
  const savedStyleRef = useRef<{ overflow: string; scrollY: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth < mobileBreakpoint;
    if (!isMobile) return;

    if (isLocked) {
      // Save current state
      savedStyleRef.current = {
        overflow: document.body.style.overflow,
        scrollY: window.scrollY,
      };
      document.body.style.overflow = 'hidden';
    } else if (savedStyleRef.current) {
      // Restore
      document.body.style.overflow = savedStyleRef.current.overflow;
      window.scrollTo(0, savedStyleRef.current.scrollY);
      savedStyleRef.current = null;
    }

    return () => {
      if (savedStyleRef.current) {
        document.body.style.overflow = savedStyleRef.current.overflow;
        savedStyleRef.current = null;
      }
    };
  }, [isLocked, mobileBreakpoint]);
}
