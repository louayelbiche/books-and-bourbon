import { websiteDb, type StoredWebsite, type WebsiteInsert } from "./db.js";
import { hashContent } from "./hash.js";
import { checkFreshness } from "./freshness.js";
import type { ScrapedPage } from "@runwell/scraper";
import { detectBusinessSignals } from "../detection/index.js";
import type { BusinessSignals } from "../detection/index.js";

/** ScrapedWebsite with optional signals (added by pidgie-core scraper) */
interface ScrapedWebsiteWithSignals {
  url: string;
  pages: ScrapedPage[];
  combinedContent: string;
  businessName: string;
  language?: string;
  signals?: BusinessSignals;
}

/**
 * How long to trust cached data before doing a freshness check.
 * Within this window, cached data is returned without any network requests.
 */
const FRESHNESS_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/** Days after which unused cache entries are automatically purged. */
const CACHE_TTL_DAYS = 30;

/**
 * Lazy cleanup: ~1% chance of running on each cache write.
 */
function maybePurgeStaleEntries(): void {
  if (Math.random() < 0.01) {
    const deleted = websiteDb.cleanupStale(CACHE_TTL_DAYS);
    if (deleted > 0) {
      console.log(`[cache] Purged ${deleted} stale entries (>${CACHE_TTL_DAYS}d old)`);
    }
  }
}

/**
 * Normalize URL for consistent cache lookups.
 * Uses origin (no trailing slash, no path).
 */
function normalizeUrlForCache(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/**
 * Convert a database record back to a ScrapedWebsite + products.
 * Products are returned as raw parsed JSON (consumer defines the type).
 */
function dbRecordToResult(stored: StoredWebsite): {
  website: ScrapedWebsiteWithSignals;
  products: unknown[];
} {
  let pages: ScrapedPage[];
  try {
    pages = JSON.parse(stored.pages) as ScrapedPage[];
  } catch {
    console.error(`[cache] Corrupt pages JSON for ${stored.url}`);
    pages = [];
  }

  let products: unknown[];
  try {
    products = stored.products ? JSON.parse(stored.products) : [];
  } catch {
    console.error(`[cache] Corrupt products JSON for ${stored.url}`);
    products = [];
  }

  let signals;
  try {
    signals = stored.signals
      ? JSON.parse(stored.signals)
      : detectBusinessSignals(pages);
  } catch {
    console.error(`[cache] Corrupt signals JSON for ${stored.url}, recomputing`);
    signals = detectBusinessSignals(pages);
  }

  return {
    website: {
      url: stored.url,
      pages,
      combinedContent: stored.combined_content || "",
      businessName: stored.business_name || "This business",
      signals,
    },
    products,
  };
}

/**
 * Store a scraped website and optionally its extracted products in the cache.
 */
export function cacheWebsite(
  website: ScrapedWebsiteWithSignals,
  durationMs: number,
  homepageHtml?: string,
  products?: unknown[]
): void {
  const normalizedUrl = normalizeUrlForCache(website.url);
  let domain: string;
  try {
    domain = new URL(website.url).hostname;
  } catch {
    domain = normalizedUrl;
  }
  const data: WebsiteInsert = {
    url: normalizedUrl,
    domain,
    business_name: website.businessName,
    combined_content: website.combinedContent,
    pages: JSON.stringify(website.pages),
    products: products ? JSON.stringify(products) : null,
    signals: JSON.stringify(website.signals),
    content_hash: hashContent(website.combinedContent),
    homepage_hash: homepageHtml ? hashContent(homepageHtml) : null,
    pages_count: website.pages.length,
    scrape_duration_ms: durationMs,
  };

  websiteDb.upsert(data);
  maybePurgeStaleEntries();
}

/**
 * Result of cache lookup with freshness check.
 */
export interface CacheFreshnessResult {
  /** Whether we have valid cached data */
  hit: boolean;
  /** Whether the cached data is still fresh */
  fresh: boolean;
  /** The cached website data (if hit and fresh) */
  website: ScrapedWebsiteWithSignals | null;
  /** The cached products as raw parsed JSON (if hit and fresh) */
  products: unknown[];
  /** Database metadata */
  metadata: StoredWebsite | null;
}

/**
 * Check cache and verify freshness.
 * Returns cached data only if it exists AND is fresh.
 * If stale, returns empty results so caller knows to rescrape.
 */
export async function getOrRefreshCache(
  url: string
): Promise<CacheFreshnessResult> {
  const normalizedUrl = normalizeUrlForCache(url);
  const stored = websiteDb.getByUrl(normalizedUrl);

  if (!stored) {
    return { hit: false, fresh: false, website: null, products: [], metadata: null };
  }

  // If checked recently, skip network freshness check entirely
  const lastChecked = new Date(stored.last_checked_at + "Z").getTime();
  const age = Date.now() - lastChecked;

  if (age < FRESHNESS_CHECK_INTERVAL_MS) {
    const { website, products } = dbRecordToResult(stored);
    return { hit: true, fresh: true, website, products, metadata: stored };
  }

  // Stale enough to warrant a freshness check
  const freshness = await checkFreshness(normalizedUrl, stored);

  if (freshness.fresh) {
    websiteDb.updateLastChecked(stored.id);

    if (
      freshness.action === "update_metadata" &&
      (freshness.newETag || freshness.newLastModified)
    ) {
      websiteDb.updateMetadata(stored.id, {
        etag: freshness.newETag,
        last_modified: freshness.newLastModified,
      });
    }

    const { website, products } = dbRecordToResult(stored);
    return { hit: true, fresh: true, website, products, metadata: stored };
  }

  // Not fresh: needs rescrape
  return { hit: true, fresh: false, website: null, products: [], metadata: stored };
}
