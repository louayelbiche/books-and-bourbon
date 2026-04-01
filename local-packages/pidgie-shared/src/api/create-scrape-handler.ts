/**
 * Factory for creating website scraping API route handlers.
 *
 * Provides the common flow: validate → SSRF check → scrape → product hook →
 * session creation → background screenshots → response.
 *
 * Products customize via hooks (afterScrape, createSession, buildResponse).
 */

import { scrapeWebsite, normalizeUrl, resolveCanonicalUrl } from '@runwell/pidgie-core/scraper';
import type { ScrapedWebsite } from '@runwell/pidgie-core/scraper';
import { captureScreenshots } from '@runwell/pidgie-core/screenshot';
import { isBlockedUrl, sanitizeUrl, checkIframeAllowed } from './ssrf.js';
import { createLogger, logError } from '@runwell/logger';

const scrapeLogger = createLogger('scrape-handler');

export interface ScrapeHandlerSession {
  id: string;
}

export interface ScrapeHandlerSessionStore {
  updateScreenshots(
    sessionId: string,
    screenshots: { mobile?: string; desktop?: string }
  ): void;
}

export interface CreateScrapeHandlerOptions {
  sessionStore: ScrapeHandlerSessionStore;
  /**
   * Hook called after scraping, before session creation.
   * Products use this for product extraction, mock enrichment, cache checks, etc.
   * Return null to use default session creation, or return a custom result.
   */
  afterScrape?: (
    website: ScrapedWebsite,
    normalizedUrl: string
  ) => Promise<Record<string, unknown>>;
  /**
   * Create a session from scraped data + any afterScrape extras.
   * Must return an object with at least { id: string }.
   */
  createSession: (
    website: ScrapedWebsite,
    extras: Record<string, unknown>
  ) => ScrapeHandlerSession;
  /**
   * Build the JSON response body from session + extras.
   */
  buildResponse: (
    session: ScrapeHandlerSession,
    website: ScrapedWebsite,
    extras: Record<string, unknown>,
    meta: { scrapeDuration: number }
  ) => Record<string, unknown>;
  /**
   * Whether to check iframe embedding (default: false).
   * Shopimate needs this; pidgie-demo doesn't.
   */
  checkIframe?: boolean;
  /**
   * Custom error message prefix for invalid URLs (default: "Invalid URL format.")
   */
  invalidUrlMessage?: string;
  /**
   * Optional pre-scrape hook -- for cache checks, forceRefresh, etc.
   * If this returns a Response, it's sent directly (cache hit).
   */
  preScrape?: (normalizedUrl: string, body: Record<string, unknown>) => Promise<Response | null>;
  /**
   * Optional post-screenshot hook -- for cache storage, etc.
   */
  afterScreenshots?: (
    website: ScrapedWebsite,
    scrapeDuration: number
  ) => Promise<void>;
  /**
   * Rate limit: max requests per minute per IP (default: 5, 0 = no limit).
   */
  rateLimit?: number;
}

export function createScrapeHandler(options: CreateScrapeHandlerOptions) {
  const {
    sessionStore,
    afterScrape,
    createSession,
    buildResponse,
    checkIframe = false,
    invalidUrlMessage = 'Invalid URL format. Please enter a valid website URL.',
    preScrape,
    afterScreenshots,
    rateLimit = 5,
  } = options;

  // IP-based rate limiter
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  return async function POST(request: Request): Promise<Response> {
    try {
      // Rate limiting
      if (rateLimit > 0) {
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const now = Date.now();
        const entry = rateLimitMap.get(clientIp);
        if (!entry || now > entry.resetAt) {
          rateLimitMap.set(clientIp, { count: 1, resetAt: now + 60_000 });
        } else if (entry.count >= rateLimit) {
          return Response.json({ error: 'Too many requests. Please wait a moment.', code: 'RATE_LIMITED' }, { status: 429 });
        } else {
          entry.count++;
        }
      }

      const body = await request.json();
      const { url } = body;

      if (!url || typeof url !== 'string') {
        return Response.json({ error: 'URL is required' }, { status: 400 });
      }

      // Normalize and validate URL
      let normalizedUrl: string;
      try {
        const result = normalizeUrl(url);
        if (!result) {
          return Response.json({ error: invalidUrlMessage }, { status: 400 });
        }
        normalizedUrl = result;
      } catch {
        return Response.json({ error: invalidUrlMessage }, { status: 400 });
      }

      // SSRF protection
      if (isBlockedUrl(normalizedUrl)) {
        return Response.json({ error: invalidUrlMessage }, { status: 400 });
      }

      // Strip credentials and resolve canonical URL (follows redirects, tries www)
      normalizedUrl = sanitizeUrl(normalizedUrl);
      normalizedUrl = await resolveCanonicalUrl(normalizedUrl);

      // Pre-scrape hook (cache checks, etc.)
      if (preScrape) {
        const cached = await preScrape(normalizedUrl, body);
        if (cached) return cached;
      }

      // Scrape website
      const startTime = Date.now();
      const website = await scrapeWebsite(normalizedUrl);
      const scrapeDuration = Date.now() - startTime;

      if (website.pages.length === 0) {
        return Response.json(
          { error: 'Could not scrape any content from this website.' },
          { status: 400 }
        );
      }

      // After-scrape hook (product extraction, iframe check, etc.)
      let extras: Record<string, unknown> = {};
      if (afterScrape) {
        extras = await afterScrape(website, normalizedUrl);
      }

      // Optional iframe check
      if (checkIframe) {
        const allowsIframe = await checkIframeAllowed(normalizedUrl);
        extras.allowsIframe = allowsIframe;
      }

      // Create session
      const session = createSession(website, extras);

      // Background screenshots
      captureScreenshots({
        url: website.url,
        sessionId: session.id,
      }).then((screenshots) => {
        sessionStore.updateScreenshots(session.id, {
          mobile: screenshots.mobile ?? undefined,
          desktop: screenshots.desktop ?? undefined,
        });
      }).catch((err) => scrapeLogger.error('Screenshot failed', logError(err)));

      // Post-screenshot hook
      if (afterScreenshots) {
        afterScreenshots(website, scrapeDuration).catch((err) =>
          scrapeLogger.error('afterScreenshots error', logError(err))
        );
      }

      // Build response
      const responseBody = buildResponse(session, website, extras, { scrapeDuration });

      return Response.json({ success: true, ...responseBody });
    } catch (error) {
      scrapeLogger.error('Scrape handler error', logError(error));
      const message = error instanceof Error ? error.message : '';
      if (message.includes('timeout') || message.includes('TIMEOUT') || message.includes('ETIMEDOUT')) {
        return Response.json(
          { error: 'The site took too long to respond. Please try again.' },
          { status: 504 }
        );
      }
      if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
        return Response.json(
          { error: 'Could not reach this website. Please check the URL and try again.' },
          { status: 400 }
        );
      }
      return Response.json(
        { error: 'Failed to scrape website. Please check the URL and try again.' },
        { status: 500 }
      );
    }
  };
}
