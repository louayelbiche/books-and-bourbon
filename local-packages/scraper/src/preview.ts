/**
 * Site Preview
 *
 * Quick OG tag extraction for preview cards.
 * Extracted from sales-agent-demo scraper.
 */

import * as cheerio from 'cheerio';
import type { SitePreview } from './types.js';
import { BROWSER_HEADERS } from './constants.js';
import {
  getServiceUrl,
  checkServiceHealth,
  previewViaService,
  recordFailure,
} from './client.js';

/**
 * Fetch site preview with smart fallback: Python service -> TS legacy.
 *
 * @param url - URL to fetch preview for (must be a valid, absolute URL)
 * @returns Site preview data
 */
export async function fetchSitePreview(url: string): Promise<SitePreview> {
  const serviceUrl = getServiceUrl();

  if (serviceUrl) {
    const healthy = await checkServiceHealth();
    if (healthy) {
      try {
        const result = await previewViaService(url);
        console.log(`[Scraper] python-service preview for ${url}`);
        return result;
      } catch (err) {
        recordFailure();
        console.warn(
          `[Scraper] WARNING: Python preview failed for ${url}: ${err instanceof Error ? err.message : err}`,
        );
        // Fall through to legacy
      }
    } else {
      console.warn(`[Scraper] WARNING: Python service unhealthy, using ts-fallback preview for ${url}`);
    }
  }

  console.log(`[Scraper] ts-fallback preview for ${url}`);
  return _legacyFetchSitePreview(url);
}

/**
 * Legacy site preview (original TS implementation).
 */
async function _legacyFetchSitePreview(url: string): Promise<SitePreview> {
  const parsed = new URL(url);
  const domain = parsed.hostname;

  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    return { title: null, description: null, favicon: null, ogImage: null, domain };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  return {
    title:
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      null,
    description:
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      null,
    favicon:
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      `${parsed.origin}/favicon.ico`,
    ogImage:
      $('meta[property="og:image"]').attr('content') || null,
    domain,
  };
}
