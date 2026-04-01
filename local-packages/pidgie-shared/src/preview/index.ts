/**
 * Shared preview hook for 2-tier iframe/screenshot preview pages.
 *
 * Manages:
 * - Tier detection (iframe → screenshot → loading)
 * - Screenshot polling for background captures
 * - Iframe load verification with timeout fallback
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export { useResponsiveScreenshot } from './use-responsive-screenshot';
import { useResponsiveScreenshot } from './use-responsive-screenshot';

export type PreviewTier = 'loading' | 'iframe' | 'screenshot';

export interface PreviewSession {
  screenshotMobile: string | null;
  screenshotDesktop: string | null;
  allowsIframe?: boolean;
}

export interface UsePreviewOptions {
  /** Session API endpoint to poll */
  sessionApiPath: string;
  /** Session ID */
  sessionId: string;
  /** Iframe verification timeout in ms (default: 5000) */
  iframeTimeout?: number;
  /** Screenshot poll interval in ms (default: 2000) */
  pollInterval?: number;
  /** Max screenshot poll attempts (default: 15) */
  maxPolls?: number;
  /** Initial session data (avoids extra fetch if already loaded) */
  initialSession?: PreviewSession;
}

export interface UsePreviewReturn {
  tier: PreviewTier;
  iframeLoaded: boolean;
  handleIframeLoad: () => void;
  handleIframeError: () => void;
  screenshotUrl: string | null;
}

export function usePreview(options: UsePreviewOptions): UsePreviewReturn {
  const {
    sessionApiPath,
    sessionId,
    iframeTimeout = 5000,
    pollInterval = 2000,
    maxPolls = 15,
    initialSession,
  } = options;

  const [tier, setTier] = useState<PreviewTier>('loading');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [screenshots, setScreenshots] = useState<{
    mobile: string | null;
    desktop: string | null;
  }>({
    mobile: initialSession?.screenshotMobile ?? null,
    desktop: initialSession?.screenshotDesktop ?? null,
  });

  const iframeVerifiedRef = useRef(false);
  const tierTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine initial tier from session data
  useEffect(() => {
    if (!initialSession) return;

    if (initialSession.allowsIframe !== false) {
      setTier('iframe');
    } else if (initialSession.screenshotDesktop || initialSession.screenshotMobile) {
      setTier('screenshot');
    } else {
      // No iframe, no screenshots yet — poll
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSession?.allowsIframe]);

  // Screenshot polling
  function startPolling() {
    pollCountRef.current = 0;
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > maxPolls) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        // Last resort: try iframe
        setTier('iframe');
        return;
      }

      try {
        const res = await fetch(`${sessionApiPath}?id=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.screenshotDesktop || data.screenshotMobile) {
          setScreenshots({
            desktop: data.screenshotDesktop,
            mobile: data.screenshotMobile,
          });
          setTier('screenshot');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch {
        // Ignore polling errors
      }
    }, pollInterval);
  }

  // Iframe timeout fallback
  useEffect(() => {
    if (tier !== 'iframe' || iframeVerifiedRef.current) return;

    tierTimeoutRef.current = setTimeout(() => {
      if (!iframeVerifiedRef.current) {
        fallbackFromIframe();
      }
    }, iframeTimeout);

    return () => {
      if (tierTimeoutRef.current) {
        clearTimeout(tierTimeoutRef.current);
        tierTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  function fallbackFromIframe() {
    if (iframeVerifiedRef.current) return;
    if (screenshots.desktop || screenshots.mobile) {
      setTier('screenshot');
    } else {
      setTier('loading');
      startPolling();
    }
  }

  const handleIframeLoad = useCallback(() => {
    iframeVerifiedRef.current = true;
    if (tierTimeoutRef.current) {
      clearTimeout(tierTimeoutRef.current);
      tierTimeoutRef.current = null;
    }
    setIframeLoaded(true);
  }, []);

  const handleIframeError = useCallback(() => {
    if (iframeVerifiedRef.current) return;
    fallbackFromIframe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (tierTimeoutRef.current) clearTimeout(tierTimeoutRef.current);
    };
  }, []);

  const screenshotUrl = useResponsiveScreenshot(screenshots.mobile, screenshots.desktop);

  return {
    tier,
    iframeLoaded,
    handleIframeLoad,
    handleIframeError,
    screenshotUrl,
  };
}
