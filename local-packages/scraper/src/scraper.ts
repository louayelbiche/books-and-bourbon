/**
 * Web Scraper
 *
 * BFS web crawler that extracts content from websites.
 * This is the shared crawl engine — business signal detection stays at app level.
 */

import * as cheerio from 'cheerio';
import type {
  ScraperOptions,
  ScrapedPage,
  ScrapedWebsite,
  CrawlState,
  ProgressCallback,
} from './types.js';
import {
  DEFAULT_OPTIONS,
  BROWSER_HEADERS,
  CRAWL_DELAY_MS,
  REQUEST_TIMEOUT_MS,
} from './constants.js';
import {
  resolveUrl,
  isExternalUrl,
  shouldSkipUrl,
  isValuableExternalDomain,
  getDomain,
  scoreUrl,
} from './url-utils.js';
import {
  hashContent,
  extractBusinessName,
  buildCombinedContent,
} from './content-utils.js';
// stealth.ts is lazy-imported inside doFetch() to avoid webpack resolving
// the impit native module when stealth mode is not used.
import {
  getServiceUrl,
  checkServiceHealth,
  scrapeViaService,
  recordFailure,
} from './client.js';
import { sendScraperAlert } from './alerts.js';
import { crawlSite } from './cloudflare/index.js';
import type { CrawlRecord } from './cloudflare/types.js';
import { extractFromDomain, extractFromTitle } from './content-utils.js';

/**
 * Fetch a page with appropriate headers.
 *
 * @param url - URL to fetch
 * @param throwOnError - If true, throw on network/HTTP errors instead of returning null.
 *                       Used for homepage fetches so callers get specific error messages.
 * @returns HTML content or null on failure
 */
