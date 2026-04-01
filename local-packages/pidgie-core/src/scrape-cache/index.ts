/**
 * SQLite-based scrape cache for demo apps.
 *
 * Provides persistent caching of scraped websites with freshness checking,
 * content hashing for change detection, and automatic stale entry cleanup.
 *
 * @example
 * ```typescript
 * import { getOrRefreshCache, cacheWebsite, hashContent } from '@runwell/pidgie-core/scrape-cache';
 *
 * // Check cache first
 * const cached = await getOrRefreshCache(url);
 * if (cached.hit && cached.fresh) {
 *   return cached.website;
 * }
 *
 * // Cache miss: scrape and store
 * const website = await scrapeWebsite(url);
 * cacheWebsite(website, durationMs, homepageHtml, products);
 * ```
 */

// Cache orchestration
export { getOrRefreshCache, cacheWebsite, type CacheFreshnessResult } from './cache.js';

// Database
export { websiteDb, type StoredWebsite, type WebsiteInsert } from './db.js';

// Utilities
export { hashContent } from './hash.js';
export { checkFreshness, type FreshnessResult } from './freshness.js';
