import { ScrapedWebsite } from '@runwell/pidgie-core/scraper';

/**
 * Factory for creating website scraping API route handlers.
 *
 * Provides the common flow: validate → SSRF check → scrape → product hook →
 * session creation → background screenshots → response.
 *
 * Products customize via hooks (afterScrape, createSession, buildResponse).
 */

interface ScrapeHandlerSession {
    id: string;
}
interface ScrapeHandlerSessionStore {
    updateScreenshots(sessionId: string, screenshots: {
        mobile?: string;
        desktop?: string;
    }): void;
}
interface CreateScrapeHandlerOptions {
    sessionStore: ScrapeHandlerSessionStore;
    /**
     * Hook called after scraping, before session creation.
     * Products use this for product extraction, mock enrichment, cache checks, etc.
     * Return null to use default session creation, or return a custom result.
     */
    afterScrape?: (website: ScrapedWebsite, normalizedUrl: string) => Promise<Record<string, unknown>>;
    /**
     * Create a session from scraped data + any afterScrape extras.
     * Must return an object with at least { id: string }.
     */
    createSession: (website: ScrapedWebsite, extras: Record<string, unknown>) => ScrapeHandlerSession;
    /**
     * Build the JSON response body from session + extras.
     */
    buildResponse: (session: ScrapeHandlerSession, website: ScrapedWebsite, extras: Record<string, unknown>, meta: {
        scrapeDuration: number;
    }) => Record<string, unknown>;
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
    afterScreenshots?: (website: ScrapedWebsite, scrapeDuration: number) => Promise<void>;
    /**
     * Rate limit: max requests per minute per IP (default: 5, 0 = no limit).
     */
    rateLimit?: number;
}
declare function createScrapeHandler(options: CreateScrapeHandlerOptions): (request: Request) => Promise<Response>;

export { type CreateScrapeHandlerOptions, type ScrapeHandlerSession, type ScrapeHandlerSessionStore, createScrapeHandler };
