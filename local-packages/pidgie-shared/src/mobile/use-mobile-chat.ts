'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useMobileKeyboard } from './use-mobile-keyboard.js';
import { useBodyScrollLock } from './use-body-scroll-lock.js';

export interface UseMobileChatOptions {
  isOpen: boolean;
  /** Breakpoint in px below which mobile behavior activates (default: 640) */
  mobileBreakpoint?: number;
}

export interface UseMobileChatReturn {
  isMobile: boolean;
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  /** Apply to the input bar container to offset above the keyboard */
  inputBarStyle: CSSProperties;
}

/**
 * Orchestrating hook for mobile chat UX.
 * Composes keyboard detection + body scroll lock.
 * Returns computed styles for input bar positioning.
 */
export function useMobileChat({
  isOpen,
  mobileBreakpoint = 640,
}: UseMobileChatOptions): UseMobileChatReturn {
  const { keyboardHeight, isKeyboardOpen } = useMobileKeyboard();
  useBodyScrollLock({ isLocked: isOpen, mobileBreakpoint });

  const isMobile =
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false;

  const inputBarStyle = useMemo<CSSProperties>(() => {
    if (isKeyboardOpen && keyboardHeight > 0) {
      return { paddingBottom: keyboardHeight };
    }
    // Don't override paddingBottom when keyboard is closed —
    // the container's padding shorthand already includes safe-area-inset-bottom
    return {};
  }, [isKeyboardOpen, keyboardHeight]);

  return {
    isMobile,
    keyboardHeight,
    isKeyboardOpen,
    inputBarStyle,
  };
}
