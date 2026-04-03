"use client";

// src/preview/index.ts
import { useState as useState2, useEffect as useEffect2, useRef, useCallback } from "react";

// src/preview/use-responsive-screenshot.ts
import { useState, useEffect } from "react";
var MOBILE_BREAKPOINT = 640;
function useResponsiveScreenshot(mobile, desktop) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (isMobile) return mobile || desktop;
  return desktop || mobile;
}

// src/preview/index.ts
function usePreview(options) {
  const {
    sessionApiPath,
    sessionId,
    iframeTimeout = 5e3,
    pollInterval = 2e3,
    maxPolls = 15,
    initialSession
  } = options;
  const [tier, setTier] = useState2("loading");
  const [iframeLoaded, setIframeLoaded] = useState2(false);
  const [screenshots, setScreenshots] = useState2({
    mobile: initialSession?.screenshotMobile ?? null,
    desktop: initialSession?.screenshotDesktop ?? null
  });
  const iframeVerifiedRef = useRef(false);
  const tierTimeoutRef = useRef(null);
  const pollCountRef = useRef(0);
  const pollIntervalRef = useRef(null);
  useEffect2(() => {
    if (!initialSession) return;
    if (initialSession.allowsIframe !== false) {
      setTier("iframe");
    } else if (initialSession.screenshotDesktop || initialSession.screenshotMobile) {
      setTier("screenshot");
    } else {
      startPolling();
    }
  }, [initialSession?.allowsIframe]);
  function startPolling() {
    pollCountRef.current = 0;
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > maxPolls) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setTier("iframe");
        return;
      }
      try {
        const res = await fetch(`${sessionApiPath}?id=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.screenshotDesktop || data.screenshotMobile) {
          setScreenshots({
            desktop: data.screenshotDesktop,
            mobile: data.screenshotMobile
          });
          setTier("screenshot");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch {
      }
    }, pollInterval);
  }
  useEffect2(() => {
    if (tier !== "iframe" || iframeVerifiedRef.current) return;
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
  }, [tier]);
  function fallbackFromIframe() {
    if (iframeVerifiedRef.current) return;
    if (screenshots.desktop || screenshots.mobile) {
      setTier("screenshot");
    } else {
      setTier("loading");
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
  }, [screenshots]);
  useEffect2(() => {
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
    screenshotUrl
  };
}
export {
  usePreview,
  useResponsiveScreenshot
};
//# sourceMappingURL=index.js.map