/**
 * High-level Cloudflare /crawl orchestrator.
 *
 * One-call interface: validates the URL, checks cache, creates a job,
 * polls until done, paginates all results, caches the result, tracks
 * cost, and updates domain timestamps for incremental crawling.
 */

import { validateExternalUrl } from '../ssrf.js';
import { getCached, setCache } from './cache.js';
import { createJob } from './client.js';
import { logCost } from './cost-tracker.js';
import { getDomainTimestamp, setDomainTimestamp } from './domain-timestamps.js';
import { pollUntilDone } from './polling.js';
import type { CrawlOptions, CrawlSiteResult } from './types.js';

/**
 * Crawl a website using Cloudflare Browser Rendering /crawl API.
 *
 * Validates the URL against SSRF rules before sending to Cloudflare.
 * Creates a job, polls with exponential backoff, and returns all pages.
 *
 * Features:
 * - Result caching (skipped when modifiedSince is set)
 * - Cost tracking for rendered crawls
 * - Automatic incremental crawling via per-domain timestamps
 *
 * @param url - The website URL to crawl
 * @param options - Crawl configuration
 *
 * @example
 * ```typescript
 * const result = await crawlSite('https://example.com', { limit: 5 });
 * for (const page of result.pages) {
 *   console.log(page.url, page.markdown?.length);
 * }
 * ```
 */
export async function crawlSite(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlSiteResult> {
  // SSRF validation
  const validation = validateExternalUrl(url);
  if (!validation.valid) {
    throw new Error(`URL blocked by SSRF validation: ${validation.error}`);
  }

  const isIncremental = options.modifiedSince !== undefined;

  // If modifiedSince is not explicitly set, check domain timestamp for auto-incremental
  if (!isIncremental) {
    const lastCrawl = getDomainTimestamp(url);
    if (lastCrawl !== undefined) {
      options = { ...options, modifiedSince: lastCrawl };
      console.log(`[cloudflare-crawl] Auto-incremental: using modifiedSince=${lastCrawl} for ${url}`);
    }
  }

  // Check cache (skip for incremental crawls, whether explicit or auto)
  const useCache = options.modifiedSince === undefined;
  if (useCache) {
    const cached = getCached(url, options);
    if (cached) {
      console.log(`[cloudflare-crawl] Cache hit for ${url} (${cached.pages.length} pages)`);
      return cached;
    }
  }

  const startTime = Date.now();

  const jobId = await createJob(validation.url, options);

  const pollResult = await pollUntilDone(jobId, options.timeout);

  const elapsedMs = Date.now() - startTime;

  console.log(
    `[cloudflare-crawl] Done. ${pollResult.records.length} pages in ${Math.round(elapsedMs / 1000)}s (status: ${pollResult.status}, browser: ${pollResult.browserSecondsUsed}s)`,
  );

  const result: CrawlSiteResult = {
    jobId,
    status: pollResult.status,
    pages: pollResult.records,
    totalPages: pollResult.totalPages,
    browserSecondsUsed: pollResult.browserSecondsUsed,
    elapsedMs,
  };

  // Cache the result (skip for incremental crawls)
  if (useCache) {
    setCache(url, options, result);
  }

  // Track cost for rendered crawls
  logCost({
    url,
    jobId,
    browserSeconds: pollResult.browserSecondsUsed,
    render: options.render ?? false,
    pages: pollResult.records.length,
  });

  // Update domain timestamp after successful crawl
  setDomainTimestamp(url);

  return result;
}
