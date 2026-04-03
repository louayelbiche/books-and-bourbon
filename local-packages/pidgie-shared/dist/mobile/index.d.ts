import { CSSProperties } from 'react';

interface MobileKeyboardState {
    keyboardHeight: number;
    isKeyboardOpen: boolean;
    viewportHeight: number;
}
/**
 * Detects virtual keyboard via the visualViewport API.
 * SSR-safe — returns zeroed state on the server.
 */
declare function useMobileKeyboard(): MobileKeyboardState;

interface BodyScrollLockOptions {
    isLocked: boolean;
    /** Breakpoint in px below which the lock activates (default: 640) */
    mobileBreakpoint?: number;
}
/**
 * Locks body scroll when chat is open on mobile.
 * Saves and restores overflow + scrollY to prevent content shift.
 * Only activates below the mobile breakpoint (default 640px).
 */
declare function useBodyScrollLock({ isLocked, mobileBreakpoint, }: BodyScrollLockOptions): void;

interface UseMobileChatOptions {
    isOpen: boolean;
    /** Breakpoint in px below which mobile behavior activates (default: 640) */
    mobileBreakpoint?: number;
}
interface UseMobileChatReturn {
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
declare function useMobileChat({ isOpen, mobileBreakpoint, }: UseMobileChatOptions): UseMobileChatReturn;

export { type BodyScrollLockOptions, type MobileKeyboardState, type UseMobileChatOptions, type UseMobileChatReturn, useBodyScrollLock, useMobileChat, useMobileKeyboard };
