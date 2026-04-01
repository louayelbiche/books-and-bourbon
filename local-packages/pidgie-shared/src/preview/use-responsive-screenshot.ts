'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 640; // matches existing sm: breakpoint

export function useResponsiveScreenshot(
  mobile: string | null,
  desktop: string | null
): string | null {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) return mobile || desktop;
  return desktop || mobile;
}
