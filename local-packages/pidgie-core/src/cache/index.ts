/**
 * Caching Layer Module
 *
 * Content caching with freshness checking and pluggable storage backends.
 *
 * @example
 * ```typescript
 * import { CacheManager, createCacheManager } from '@runwell/pidgie-core/cache';
 *
 * // Create a cache manager
 * const cache = createCacheManager<ScrapedWebsite>({
 *   defaultTtlMs: 24 * 60 * 60 * 1000, // 24 hours
 *   freshnessCheckIntervalMs: 60 * 60 * 1000, // 1 hour
 * });
 *
 * // Cache a website
 * await cache.set(normalizeUrl(url), scrapedData, {
 *   contentHash: hashContent(html),
 *   etag: response.headers.get('etag'),
 * });
 *
 * // Get with freshness check
 * const result = await cache.getWithFreshnessCheck(key, url);
 * if (result.hit && result.fresh) {
 *   return result.data; // Use cached data
 * }
 * ```
 */

// Manager
export { CacheManager, createCacheManager } from './manager.js';

// Stores
export { MemoryCacheStore, createMemoryCacheStore } from './memory-store.js';

// Utilities
export { hashContent, quickHash, normalizeUrl } from './hash.js';
export {
  checkFreshness,
  needsFreshnessCheck,
  isExpired,
  type FreshnessCheckOptions,
} from './freshness.js';

// Types
export type {
  CacheEntry,
  CacheStore,
  CacheConfig,
  CacheLookupResult,
  FreshnessResult,
  FreshnessChecker,
} from './types.js';
