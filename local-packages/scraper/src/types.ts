/**
 * Scraper Types
 *
 * Type definitions for website scraping functionality.
 */

/**
 * Configuration options for the scraper.
 */
export interface ScraperOptions {
  /** Maximum internal pages to scrape (default: 20) */
  maxInternalPages: number;
  /** Maximum external pages to scrape (default: 5) */
  maxExternalPages: number;
  /** Whether to follow external links (default: true) */
  followExternalLinks: boolean;
  /** Maximum characters in combined content (default: 75000) */
  maxContentChars: number;
  /** Use stealth TLS fingerprinting via impit (default: false) */
  stealth: boolean;
}

/**
 * Link with anchor text preserved.
 */
export interface LinkDetail {
  href: string;
  text: string;
}

/**
 * Image with alt text preserved.
 */
export interface ImageDetail {
  src: string;
  alt: string;
}

/**
 * Represents a single scraped page.
 */
export interface ScrapedPage {
  /** Full URL of the page */
  url: string;
  /** Page title from <title> tag */
  title: string;
  /** Meta description */
  description: string;
  /** Extracted headings (h1, h2, h3) */
  headings: string[];
  /** Main body text content */
  bodyText: string;
  /** Links found on the page */
  links: string[];
  /** Whether this is an external page */
  isExternal: boolean;
  /** Domain of the page */
  domain: string;
  /** JSON-LD structured data found on the page (parsed objects) */
  jsonLd?: unknown[];
  /** Product/OG images extracted from the page */
  images?: string[];
  /** Links with anchor text (for product name extraction) */
  linkDetails?: LinkDetail[];
  /** Images with alt text (for product image matching) */
  imageDetails?: ImageDetail[];
  /** Emails extracted from mailto: links */
  mailtoLinks?: string[];
  /** Phone numbers extracted from tel: links */
  telLinks?: string[];
  /** Contacts extracted from footer section */
  footerContacts?: { phones: string[]; emails: string[]; addresses: string[] };
}

/**
 * Result of scraping a complete website (no business signals — those stay at app level).
 */
export interface ScrapedWebsite {
  /** Base URL of the website */
  url: string;
  /** All scraped pages */
  pages: ScrapedPage[];
  /** Combined content from all pages */
  combinedContent: string;
  /** Extracted business name */
  businessName: string;
  /** ISO 639-1 language code (e.g., 'en', 'es', 'fr') */
  language?: string;
}

/**
 * Internal crawl state for BFS traversal.
 */
export interface CrawlState {
  /** Already visited URLs */
  visited: Set<string>;
  /** Queue of internal URLs to visit */
  queue: string[];
  /** Queue of external URLs to visit */
  externalQueue: string[];
  /** O(1) membership check for all queued URLs (internal + external) */
  queued: Set<string>;
  /** Content hashes for deduplication */
  contentHashes: Set<string>;
}

/**
 * Progress callback type for reporting scraping status.
 */
export type ProgressCallback = (status: string, pagesScraped: number) => void;

/**
 * Site preview extracted from OG tags.
 */
export interface SitePreview {
  title: string | null;
  description: string | null;
  favicon: string | null;
  ogImage: string | null;
  domain: string;
}
