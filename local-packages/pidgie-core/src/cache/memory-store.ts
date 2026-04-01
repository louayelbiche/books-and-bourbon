/**
 * In-Memory Cache Store
 *
 * Simple in-memory cache implementation.
 * Suitable for development and single-instance deployments.
 */

import type { CacheStore, CacheEntry } from './types.js';

/**
 * In-memory cache store using Map
 */
export class MemoryCacheStore<T = unknown> implements CacheStore<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  async get(key: string): Promise<CacheEntry<T> | null> {
    return this.cache.get(key) ?? null;
  }

  async set(key: string, entry: Omit<CacheEntry<T>, 'key'>): Promise<void> {
    this.cache.set(key, { key, ...entry });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async touch(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastCheckedAt = new Date();
    }
  }

  async updateMetadata(
    key: string,
    metadata: { etag?: string | null; lastModified?: string | null }
  ): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      if (metadata.etag !== undefined) {
        entry.etag = metadata.etag;
      }
      if (metadata.lastModified !== undefined) {
        entry.lastModified = metadata.lastModified;
      }
      entry.lastCheckedAt = new Date();
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async cleanup(maxAgeDays: number): Promise<number> {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.lastCheckedAt.getTime() > maxAgeMs) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }
}

/**
 * Create a memory cache store instance
 */
export function createMemoryCacheStore<T = unknown>(): MemoryCacheStore<T> {
  return new MemoryCacheStore<T>();
}
