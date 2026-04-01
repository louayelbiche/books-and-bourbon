/**
 * HTTP Client for the Python scraper microservice.
 *
 * Provides functions to call the Python FastAPI service at SCRAPER_SERVICE_URL.
 * Used by the smart fallback wrapper in scraper.ts.
 */

import type { ScraperOptions, ScrapedWebsite, SitePreview } from './types.js';

/** Health state tracker for the Python service */
interface HealthState {
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

const HEALTH_CACHE_MS = 60_000; // Cache health check for 60s
const HEALTH_TIMEOUT_MS = 5_000;
const SCRAPE_TIMEOUT_MS = 60_000;
const PREVIEW_TIMEOUT_MS = 10_000;

const healthState: HealthState = {
  healthy: true,
  lastCheck: 0,
  consecutiveFailures: 0,
};

/**
 * Get the scraper service URL from environment.
 * Returns null if not configured (dev mode).
 */
export function getServiceUrl(): string | null {
  return process.env.SCRAPER_SERVICE_URL || null;
}

/**
 * Check the Python service health.
 * Result is cached for 60 seconds.
 */
export async function checkServiceHealth(): Promise<boolean> {
  const serviceUrl = getServiceUrl();
  if (!serviceUrl) return false;

  const now = Date.now();
  if (now - healthState.lastCheck < HEALTH_CACHE_MS) {
    return healthState.healthy;
  }

  try {
    const response = await fetch(`${serviceUrl}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    healthState.lastCheck = now;

    if (response.ok) {
      if (!healthState.healthy) {
        console.log('[Scraper] Python service recovered');
      }
      healthState.healthy = true;
      healthState.consecutiveFailures = 0;
      return true;
    }

    healthState.healthy = false;
    return false;
  } catch {
    healthState.lastCheck = now;
    healthState.healthy = false;
    return false;
  }
}

/**
 * Record a service failure. Returns the new consecutive failure count.
 */
export function recordFailure(): number {
  healthState.consecutiveFailures++;
  if (healthState.consecutiveFailures >= 3) {
    healthState.healthy = false;
  }
  return healthState.consecutiveFailures;
}

/**
 * Get the current health state (for logging/alerting).
 */
export function getHealthState(): Readonly<HealthState> {
  return { ...healthState };
}

/**
 * Scrape a website via the Python service.
 */
export async function scrapeViaService(
  url: string,
  options?: Partial<ScraperOptions>,
): Promise<ScrapedWebsite> {
  const serviceUrl = getServiceUrl();
  if (!serviceUrl) {
    throw new Error('SCRAPER_SERVICE_URL not configured');
  }

  const response = await fetch(`${serviceUrl}/api/v1/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, options }),
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Scraper service error ${response.status}: ${text}`);
  }

  return response.json() as Promise<ScrapedWebsite>;
}

/**
 * Fetch site preview via the Python service.
 */
export async function previewViaService(url: string): Promise<SitePreview> {
  const serviceUrl = getServiceUrl();
  if (!serviceUrl) {
    throw new Error('SCRAPER_SERVICE_URL not configured');
  }

  const response = await fetch(`${serviceUrl}/api/v1/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Preview service error ${response.status}: ${text}`);
  }

  return response.json() as Promise<SitePreview>;
}
