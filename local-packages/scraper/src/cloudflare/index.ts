/**
 * Cloudflare Browser Rendering /crawl submodule.
 *
 * Provides a high-level crawlSite() function backed by Cloudflare's
 * managed crawl API with SSRF protection, exponential backoff polling,
 * automatic result pagination, file-based caching, cost tracking,
 * and incremental crawling via per-domain timestamps.
 */

// High-level orchestrator
export { crawlSite } from './crawl.js';

// Cache utilities
export { getCached, setCache, clearExpired } from './cache.js';

// Cost tracking
export { getCostSummary } from './cost-tracker.js';
export type { CostEntry, CostSummary } from './cost-tracker.js';

// Domain timestamps (incremental crawling)
export { getDomainTimestamp, setDomainTimestamp } from './domain-timestamps.js';

// Low-level client (for advanced usage)
export { createJob, getResults, cancelJob } from './client.js';

// Polling
export { pollUntilDone } from './polling.js';

// Types
export type {
  CrawlOptions,
  CrawlJobResponse,
  CrawlJobStatus,
  CrawlRecord,
  CrawlResult,
  CrawlSiteResult,
} from './types.js';
