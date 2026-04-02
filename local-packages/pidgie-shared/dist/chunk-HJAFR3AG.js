// src/mobile/use-mobile-keyboard.ts
import { useState, useEffect } from "react";
function useMobileKeyboard() {
  const [state, setState] = useState({
    keyboardHeight: 0,
    isKeyboardOpen: false,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0
  });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let rafId = null;
    function onResize() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const kbHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
        setState({
          keyboardHeight: kbHeight,
          isKeyboardOpen: kbHeight > 100,
          viewportHeight: vv.height
        });
      });
    }
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
  return state;
}

// src/mobile/use-body-scroll-lock.ts
import { useEffect as useEffect2, useRef } from "react";
function useBodyScrollLock({
  isLocked,
  mobileBreakpoint = 640
}) {
  const savedStyleRef = useRef(null);
  useEffect2(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < mobileBreakpoint;
    if (!isMobile) return;
    if (isLocked) {
      savedStyleRef.current = {
        overflow: document.body.style.overflow,
        scrollY: window.scrollY
      };
      document.body.style.overflow = "hidden";
    } else if (savedStyleRef.current) {
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

// src/mobile/use-mobile-chat.ts
import { useMemo } from "react";
function useMobileChat({
  isOpen,
  mobileBreakpoint = 640
}) {
  const { keyboardHeight, isKeyboardOpen } = useMobileKeyboard();
  useBodyScrollLock({ isLocked: isOpen, mobileBreakpoint });
  const isMobile = typeof window !== "undefined" ? window.innerWidth < mobileBreakpoint : false;
  const inputBarStyle = useMemo(() => {
    if (isKeyboardOpen && keyboardHeight > 0) {
      return { paddingBottom: keyboardHeight };
    }
    return {};
  }, [isKeyboardOpen, keyboardHeight]);
  return {
    isMobile,
    keyboardHeight,
    isKeyboardOpen,
    inputBarStyle
  };
}

export {
  useMobileKeyboard,
  useBodyScrollLock,
  useMobileChat
};
//# sourceMappingURL=chunk-HJAFR3AG.js.map