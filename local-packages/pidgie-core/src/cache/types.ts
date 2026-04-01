/**
 * Caching Layer Types
 *
 * Generic cache types for content caching with freshness checking.
 */

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = unknown> {
  /** Unique cache key */
  key: string;
  /** Cached data */
  data: T;
  /** Content hash for change detection */
  contentHash: string;
  /** ETag from origin server */
  etag?: string | null;
  /** Last-Modified header from origin */
  lastModified?: string | null;
  /** When the entry was first created */
  createdAt: Date;
  /** When the entry was last updated */
  updatedAt: Date;
  /** When freshness was last checked */
  lastCheckedAt: Date;
  /** Time-to-live in milliseconds */
  ttlMs?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Cache store interface
 */
export interface CacheStore<T = unknown> {
  /** Get an entry by key */
  get(key: string): Promise<CacheEntry<T> | null>;
  /** Set an entry */
  set(key: string, entry: Omit<CacheEntry<T>, 'key'>): Promise<void>;
  /** Delete an entry */
  delete(key: string): Promise<boolean>;
  /** Check if key exists */
  has(key: string): Promise<boolean>;
  /** Update the lastCheckedAt timestamp */
  touch(key: string): Promise<void>;
  /** Update entry metadata (etag, lastModified) */
  updateMetadata(
    key: string,
    metadata: { etag?: string | null; lastModified?: string | null }
  ): Promise<void>;
  /** Clear all entries */
  clear(): Promise<void>;
  /** Get all keys */
  keys(): Promise<string[]>;
  /** Delete entries older than maxAge (in days) */
  cleanup(maxAgeDays: number): Promise<number>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtlMs?: number;
  /** How often to check freshness (ms) */
  freshnessCheckIntervalMs?: number;
  /** Max age before auto-cleanup (days) */
  maxAgeDays?: number;
  /** Probability of running cleanup on write (0-1) */
  cleanupProbability?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Freshness check result
 */
export interface FreshnessResult {
  /** Whether the cached content is still fresh */
  fresh: boolean;
  /** Action to take */
  action: 'none' | 'update_metadata' | 'refresh';
  /** New ETag if changed */
  newETag?: string | null;
  /** New Last-Modified if changed */
  newLastModified?: string | null;
  /** New content if refresh needed */
  newContent?: string;
}

/**
 * Freshness checker function type
 */
export type FreshnessChecker = (
  url: string,
  entry: CacheEntry
) => Promise<FreshnessResult>;

/**
 * Cache lookup result
 */
export interface CacheLookupResult<T = unknown> {
  /** Whether the cache had an entry */
  hit: boolean;
  /** Whether the entry is fresh (within TTL) */
  fresh: boolean;
  /** The cached data */
  data: T | null;
  /** The full cache entry */
  entry: CacheEntry<T> | null;
}
