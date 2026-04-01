/**
 * @runwell/scraper
 *
 * Shared BFS web crawler with SSRF protection, content extraction, and site preview.
 *
 * @example
 * ```typescript
 * import { scrapeWebsite, normalizeUrl, isBlockedUrl } from '@runwell/scraper';
 *
 * const url = normalizeUrl('example.com');
 * if (url && !isBlockedUrl(url)) {
 *   const website = await scrapeWebsite(url, (status, count) => {
 *     console.log(`${status} (${count} pages)`);
 *   });
 *   console.log(website.businessName);
 * }
 * ```
 */

// Main scraper function
export { scrapeWebsite } from './scraper.js';

// Site preview
export { fetchSitePreview } from './preview.js';

// SSRF protection
export { isBlockedUrl, isResolvedIpBlocked, sanitizeUrl, validateExternalUrl } from './ssrf.js';

// URL utilities
export {
  normalizeUrl,
  resolveCanonicalUrl,
  canonicalizeUrl,
  resolveUrl,
  isExternalUrl,
  shouldSkipUrl,
  isValuableExternalDomain,
  getDomain,
  scoreUrl,
} from './url-utils.js';

// Content utilities
export {
  hashContent,
  extractBusinessName,
  buildCombinedContent,
  isCountryOrRegion,
  isGenericPhrase,
  extractFromDomain,
  extractFromTitle,
} from './content-utils.js';

// Constants
export {
  DEFAULT_OPTIONS,
  USER_AGENT,
  BROWSER_HEADERS,
  CRAWL_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  VALUABLE_EXTERNAL_DOMAINS,
  PRODUCT_URL_PATTERNS,
  CONTENT_URL_PATTERNS,
  SKIP_EXTENSIONS,
  SKIP_PATHS,
  SKIP_DOMAINS,
  REGION_IDENTIFIERS,
  GENERIC_PHRASES,
} from './constants.js';

// Cloudflare /crawl (JS rendering)
export { crawlSite } from './cloudflare/index.js';
export type { CrawlOptions, CrawlRecord, CrawlSiteResult } from './cloudflare/types.js';

// Types
export type {
  ScraperOptions,
  ScrapedPage,
  ScrapedWebsite,
  CrawlState,
  ProgressCallback,
  SitePreview,
  LinkDetail,
  ImageDetail,
} from './types.js';
