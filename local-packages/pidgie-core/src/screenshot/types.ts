/**
 * Screenshot Types
 *
 * Type definitions for website screenshot capture.
 */

/**
 * Result of capturing screenshots.
 */
export interface ScreenshotResult {
  /** Path to mobile screenshot or null if failed */
  mobile: string | null;
  /** Path to desktop screenshot or null if failed */
  desktop: string | null;
}

/**
 * Options for capturing screenshots.
 */
export interface ScreenshotOptions {
  /** URL to capture */
  url: string;
  /** Session ID for file naming */
  sessionId: string;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Directory to save screenshots (default: process.cwd()/public/screenshots) */
  outputDir?: string;
  /** URL prefix for returned paths (default: /screenshots) */
  urlPrefix?: string;
}

/**
 * Viewport dimensions.
 */
export interface Viewport {
  width: number;
  height: number;
}

/**
 * Screenshot module configuration.
 */
export interface ScreenshotConfig {
  /** Mobile viewport (default: 390x844 - iPhone 14) */
  mobileViewport?: Viewport;
  /** Desktop viewport (default: 1280x800) */
  desktopViewport?: Viewport;
  /** Default output directory */
  defaultOutputDir?: string;
  /** Default URL prefix */
  defaultUrlPrefix?: string;
  /** Default timeout in ms */
  defaultTimeout?: number;
}
