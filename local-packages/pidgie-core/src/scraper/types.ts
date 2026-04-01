/**
 * Scraper Types
 *
 * Re-exports shared types from @runwell/scraper and adds the
 * signals-extended ScrapedWebsite used by pidgie-core.
 */

import type { BusinessSignals } from '../detection/index.js';
import type { ScrapedWebsite as BaseScrapedWebsite } from '@runwell/scraper';

// Re-export all shared types
export type {
  ScraperOptions,
  ScrapedPage,
  CrawlState,
  ProgressCallback,
  SitePreview,
} from '@runwell/scraper';

/**
 * ScrapedWebsite with business signals (Pidgie-specific).
 * Extends the shared @runwell/scraper type with detected business capabilities.
 */
export interface ScrapedWebsite extends BaseScrapedWebsite {
  /** Detected business capabilities and type */
  signals: BusinessSignals;
}
