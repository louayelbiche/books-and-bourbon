/**
 * Screenshot Module
 *
 * Website screenshot capture using Playwright.
 *
 * @example
 * ```typescript
 * import { captureScreenshots, closeBrowser } from '@runwell/pidgie-core/screenshot';
 *
 * const result = await captureScreenshots({
 *   url: 'https://example.com',
 *   sessionId: 'visitor-123',
 * });
 *
 * console.log(result.mobile);  // /screenshots/visitor-123-mobile.png
 * console.log(result.desktop); // /screenshots/visitor-123-desktop.png
 *
 * // On shutdown
 * await closeBrowser();
 * ```
 */

export {
  captureScreenshots,
  closeBrowser,
  isBrowserConnected,
  configureScreenshot,
} from './screenshot.js';

export type {
  ScreenshotResult,
  ScreenshotOptions,
  Viewport,
  ScreenshotConfig,
} from './types.js';
