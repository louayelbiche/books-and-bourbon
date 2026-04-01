/**
 * Stealth Fetch Module
 *
 * Optional impit integration for TLS fingerprint stealth.
 * impit is a Rust-based drop-in fetch() replacement with JA3/JA4 fingerprinting.
 *
 * Install: pnpm add impit (optional peer dependency)
 */

import { createRequire } from 'node:module';
import { REQUEST_TIMEOUT_MS } from './constants.js';

/** Lazy singleton — created on first use, reused across all requests */
let impitInstance: any = null;

async function getImpit() {
  if (impitInstance) return impitInstance;
  try {
    const { Impit } = await import('impit');
    const ignoreTlsErrors = process.env.SCRAPER_IGNORE_TLS_ERRORS === 'true';
    impitInstance = new Impit({ browser: 'chrome', ignoreTlsErrors });
    return impitInstance;
  } catch {
    return null;
  }
}

/**
 * Fetch a page using impit stealth TLS fingerprinting.
 * Same signature as fetchPage() — drop-in swap.
 *
 * @param url - URL to fetch
 * @param throwOnError - If true, throw on errors instead of returning null
 * @returns HTML content or null on failure
 */
export async function fetchPageStealth(
  url: string,
  throwOnError = false,
): Promise<string | null> {
  try {
    const impit = await getImpit();
    if (!impit) {
      throw new Error('impit native module not available');
    }
    const response = await impit.fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[Stealth] Failed to fetch ${url}: ${response.status}`);
      if (response.status === 403) {
        const err = new Error(`Access denied (403): ${url}`);
        (err as Error & { statusCode: number }).statusCode = 403;
        throw err;
      }
      if (throwOnError) {
        throw new Error(
          `HTTP_${response.status}: Server returned ${response.status} for ${url}`,
        );
      }
      return null;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.warn(
        `[Stealth] Skipping non-HTML content at ${url}: ${contentType}`,
      );
      if (throwOnError) {
        throw new Error(
          `NOT_HTML: Server returned ${contentType} instead of HTML for ${url}`,
        );
      }
      return null;
    }

    return await response.text();
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & { statusCode?: number }).statusCode === 403
    ) {
      throw error;
    }
    if (throwOnError) {
      throw error;
    }
    console.warn(`[Stealth] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Check if impit is available at runtime.
 */
export function isImpitAvailable(): boolean {
  try {
    const req = createRequire(import.meta.url);
    req.resolve('impit');
    return true;
  } catch {
    return false;
  }
}
