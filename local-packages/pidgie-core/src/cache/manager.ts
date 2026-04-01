/**
 * Cache Manager
 *
 * High-level cache management with automatic freshness checking.
 */

import type {
  CacheStore,
  CacheEntry,
  CacheConfig,
  CacheLookupResult,
  FreshnessResult,
} from './types.js';
import { MemoryCacheStore } from './memory-store.js';
import { hashContent } from './hash.js';
import { checkFreshness, needsFreshnessCheck, isExpired } from './freshness.js';

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  defaultTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  freshnessCheckIntervalMs: 60 * 60 * 1000, // 1 hour
  maxAgeDays: 30,
  cleanupProbability: 0.01, // 1% chance on write
  debug: false,
};

/**
 * Cache manager with freshness checking and automatic cleanup
 */
export class CacheManager<T = unknown> {
  private store: CacheStore<T>;
  private config: Required<CacheConfig>;

  constructor(store?: CacheStore<T>, config?: CacheConfig) {
    this.store = store ?? new MemoryCacheStore<T>();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Maybe run cleanup based on probability
   */
  private async maybeCleanup(): Promise<void> {
    if (Math.random() < this.config.cleanupProbability) {
      const deleted = await this.store.cleanup(this.config.maxAgeDays);
      if (deleted > 0 && this.config.debug) {
        console.log(`[cache] Purged ${deleted} stale entries (>${this.config.maxAgeDays}d old)`);
      }
    }
  }

  /**
   * Get an entry from the cache
   */
  async get(key: string): Promise<CacheLookupResult<T>> {
    const entry = await this.store.get(key);

    if (!entry) {
      return { hit: false, fresh: false, data: null, entry: null };
    }

    // Check if expired
    if (isExpired(entry, this.config.defaultTtlMs)) {
      return { hit: true, fresh: false, data: entry.data, entry };
    }

    // Touch the entry to update lastCheckedAt
    await this.store.touch(key);

    return { hit: true, fresh: true, data: entry.data, entry };
  }

  /**
   * Get with URL-based freshness checking
   */
  async getWithFreshnessCheck(
    key: string,
    url: string
  ): Promise<CacheLookupResult<T> & { freshnessResult?: FreshnessResult }> {
    const result = await this.get(key);

    if (!result.hit || !result.entry) {
      return result;
    }

    // Check if we need to validate freshness
    if (!needsFreshnessCheck(result.entry, this.config.freshnessCheckIntervalMs)) {
      return result;
    }

    // Perform freshness check
    const freshnessResult = await checkFreshness(url, result.entry);

    if (freshnessResult.action === 'update_metadata') {
      await this.store.updateMetadata(key, {
        etag: freshnessResult.newETag,
        lastModified: freshnessResult.newLastModified,
      });
    }

    return {
      ...result,
      fresh: freshnessResult.fresh,
      freshnessResult,
    };
  }

  /**
   * Set an entry in the cache
   */
  async set(
    key: string,
    data: T,
    options?: {
      contentHash?: string;
      etag?: string | null;
      lastModified?: string | null;
      ttlMs?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const now = new Date();

    const entry: Omit<CacheEntry<T>, 'key'> = {
      data,
      contentHash: options?.contentHash ?? hashContent(JSON.stringify(data)),
      etag: options?.etag,
      lastModified: options?.lastModified,
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: now,
      ttlMs: options?.ttlMs,
      metadata: options?.metadata,
    };

    await this.store.set(key, entry);
    await this.maybeCleanup();
  }

  /**
   * Update an existing entry's data
   */
  async update(
    key: string,
    data: T,
    options?: {
      contentHash?: string;
      etag?: string | null;
      lastModified?: string | null;
    }
  ): Promise<boolean> {
    const existing = await this.store.get(key);
    if (!existing) {
      return false;
    }

    const now = new Date();
    const entry: Omit<CacheEntry<T>, 'key'> = {
      ...existing,
      data,
      contentHash: options?.contentHash ?? hashContent(JSON.stringify(data)),
      etag: options?.etag ?? existing.etag,
      lastModified: options?.lastModified ?? existing.lastModified,
      updatedAt: now,
      lastCheckedAt: now,
    };

    await this.store.set(key, entry);
    return true;
  }

  /**
   * Delete an entry
   */
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Force cleanup of old entries
   */
  async cleanup(): Promise<number> {
    return this.store.cleanup(this.config.maxAgeDays);
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    return this.store.keys();
  }
}

/**
 * Create a cache manager with memory store
 */
export function createCacheManager<T = unknown>(
  config?: CacheConfig
): CacheManager<T> {
  return new CacheManager<T>(undefined, config);
}
