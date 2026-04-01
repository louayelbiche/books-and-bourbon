/**
 * Cloudflare Browser Rendering /crawl API types.
 *
 * Field names match the actual API (March 2026 open beta).
 */

/** Options for creating a crawl job. */
export interface CrawlOptions {
  /** Maximum number of pages to crawl. Default: 10. Max: 100000. */
  limit?: number;
  /** Crawl depth. Default: 100000. */
  depth?: number;
  /** Page source: "all", "sitemaps", or "links". Default: "all". */
  source?: 'all' | 'sitemaps' | 'links';
  /** Output formats. Default: ["markdown"]. */
  formats?: ('markdown' | 'html' | 'json')[];
  /** Whether to use browser rendering. Default: false (static HTML, free during beta). */
  render?: boolean;
  /** Cache max age in seconds. Default: 86400. 0 = no cache. */
  maxAge?: number;
  /** Only return pages modified after this Unix timestamp. */
  modifiedSince?: number;
  /** Crawl scope options. */
  options?: {
    includeExternalLinks?: boolean;
    includeSubdomains?: boolean;
    includePatterns?: string[];
    excludePatterns?: string[];
  };
  /** CSS selector to wait for before extracting content. */
  waitForSelector?: {
    selector: string;
    timeout?: number;
    visible?: boolean;
  };
  /** Resource types to reject during crawl. Default: ["image", "font", "media"]. */
  rejectResourceTypes?: string[];
  /** Custom user agent string. */
  userAgent?: string;
  /** Polling timeout in milliseconds. Default: 300000 (5 min). Not sent to API. */
  timeout?: number;
}

/** Response from POST /crawl (job creation). Result is the job ID string. */
export interface CrawlJobResponse {
  success: boolean;
  result: string;
}

/** A single crawled page record. */
export interface CrawlRecord {
  url: string;
  status: 'completed' | 'queued' | 'disallowed' | 'skipped' | 'errored' | 'cancelled';
  html?: string;
  markdown?: string;
  json?: Record<string, unknown>;
  metadata: {
    status: number;
    title?: string;
    url?: string;
  };
}

/** Job status values from the API. */
export type CrawlJobStatus =
  | 'running'
  | 'completed'
  | 'cancelled_due_to_timeout'
  | 'cancelled_due_to_limits'
  | 'cancelled_by_user'
  | 'errored';

/** Response from GET /crawl/{jobId}. */
export interface CrawlResult {
  success: boolean;
  result: {
    id: string;
    status: CrawlJobStatus;
    browserSecondsUsed?: number;
    total: number;
    finished: number;
    cursor?: number;
    records: CrawlRecord[];
  };
}

/** High-level result returned by crawlSite(). */
export interface CrawlSiteResult {
  jobId: string;
  status: CrawlJobStatus;
  pages: CrawlRecord[];
  totalPages: number;
  browserSecondsUsed: number;
  elapsedMs: number;
}
