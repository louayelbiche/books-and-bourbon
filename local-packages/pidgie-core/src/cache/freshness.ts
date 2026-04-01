/**
 * Freshness Checking Utilities
 *
 * HTTP conditional request handling for cache validation.
 */

import type { CacheEntry, FreshnessResult } from './types.js';
import { hashContent } from './hash.js';
import { isBlockedUrl } from '@runwell/scraper';

/**
 * Default user agent for freshness checks
 */
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; PidgieBot/1.0)';

/**
 * Options for freshness checking
 */
export interface FreshnessCheckOptions {
  /** Custom user agent */
  userAgent?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Custom fetch function (for testing) */
  fetch?: typeof globalThis.fetch;
}

/**
 * Check if cached content is still fresh using HTTP conditional requests.
 *
 * Strategy:
 * 1. HEAD request with If-None-Match / If-Modified-Since
 * 2. If 304, content unchanged
 * 3. Otherwise, fetch full page and compare content hash
 * 4. If hash matches, just update metadata
 * 5. If hash differs, needs full refresh
 *
 * @param url - The URL to check
 * @param entry - The cached entry to validate
 * @param options - Check options
 * @returns Freshness result with action to take
 */
export async function checkFreshness(
  url: string,
  entry: CacheEntry,
  options?: FreshnessCheckOptions
): Promise<FreshnessResult> {
  // Re-validate URL against SSRF blocklist (URL comes from cache, could be tampered)
  if (isBlockedUrl(url)) {
    return { fresh: false, action: 'refresh' };
  }

  const {
    userAgent = DEFAULT_USER_AGENT,
    timeoutMs = 10000,
    fetch: fetchFn = globalThis.fetch,
  } = options ?? {};

  try {
    // Build conditional headers
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
    };

    if (entry.etag) {
      headers['If-None-Match'] = entry.etag;
    }
    if (entry.lastModified) {
      headers['If-Modified-Since'] = entry.lastModified;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Step 1: HEAD request with conditional headers
      const headResponse = await fetchFn(url, {
        method: 'HEAD',
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });

      if (headResponse.status === 304) {
        // Server confirms no changes
        return { fresh: true, action: 'none' };
      }

      // Step 2: Fetch full page and compare hash
      const response = await fetchFn(url, {
        headers: { 'User-Agent': userAgent },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        // Can't fetch, assume fresh to avoid unnecessary errors
        console.warn(`[freshness] Failed to fetch ${url}: ${response.status}`);
        return { fresh: true, action: 'none' };
      }

      const html = await response.text();
      const newHash = hashContent(html);

      const newETag = response.headers.get('etag');
      const newLastModified = response.headers.get('last-modified');

      // Compare with stored content hash
      if (newHash === entry.contentHash) {
        // Content same, just update headers
        return {
          fresh: true,
          action: 'update_metadata',
          newETag,
          newLastModified,
        };
      }

      // Content changed - needs refresh
      return {
        fresh: false,
        action: 'refresh',
        newETag,
        newLastModified,
        newContent: html,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // On error, assume fresh to avoid unnecessary work
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[freshness] Timeout checking ${url}`);
    } else {
      console.error('[freshness] Check failed:', error);
    }
    return { fresh: true, action: 'none' };
  }
}

/**
 * Check if an entry needs freshness validation based on time.
 *
 * @param entry - The cache entry
 * @param intervalMs - How often to check freshness
 * @returns Whether freshness should be checked
 */
export function needsFreshnessCheck(entry: CacheEntry, intervalMs: number): boolean {
  const now = Date.now();
  const lastChecked = entry.lastCheckedAt.getTime();
  return now - lastChecked > intervalMs;
}

/**
 * Check if an entry has expired based on TTL.
 *
 * @param entry - The cache entry
 * @param defaultTtlMs - Default TTL if not set on entry
 * @returns Whether the entry has expired
 */
export function isExpired(entry: CacheEntry, defaultTtlMs: number): boolean {
  const ttl = entry.ttlMs ?? defaultTtlMs;
  const now = Date.now();
  return now - entry.updatedAt.getTime() > ttl;
}
