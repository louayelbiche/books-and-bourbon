/**
 * Screenshot Capture
 *
 * Captures website screenshots using Patchright (stealth Playwright fork).
 */

import type { Browser } from 'patchright';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type {
  ScreenshotResult,
  ScreenshotOptions,
  Viewport,
  ScreenshotConfig,
} from './types.js';
import { isBlockedUrl } from '../security/ssrf.js';

// Lazy-load patchright to avoid forcing webpack resolution for all consumers
let patchrightModule: typeof import('patchright') | null = null;

async function getChromium() {
  if (!patchrightModule) {
    try {
      patchrightModule = await import('patchright');
    } catch {
      return null;
    }
  }
  return patchrightModule.chromium;
}

// Default viewports
const DEFAULT_MOBILE_VIEWPORT: Viewport = { width: 390, height: 844 }; // iPhone 14
const DEFAULT_DESKTOP_VIEWPORT: Viewport = { width: 1280, height: 800 };

// Default configuration
const DEFAULT_CONFIG: Required<ScreenshotConfig> = {
  mobileViewport: DEFAULT_MOBILE_VIEWPORT,
  desktopViewport: DEFAULT_DESKTOP_VIEWPORT,
  defaultOutputDir: path.join(process.cwd(), 'public', 'screenshots'),
  defaultUrlPrefix: '/screenshots',
  defaultTimeout: 10000,
};

// Module state
let browserInstance: Browser | null = null;
let moduleConfig: Required<ScreenshotConfig> = { ...DEFAULT_CONFIG };

/**
 * Configure the screenshot module.
 *
 * @param config - Configuration options
 */
export function configureScreenshot(config: ScreenshotConfig): void {
  moduleConfig = { ...DEFAULT_CONFIG, ...config };
}

/**
 * Get or create a browser instance.
 *
 * @returns Browser instance or null if patchright is unavailable
 */
async function getBrowser(): Promise<Browser | null> {
  if (!browserInstance || !browserInstance.isConnected()) {
    const chromium = await getChromium();
    if (!chromium) {
      console.warn('[screenshot] Playwright is not available; screenshot capture disabled');
      return null;
    }
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

/**
 * Ensure the screenshots directory exists.
 *
 * @param dir - Directory path
 */
async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Capture a single viewport screenshot.
 *
 * @param url - URL to capture
 * @param viewport - Viewport dimensions
 * @param outputPath - Output file path
 * @param timeout - Timeout in ms
 * @returns True if successful
 */
async function captureViewport(
  url: string,
  viewport: Viewport,
  outputPath: string,
  timeout: number
): Promise<boolean> {
  // Defense-in-depth: block private/internal URLs even if caller forgot
  if (isBlockedUrl(url)) {
    console.warn('[screenshot] Blocked SSRF attempt:', url);
    return false;
  }

  const browser = await getBrowser();
  if (!browser) return false;
  const context = await browser.newContext({
    viewport,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    // Use domcontentloaded for speed, then wait for rendering
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // Wait for content to render
    await page.waitForTimeout(2000);

    // Take screenshot
    const buffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    await writeFile(outputPath, buffer);
    return true;
  } catch (error) {
    console.error(`[Screenshot] Failed to capture ${url}:`, error);
    return false;
  } finally {
    await context.close();
  }
}

/**
 * Capture mobile and desktop screenshots of a URL.
 *
 * @param options - Screenshot options
 * @returns Screenshot result with paths
 *
 * @example
 * ```typescript
 * const result = await captureScreenshots({
 *   url: 'https://example.com',
 *   sessionId: 'abc123',
 * });
 *
 * console.log(result.mobile);  // /screenshots/abc123-mobile.png
 * console.log(result.desktop); // /screenshots/abc123-desktop.png
 * ```
 */
export async function captureScreenshots(
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  const {
    url,
    sessionId: rawSessionId,
    timeout = moduleConfig.defaultTimeout,
    outputDir = moduleConfig.defaultOutputDir,
    urlPrefix = moduleConfig.defaultUrlPrefix,
  } = options;

  // Sanitize sessionId to prevent path traversal
  const sessionId = path.basename(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sessionId) {
    console.error('[Screenshot] Invalid sessionId after sanitization');
    return { mobile: null, desktop: null };
  }

  const result: ScreenshotResult = {
    mobile: null,
    desktop: null,
  };

  try {
    await ensureDir(outputDir);

    const mobilePath = path.join(outputDir, `${sessionId}-mobile.png`);
    const desktopPath = path.join(outputDir, `${sessionId}-desktop.png`);

    // Capture both viewports in parallel
    const [mobileSuccess, desktopSuccess] = await Promise.all([
      captureViewport(url, moduleConfig.mobileViewport, mobilePath, timeout),
      captureViewport(url, moduleConfig.desktopViewport, desktopPath, timeout),
    ]);

    if (mobileSuccess) {
      result.mobile = `${urlPrefix}/${sessionId}-mobile.png`;
    }

    if (desktopSuccess) {
      result.desktop = `${urlPrefix}/${sessionId}-desktop.png`;
    }

    console.log(
      `[Screenshot] Captured for ${url}: mobile=${mobileSuccess}, desktop=${desktopSuccess}`
    );
  } catch (error) {
    console.error(`[Screenshot] Error capturing screenshots for ${url}:`, error);
  }

  return result;
}

/**
 * Close the browser instance.
 *
 * Call this for graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Check if browser is connected.
 *
 * @returns True if browser is active
 */
export function isBrowserConnected(): boolean {
  return browserInstance !== null && browserInstance.isConnected();
}