async function fetchPage(url: string, throwOnError = false): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      if (response.status === 403) {
        const err = new Error(`Access denied (403): ${url}`);
        (err as Error & { statusCode: number }).statusCode = 403;
        throw err;
      }
      if (throwOnError) {
        throw new Error(`HTTP_${response.status}: Server returned ${response.status} for ${url}`);
      }
      return null;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.warn(`Skipping non-HTML content at ${url}: ${contentType}`);
      if (throwOnError) {
        throw new Error(`NOT_HTML: Server returned ${contentType} instead of HTML for ${url}`);
      }
      return null;
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && (error as Error & { statusCode?: number }).statusCode === 403) {
      throw error;
    }
    // Propagate original error when throwOnError is set (homepage fetch)
    if (throwOnError) {
      throw error;
    }
    console.warn(`Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Route fetch through stealth or standard path.
 * Stealth module is lazy-imported to avoid webpack resolving the impit
 * native dependency when stealth is not used. If impit is unavailable,
 * falls back to regular fetch with a warning.
 */
async function doFetch(
  url: string,
  throwOnError = false,
  stealth = false,
): Promise<string | null> {
  if (stealth) {
    try {
      const { fetchPageStealth } = await import('./stealth.js');
      const result = await fetchPageStealth(url, throwOnError);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // If impit is unavailable, fall back silently to regular fetch
      if (msg.includes('impit') || msg.includes('MODULE_NOT_FOUND')) {
        return fetchPage(url, throwOnError);
      }
      console.warn('[Scraper] Stealth fetch failed, falling back to regular fetch:', msg);
      return fetchPage(url, throwOnError);
    }
  }
  return fetchPage(url, throwOnError);
}

/**
 * Extract content from HTML.
 *
 * @param html - HTML content
 * @param url - Page URL
 * @param baseDomain - Base domain for external detection
 * @returns Extracted page content
 */
function extractPageContent(
  html: string,
  url: string,
  baseDomain: string
): ScrapedPage {
  const $ = cheerio.load(html);

  // Extract metadata first (before any removal)
  const title =
    $('title').text().trim() || $('h1').first().text().trim() || '';
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';

  // Extract page images BEFORE removing elements
  const pageImages: string[] = [];
  // OG image (most reliable for product pages)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    const resolved = resolveUrl(url, ogImage);
    if (resolved) pageImages.push(resolved);
  }
  // Product-specific image selectors
  $('img[data-product-image], img.product-image, img.product-featured-image, .product-image img, .product-media img, [data-main-image] img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.startsWith('data:')) {
      const resolved = resolveUrl(url, src);
      if (resolved) pageImages.push(resolved);
    }
  });

  // Extract image details (src + alt) for product matching
  const imageDetails: { src: string; alt: string }[] = [];
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')?.trim();
    if (alt && alt.length > 2) {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.startsWith('data:')) {
        const resolved = resolveUrl(url, src);
        if (resolved) {
          imageDetails.push({ src: resolved, alt });
        }
      }
    }
  });

  // Extract ALL links BEFORE removing elements
  const links: string[] = [];
  const linkDetails: { href: string; text: string }[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const resolved = resolveUrl(url, href);
      if (resolved && !shouldSkipUrl(resolved)) {
        links.push(resolved);
        const text = $(el).text().trim();
        if (text) {
          linkDetails.push({ href: resolved, text });
        }
      }
    }
  });

  // Extract JSON-LD structured data before removing scripts
  const jsonLd: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).text());
      if (parsed) jsonLd.push(parsed);
    } catch {
      // Silently skip malformed JSON-LD
    }
  });

  // Extract OG product meta tags (STORY-009 / FT-07)
  // Inject as synthetic JSON-LD entry so the detection layer can consume it.
  const ogType = $('meta[property="og:type"]').attr('content')?.toLowerCase();
  if (ogType === 'product' || ogType === 'og:product') {
    const ogProduct: Record<string, unknown> = {
      '@type': 'og:product',
      _ogProduct: true,
      name: $('meta[property="og:title"]').attr('content') || title,
      description: $('meta[property="og:description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      price: $('meta[property="product:price:amount"]').attr('content') || '',
      currency: $('meta[property="product:price:currency"]').attr('content') || 'USD',
    };
    if (ogProduct.name) jsonLd.push(ogProduct);
  }

  // Now remove non-content elements for text extraction
  $('script, style, nav, header, footer, noscript, iframe').remove();

  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) {
      headings.push(text);
    }
  });

  // Get main content text — prefer <main>/<article> but fall back to <body>
  // if the matched element has very little text (common in SPAs where <main>
  // is just a JS mount point like <main id="app"></main>).
  const mainContent = $(
    'main, article, .content, .main, #content, #main'
  ).first();
  const mainText = mainContent.length ? mainContent.text().trim() : '';
  const bodyElement = mainContent.length && mainText.length > 100 ? mainContent : $('body');

  const bodyText = bodyElement
    .text()
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n /g, '\n')
    .trim()
    .slice(0, 10000);

  const isExternal = isExternalUrl(url, baseDomain);

  // Extract mailto: and tel: links
  const mailtoLinks: string[] = [];
  const telLinks: string[] = [];
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href')?.replace('mailto:', '').split('?')[0].trim();
    if (href && href.includes('@')) mailtoLinks.push(href);
  });
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href')?.replace('tel:', '').replace(/\s/g, '').trim();
    if (href && href.replace(/\D/g, '').length >= 7) telLinks.push(href);
  });

  // Extract footer contacts
  const footerPhones: string[] = [];
  const footerEmails: string[] = [];
  const footerAddresses: string[] = [];
  const PHONE_RE = /(?:\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g;
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  $('footer, .footer, [class*="footer"], [id*="footer"]').each((_, el) => {
    const text = $(el).text();
    const phoneMatches = text.match(PHONE_RE) || [];
    for (const p of phoneMatches) {
      const digits = p.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15 && !/\d{1,2}:\d{2}/.test(p)) {
        footerPhones.push(p.trim());
      }
    }
    const emailMatches = text.match(EMAIL_RE) || [];
    footerEmails.push(...emailMatches);
  });
  $('footer address, .footer address, address').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 10 && text.length < 300) footerAddresses.push(text);
  });

  return {
    url,
    title,
    description,
    headings: headings.slice(0, 20),
    bodyText,
    links: [...new Set(links)],
    isExternal,
    domain: getDomain(url),
    ...(jsonLd.length > 0 && { jsonLd }),
    ...(pageImages.length > 0 && { images: [...new Set(pageImages)].slice(0, 5) }),
    ...(linkDetails.length > 0 && { linkDetails }),
    ...(imageDetails.length > 0 && { imageDetails }),
    ...(mailtoLinks.length > 0 && { mailtoLinks: [...new Set(mailtoLinks)] }),
    ...(telLinks.length > 0 && { telLinks: [...new Set(telLinks)] }),
    ...((footerPhones.length > 0 || footerEmails.length > 0 || footerAddresses.length > 0) && {
      footerContacts: {
        phones: [...new Set(footerPhones)],
        emails: [...new Set(footerEmails)],
        addresses: [...new Set(footerAddresses)],
      },
    }),
  };
}

/**
 * Scrape a website with smart fallback: Python service -> TS legacy.
 *
 * Routing logic:
 * 1. If no SCRAPER_SERVICE_URL -> use legacy quietly (dev mode)
 * 2. If SCRAPER_SERVICE_URL set:
 *    a. Check health (cached 60s)
 *    b. If healthy -> call Python service
 *       - Success: log "python-service", return result
 *       - Failure: log WARNING, increment failures
 *         - If >=3 consecutive: mark unhealthy, send Telegram alert
 *         - Fall through to legacy
 *    c. If unhealthy -> log WARNING, use legacy
 * 3. Legacy path: log "ts-fallback"
 */
export async function scrapeWebsite(
  url: string,
  onProgress?: ProgressCallback,
  options?: Partial<ScraperOptions>,
): Promise<ScrapedWebsite> {
  const serviceUrl = getServiceUrl();

  if (serviceUrl) {
    const healthy = await checkServiceHealth();

    if (healthy) {
      try {
        const result = await scrapeViaService(url, options);
        console.log(`[Scraper] python-service for ${url}`);
        return result;
      } catch (err) {
        const failures = recordFailure();
        console.warn(
          `[Scraper] WARNING: Python service failed for ${url}: ${err instanceof Error ? err.message : err}`,
        );
        if (failures >= 3) {
          sendScraperAlert(
            `Python scraper service DOWN after ${failures} consecutive failures. Last URL: ${url}`,
          );
        }
        // Fall through to legacy
      }
    } else {
      console.warn(`[Scraper] WARNING: Python service unhealthy, using ts-fallback for ${url}`);
    }
  }

  console.log(`[Scraper] ts-fallback for ${url}`);
  return _legacyScrapeWebsite(url, onProgress, options);
}

/**
 * Legacy BFS crawl (original TS implementation).
 *
 * Returns a ScrapedWebsite WITHOUT business signals.
 */
async function _legacyScrapeWebsite(
  url: string,
  onProgress?: ProgressCallback,
  options?: Partial<ScraperOptions>
): Promise<ScrapedWebsite> {
  const opts: ScraperOptions = { ...DEFAULT_OPTIONS, ...options };
  const baseUrl = new URL(url);
  const baseDomain = baseUrl.hostname;
  // Use the full provided URL (not just origin) — stripping the path breaks
  // sites that redirect root to a language selector or splash page.
  const homepageUrl = baseUrl.origin + baseUrl.pathname.replace(/\/+$/, '');

  const pages: ScrapedPage[] = [];
  const state: CrawlState = {
    visited: new Set<string>(),
    queue: [],
    externalQueue: [],
    queued: new Set<string>(),
    contentHashes: new Set<string>(),
  };

  // Phase 0: Fetch and process homepage (throwOnError=true so original error propagates)
  onProgress?.('Fetching homepage...', 0);
  const homepageHtml = await doFetch(homepageUrl, true, opts.stealth);
  if (!homepageHtml) {
    throw new Error(`Failed to fetch homepage: ${homepageUrl}`);
  }

  const homepage = extractPageContent(homepageHtml, homepageUrl, baseDomain);
  const homepageHash = hashContent(homepage.bodyText);

  pages.push(homepage);
  state.visited.add(homepageUrl);
  state.contentHashes.add(homepageHash);

  // Parse homepage HTML again for business name extraction
  const homepage$ = cheerio.load(homepageHtml);
  const businessName = extractBusinessName(homepage, homepage$, homepageUrl);

  // Extract language from <html lang="xx"> attribute
  const htmlLang = homepage$('html').attr('lang')?.split('-')[0];

  // Categorize links from homepage (product/service URLs get priority)
  for (const link of homepage.links) {
    if (state.visited.has(link)) continue;

    if (isExternalUrl(link, baseDomain)) {
      if (opts.followExternalLinks && isValuableExternalDomain(link)) {
        state.externalQueue.push(link);
      }
    } else {
      if (scoreUrl(link) > 0) {
        state.queue.unshift(link);
      } else {
        state.queue.push(link);
      }
    }
  }

  console.log(
    `[Scraper] Homepage: ${state.queue.length} internal, ${state.externalQueue.length} external links`
  );

  // Phase 1: BFS crawl internal pages
  onProgress?.('Discovering internal pages...', pages.length);
  let internalCount = 1; // Homepage counts as 1

  while (state.queue.length > 0 && internalCount < opts.maxInternalPages) {
    const currentUrl = state.queue.shift()!;

    if (state.visited.has(currentUrl)) continue;
    state.visited.add(currentUrl);

    onProgress?.(
      `Scraping ${new URL(currentUrl).pathname}...`,
      pages.length
    );

    await new Promise((resolve) => setTimeout(resolve, CRAWL_DELAY_MS));

    const html = await doFetch(currentUrl, false, opts.stealth);
    if (!html) continue;

    const page = extractPageContent(html, currentUrl, baseDomain);

    // Check for duplicate content
    const contentHash = hashContent(page.bodyText);
    if (state.contentHashes.has(contentHash)) {
      console.log(`Skipping duplicate content: ${currentUrl}`);
      continue;
    }

    // Skip pages with minimal content
    if (page.bodyText.length < 100) continue;

    state.contentHashes.add(contentHash);
    pages.push(page);
    internalCount++;

    // Add new links to queues (product/service URLs get priority)
    for (const link of page.links) {
      if (state.visited.has(link) || state.queued.has(link)) continue;

      if (isExternalUrl(link, baseDomain)) {
        if (
          opts.followExternalLinks &&
          isValuableExternalDomain(link)
        ) {
          state.externalQueue.push(link);
          state.queued.add(link);
        }
      } else {
        if (scoreUrl(link) > 0) {
          state.queue.unshift(link);
        } else {
          state.queue.push(link);
        }
        state.queued.add(link);
      }
    }
  }

  // Phase 2: Crawl external pages (limited)
  if (opts.followExternalLinks && state.externalQueue.length > 0) {
    onProgress?.('Fetching external resources...', pages.length);

    // Dedupe external queue by domain
    const seenExternalDomains = new Set<string>();
    const uniqueExternalUrls: string[] = [];

    for (const extUrl of state.externalQueue) {
      const domain = getDomain(extUrl);
      if (!seenExternalDomains.has(domain)) {
        seenExternalDomains.add(domain);
        uniqueExternalUrls.push(extUrl);
      }
    }

    let externalSuccessCount = 0;
    for (const extUrl of uniqueExternalUrls) {
      if (externalSuccessCount >= opts.maxExternalPages) break;

      if (state.visited.has(extUrl)) continue;
      state.visited.add(extUrl);

      onProgress?.(`Scraping ${getDomain(extUrl)}...`, pages.length);

      await new Promise((resolve) => setTimeout(resolve, CRAWL_DELAY_MS));

      const html = await doFetch(extUrl, false, opts.stealth);
      if (!html) continue;

      const page = extractPageContent(html, extUrl, baseDomain);

      // Check for duplicate content
      const contentHash = hashContent(page.bodyText);
      if (state.contentHashes.has(contentHash)) continue;

      if (page.bodyText.length < 100) continue;

      state.contentHashes.add(contentHash);
      pages.push(page);
      externalSuccessCount++;
    }
  }

  const externalCount = pages.filter((p) => p.isExternal).length;
  console.log(
    `[Scraper] Complete: ${pages.length} pages (${pages.length - externalCount} internal, ${externalCount} external)`
  );

  // Cloudflare Browser Rendering fallback for JS-heavy sites.
  // Triggers when: (a) homepage text is very short (<500 chars), OR
  // (b) BFS yielded only 1 page despite the site having discoverable links.
  // Case (b) catches sites that SSR the homepage but return empty/403 for sub-pages.
  const homepageBodyLen = pages[0]?.bodyText?.length ?? 0;
  const discoveredLinkCount = pages[0]?.links?.length ?? 0;
  const tooLittleText = homepageBodyLen < 500;
  const bfsFailed = pages.length <= 1 && discoveredLinkCount > 3;

  if ((tooLittleText || bfsFailed) && hasCloudflareCreds()) {
    const reason = tooLittleText
      ? `<500 chars on homepage`
      : `only ${pages.length} page(s) despite ${discoveredLinkCount} links`;
    console.log(`[Scraper] Cheerio underperformed (${reason}), upgrading to Cloudflare crawl`);

    const cfResult = await tryCfCrawl(homepageUrl, opts.maxInternalPages, baseDomain, businessName, htmlLang ?? undefined, onProgress);
    if (cfResult) return cfResult;
  }

  // Build combined content
  onProgress?.('Processing content...', pages.length);

  const combinedContent = buildCombinedContent(
    pages,
    businessName,
    baseDomain,
    opts.maxContentChars
  );

  return {
    url: homepageUrl,
    pages,
    combinedContent,
    businessName,
    language: htmlLang,
  };
}

/** Check if Cloudflare Browser Rendering credentials are configured. */
function hasCloudflareCreds(): boolean {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_BROWSER_RENDERING_TOKEN);
}

/** Map a CrawlRecord to a ScrapedPage. */
function cfRecordToPage(record: CrawlRecord, baseDomain: string): ScrapedPage {
  const bodyText = record.markdown ?? '';
  const title = record.metadata.title ?? '';
  const pageUrl = record.url;
  let pageDomain: string;
  try { pageDomain = new URL(pageUrl).hostname; } catch { pageDomain = baseDomain; }
  return {
    url: pageUrl, title, description: '', headings: [], bodyText,
    links: [], isExternal: pageDomain !== baseDomain, domain: pageDomain,
  };
}

/** Attempt Cloudflare crawl and return a ScrapedWebsite, or null on failure. */
async function tryCfCrawl(
  url: string, maxPages: number, baseDomain: string,
  fallbackName: string, htmlLang?: string,
  onProgress?: ProgressCallback,
): Promise<ScrapedWebsite | null> {
  try {
    onProgress?.('Retrying with Cloudflare browser rendering...', 0);
    const cfResult = await crawlSite(url, { limit: maxPages, render: true });
    const completed = cfResult.pages.filter((r) => r.status === 'completed');
    if (completed.length === 0) return null;

    const pages = completed.map((r) => cfRecordToPage(r, baseDomain));
    const homepageTitle = pages[0]?.title ?? '';
    const domainHint = extractFromDomain(url);
    const businessName = extractFromTitle(homepageTitle, domainHint) ?? domainHint ?? fallbackName;
    const combinedContent = buildCombinedContent(pages, businessName, baseDomain, 100_000);

    console.log(`[Scraper] Cloudflare crawl: ${pages.length} pages for ${url}`);
    return { url, pages, combinedContent, businessName, language: htmlLang };
  } catch (err) {
    console.error('[Scraper] Cloudflare crawl failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
