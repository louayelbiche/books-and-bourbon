declare function useResponsiveScreenshot(mobile: string | null, desktop: string | null): string | null;

/**
 * Shared preview hook for 2-tier iframe/screenshot preview pages.
 *
 * Manages:
 * - Tier detection (iframe → screenshot → loading)
 * - Screenshot polling for background captures
 * - Iframe load verification with timeout fallback
 */

type PreviewTier = 'loading' | 'iframe' | 'screenshot';
interface PreviewSession {
    screenshotMobile: string | null;
    screenshotDesktop: string | null;
    allowsIframe?: boolean;
}
interface UsePreviewOptions {
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
interface UsePreviewReturn {
    tier: PreviewTier;
    iframeLoaded: boolean;
    handleIframeLoad: () => void;
    handleIframeError: () => void;
    screenshotUrl: string | null;
}
declare function usePreview(options: UsePreviewOptions): UsePreviewReturn;

export { type PreviewSession, type PreviewTier, type UsePreviewOptions, type UsePreviewReturn, usePreview, useResponsiveScreenshot };
