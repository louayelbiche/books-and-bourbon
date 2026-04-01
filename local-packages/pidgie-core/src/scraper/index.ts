/**
 * Scraper Module
 *
 * Re-exports shared scraping utilities from @runwell/scraper
 * and the Pidgie-specific scrapeWebsite wrapper (with business signals).
 *
 * @example
 * ```typescript
 * import { scrapeWebsite, normalizeUrl } from '@runwell/pidgie-core/scraper';
 *
 * const url = normalizeUrl('example.com');
 * if (url) {
 *   const website = await scrapeWebsite(url, (status, count) => {
 *     console.log(`${status} (${count} pages)`);
 *   });
 *   console.log(website.businessName);
 *   console.log(website.signals.businessType);
 * }
 * ```
 */

// Pidgie-specific scrapeWebsite (adds business signals)
export { scrapeWebsite } from './scraper.js';

// Pidgie-specific types (ScrapedWebsite with signals)
export type { ScrapedWebsite } from './types.js';

// Re-export everything else from shared package
export {
  // Site preview
  fetchSitePreview,

  // SSRF protection
  isBlockedUrl,
  isResolvedIpBlocked,
  sanitizeUrl,
  validateExternalUrl,

  // URL utilities
  normalizeUrl,
  resolveCanonicalUrl,
  canonicalizeUrl,
  resolveUrl,
  isExternalUrl,
  shouldSkipUrl,
  isValuableExternalDomain,
  getDomain,
  scoreUrl,

  // Content utilities
  hashContent,
  extractBusinessName,
  buildCombinedContent,
  isCountryOrRegion,
  isGenericPhrase,
  extractFromDomain,
  extractFromTitle,

  // Constants
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
} from '@runwell/scraper';

// Re-export shared types (except ScrapedWebsite which is overridden above)
export type {
  ScraperOptions,
  ScrapedPage,
  CrawlState,
  ProgressCallback,
  SitePreview,
} from '@runwell/scraper';
