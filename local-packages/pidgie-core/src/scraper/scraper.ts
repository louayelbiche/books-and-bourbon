/**
 * Web Scraper (Pidgie Wrapper)
 *
 * Thin wrapper around @runwell/scraper that adds business signal detection.
 * The shared package handles BFS crawling, content extraction, and SSRF protection.
 * This wrapper adds the Pidgie-specific detectBusinessSignals step.
 */

import { scrapeWebsite as baseScrapeWebsite, crawlSite } from '@runwell/scraper';
import { extractFromDomain, extractFromTitle, getDomain, buildCombinedContent } from '@runwell/scraper';
import type { ScraperOptions, ProgressCallback, ScrapedPage, ScrapedWebsite as BaseScrapedWebsite } from '@runwell/scraper';
import type { CrawlRecord } from '@runwell/scraper';
import type { ScrapedWebsite } from './types.js';
import { detectBusinessSignals } from '../detection/index.js';
import { enrichSignalsWithLLM } from '../detection/llm-enrich.js';

/** Minimum homepage body text length before attempting Cloudflare fallback. */
const CHEERIO_MIN_CHARS = 500;

/**
 * Check whether Cloudflare Browser Rendering credentials are configured.
 */
function hasCloudflareCredentials(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_BROWSER_RENDERING_TOKEN
  );
}

/**
 * Map a CrawlRecord to a ScrapedPage compatible with the existing pipeline.
 */
function crawlRecordToPage(record: CrawlRecord, baseDomain: string): ScrapedPage {
  const bodyText = record.markdown ?? '';
  const title = record.metadata.title ?? '';
  const pageUrl = record.url;
  let pageDomain: string;
  try {
    pageDomain = new URL(pageUrl).hostname;
  } catch {
    pageDomain = baseDomain;
  }
  return {
    url: pageUrl,
    title,
    description: '',
    headings: [],
    bodyText,
    links: [],
    isExternal: pageDomain !== baseDomain,
    domain: pageDomain,
  };
}

/**
 * Attempt a Cloudflare crawl and map the result to the base ScrapedWebsite format.
 * Returns null if the crawl fails or yields no pages.
 */
async function tryCloudflareCrawl(
  url: string,
  maxPages: number,
  onProgress?: ProgressCallback,
): Promise<BaseScrapedWebsite | null> {
  try {
    onProgress?.('Retrying with Cloudflare browser rendering...', 0);
    const cfResult = await crawlSite(url, {
      limit: maxPages,
      render: true,
    });

    const completedRecords = cfResult.pages.filter(
      (r) => r.status === 'completed',
    );
    if (completedRecords.length === 0) return null;

    const baseDomain = getDomain(url);
    const pages = completedRecords.map((r) => crawlRecordToPage(r, baseDomain));

    // Derive business name from the homepage title or domain
    const homepageTitle = pages[0]?.title ?? '';
    const domainHint = extractFromDomain(url);
    const businessName =
      extractFromTitle(homepageTitle, domainHint) ??
      domainHint ??
      baseDomain;

    const combinedContent = buildCombinedContent(pages, businessName, baseDomain, 100_000);

    return {
      url,
      pages,
      combinedContent,
      businessName,
    };
  } catch (error) {
    console.error(
      '[scraper] Cloudflare crawl failed:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Scrape a website using BFS crawling and detect business signals.
 *
 * Detection pipeline:
 * 1. Cheerio-based BFS crawl (fast, works for most sites)
 * 2. Cloudflare fallback if homepage body is under 500 chars (JS-heavy sites)
 * 3. Regex-based pattern detection (fast, zero-cost baseline)
 * 4. LLM enrichment via Gemini Flash (accurate category-level extraction)
 *
 * LLM enrichment fails gracefully; missing API key or errors fall back to regex signals.
 *
 * @param url - Starting URL
 * @param onProgress - Optional progress callback
 * @param options - Scraper options
 * @returns Complete website data with business signals
 */
export async function scrapeWebsite(
  url: string,
  onProgress?: ProgressCallback,
  options?: Partial<ScraperOptions>
): Promise<ScrapedWebsite> {
  let result = await baseScrapeWebsite(url, onProgress, options);

  // Note: Cloudflare Browser Rendering fallback is now handled at the
  // @runwell/scraper package level (inside _legacyScrapeWebsite), so all
  // consumers (pidgie-demo, Shopimate, etc.) get it automatically.

  // Step 1: Regex-based detection (fast baseline)
  onProgress?.('Analyzing business type...', result.pages.length);
  const baseSignals = detectBusinessSignals(result.pages);

  // Step 2: LLM enrichment (accurate offerings and industry extraction)
  const signals = await enrichSignalsWithLLM(baseSignals, result.combinedContent);

  console.log(
    `[Scraper] Detected: ${signals.businessType} (confidence: ${(signals.confidence * 100).toFixed(0)}%)`
  );

  return {
    ...result,
    signals,
  };
}
