'use client';

import { useState, useEffect } from 'react';

export interface MobileKeyboardState {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  viewportHeight: number;
}

/**
 * Detects virtual keyboard via the visualViewport API.
 * SSR-safe — returns zeroed state on the server.
 */
export function useMobileKeyboard(): MobileKeyboardState {
  const [state, setState] = useState<MobileKeyboardState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId: number | null = null;

    function onResize() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const kbHeight = Math.max(0, window.innerHeight - (vv!.height + vv!.offsetTop));
        setState({
          keyboardHeight: kbHeight,
          isKeyboardOpen: kbHeight > 100,
          viewportHeight: vv!.height,
        });
      });
    }

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);

    // Initial measurement
    onResize();

    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return state;
}
