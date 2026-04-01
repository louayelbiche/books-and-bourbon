/**
 * File-based JSON cache for Cloudflare /crawl results.
 *
 * Stores cached crawl results as individual JSON files keyed by
 * SHA-256 hash of URL + options. No external dependencies; uses
 * native node:fs and node:crypto.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CrawlOptions, CrawlSiteResult } from './types.js';

const CACHE_DIR = join(homedir(), '.cache', 'runwell-scraper', 'crawl');
const DEFAULT_TTL_MS = 86_400_000; // 24 hours

interface CacheEntry {
  cachedAt: number;
  ttlMs: number;
  result: CrawlSiteResult;
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Build a deterministic cache key from URL and relevant options.
 */
function cacheKey(url: string, options: CrawlOptions = {}): string {
  const formats = (options.formats ?? ['markdown']).join(',');
  const render = String(options.render ?? false);
  const limit = String(options.limit ?? 10);
  const raw = `${url}|${formats}|${render}|${limit}`;
  return createHash('sha256').update(raw).digest('hex');
}

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.json`);
}

/**
 * Retrieve a cached crawl result if it exists and has not expired.
 * Returns null if no valid cache entry is found.
 */
export function getCached(url: string, options: CrawlOptions = {}): CrawlSiteResult | null {
  const key = cacheKey(url, options);
  const path = cachePath(key);

  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, 'utf-8');
    const entry: CacheEntry = JSON.parse(raw);
    const now = Date.now();

    if (now - entry.cachedAt > entry.ttlMs) {
      // Expired; clean up
      try { unlinkSync(path); } catch { /* ignore */ }
      return null;
    }

    return entry.result;
  } catch {
    // Corrupted file; remove it
    try { unlinkSync(path); } catch { /* ignore */ }
    return null;
  }
}

/**
 * Save a crawl result to the cache.
 *
 * @param url - The crawled URL
 * @param options - The crawl options used (for cache key generation)
 * @param result - The crawl result to cache
 * @param ttlMs - Time to live in milliseconds. Default: 24 hours.
 */
export function setCache(
  url: string,
  options: CrawlOptions,
  result: CrawlSiteResult,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  ensureCacheDir();
  const key = cacheKey(url, options);
  const entry: CacheEntry = { cachedAt: Date.now(), ttlMs, result };
  writeFileSync(cachePath(key), JSON.stringify(entry), 'utf-8');
}

/**
 * Delete all expired cache entries.
 */
export function clearExpired(): number {
  if (!existsSync(CACHE_DIR)) return 0;

  const now = Date.now();
  let removed = 0;

  for (const file of readdirSync(CACHE_DIR)) {
    if (!file.endsWith('.json')) continue;
    const path = join(CACHE_DIR, file);
    try {
      const raw = readFileSync(path, 'utf-8');
      const entry: CacheEntry = JSON.parse(raw);
      if (now - entry.cachedAt > entry.ttlMs) {
        unlinkSync(path);
        removed++;
      }
    } catch {
      // Corrupted; remove
      try { unlinkSync(path); } catch { /* ignore */ }
      removed++;
    }
  }

  return removed;
}
