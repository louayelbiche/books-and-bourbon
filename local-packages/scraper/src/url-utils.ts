/**
 * URL Utilities
 *
 * URL manipulation and validation functions for the scraper.
 */

import {
  SKIP_EXTENSIONS,
  SKIP_PATHS,
  SKIP_DOMAINS,
  VALUABLE_EXTERNAL_DOMAINS,
  PRODUCT_URL_PATTERNS,
} from './constants.js';

/**
 * Resolve a relative URL to an absolute URL.
 *
 * @param base - Base URL for resolution
 * @param href - URL to resolve (may be relative)
 * @returns Resolved absolute URL or null if invalid
 */
export function resolveUrl(base: string, href: string): string | null {
  try {
    // Skip non-HTTP protocols
    if (
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('data:') ||
      href.startsWith('#')
    ) {
      return null;
    }

    const resolved = new URL(href, base);

    // Only allow http/https
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }

    // Remove hash and normalize
    resolved.hash = '';
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is external to the base domain.
 *
 * @param url - URL to check
 * @param baseDomain - Base domain to compare against
 * @returns True if the URL is external
 */
export function isExternalUrl(url: string, baseDomain: string): boolean {
  try {
    const urlDomain = new URL(url).hostname.replace(/^www\./, '');
    const base = baseDomain.replace(/^www\./, '');
    return urlDomain !== base;
  } catch {
    return false;
  }
}

/**
 * Check if a URL should be skipped during crawling.
 *
 * @param url - URL to check
 * @returns True if the URL should be skipped
 */
export function shouldSkipUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    // Check file extensions
    for (const ext of SKIP_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return true;
      }
    }

    // Check skip paths
    for (const skipPath of SKIP_PATHS) {
      if (pathname.includes(skipPath)) {
        return true;
      }
    }

    // Check skip domains
    for (const skipDomain of SKIP_DOMAINS) {
      if (hostname.includes(skipDomain)) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Check if an external domain is worth scraping.
 *
 * @param url - URL to check
 * @returns True if the domain is valuable
 */
export function isValuableExternalDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return VALUABLE_EXTERNAL_DOMAINS.some((domain) =>
      hostname.includes(domain)
    );
  } catch {
    return false;
  }
}

/**
 * Extract the domain from a URL.
 *
 * @param url - URL to extract domain from
 * @returns Domain hostname or empty string
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Score a URL for crawl priority based on product/service path patterns.
 * Higher score = should be crawled first.
 *
 * @param url - URL to score
 * @returns Priority score (0 = no match, 1+ = matches product patterns)
 */
/** Contact/about page patterns get highest crawl priority */
const CONTACT_PAGE_PATTERNS = [
  /^\/(contact|about|about-us|location|locations|find-us|hours|directions|reach-us|nous-joindre|a-propos|team|our-team)(\/|$)/i,
];

export function scoreUrl(url: string): number {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    // Contact pages get highest priority (crawled first)
    for (const pattern of CONTACT_PAGE_PATTERNS) {
      if (pattern.test(pathname)) return 100;
    }
    // Product/service pages get medium priority
    for (const pattern of PRODUCT_URL_PATTERNS) {
      if (pathname.includes(pattern)) return 1;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Normalize a user-provided URL to a standard format.
 * Returns null for invalid URLs instead of throwing.
 *
 * @param input - User input URL
 * @returns Normalized URL (full href) or null if invalid
 */
export function normalizeUrl(input: string): string | null {
  let url = input.trim();
  if (!url) return null;

  // Lowercase the protocol for consistent matching
  const lower = url.toLowerCase();

  // Reject non-http protocols explicitly
  if (/^[a-z]+:\/\//i.test(url) && !lower.startsWith('http://') && !lower.startsWith('https://')) {
    return null;
  }

  // Add https:// if no protocol
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Resolve the canonical URL by following redirects and trying common variants.
 *
 * Users often enter bare domains like "skims.com" or "example.com". This function:
 * 1. Follows HTTP redirects to find the final URL (e.g. http -> https, or bare -> www)
 * 2. If the URL fails entirely, tries toggling www (skims.com -> www.skims.com)
 * 3. If https fails, tries http as a last resort
 *
 * Returns the resolved URL or the original if resolution fails.
 * This is a network operation (HEAD request with 8s timeout).
 *
 * @param normalizedUrl - URL already processed by normalizeUrl()
 * @returns The canonical URL after redirect resolution
 */
export async function resolveCanonicalUrl(normalizedUrl: string): Promise<string> {
  const resolved = await _tryHead(normalizedUrl);
  if (resolved) return resolved;

  const toggled = _toggleWww(normalizedUrl);
  if (toggled) {
    const resolvedAlt = await _tryHead(toggled);
    if (resolvedAlt) {
      console.log(`[URL] Resolved ${normalizedUrl} -> ${resolvedAlt} (www toggle)`);
      return resolvedAlt;
    }
  }

  if (normalizedUrl.startsWith('https://')) {
    const httpUrl = normalizedUrl.replace('https://', 'http://');
    const resolvedHttp = await _tryHead(httpUrl);
    if (resolvedHttp) {
      console.log(`[URL] Resolved ${normalizedUrl} -> ${resolvedHttp} (http fallback)`);
      return resolvedHttp;
    }
  }

  return normalizedUrl;
}

function _toggleWww(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    } else {
      parsed.hostname = 'www.' + parsed.hostname;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

async function _tryHead(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return response.url;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Canonicalize a URL so all variants map to a single form.
 *
 * - Forces https://
 * - Strips www. prefix
 * - Lowercases hostname
 * - Removes query string and fragment
 * - Strips paths by default (stripe.com/payments → stripe.com)
 * - Preserves identity paths on multi-tenant platforms (shopify.com/store-a stays)
 *
 * @param input - Raw or already-normalized URL
 * @returns Canonical URL string, or null if invalid
 */

/**
 * Multi-tenant platforms where the URL path identifies a distinct business.
 * Key = hostname (without www.), value = number of path segments that form the store identity.
 *
 * Examples:
 *   shopify.com/store-name       → 1 segment kept
 *   etsy.com/shop/alice          → 2 segments kept
 *   myshopify.com/store-name     → 1 segment kept
 */
const MULTI_TENANT_PATH_SEGMENTS: Record<string, number> = {
  'shopify.com': 1,
  'myshopify.com': 1,
  'etsy.com': 2,           // /shop/{name}
  'ebay.com': 2,           // /str/{name}
  'amazon.com': 2,         // /shops/{name}
  'redbubble.com': 2,      // /people/{name}
  'society6.com': 1,       // /{artist}
  'gumroad.com': 1,        // /{creator}
  'bigcartel.com': 1,      // /{store} (on custom domains, but also paths)
  'faire.com': 2,          // /brand/{name}
};

export function canonicalizeUrl(input: string): string | null {
  const normalized = normalizeUrl(input);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);

    // Force https
    parsed.protocol = 'https:';

    // Strip www.
    parsed.hostname = parsed.hostname.replace(/^www\./, '');

    // Remove query and fragment
    parsed.search = '';
    parsed.hash = '';

    // Determine how many path segments to preserve
    const segmentsToKeep = MULTI_TENANT_PATH_SEGMENTS[parsed.hostname] ?? 0;

    let path: string;
    if (segmentsToKeep === 0) {
      // Default: strip all paths (most business websites)
      path = '/';
    } else {
      // Multi-tenant platform: keep the identity segments
      const segments = parsed.pathname.split('/').filter(Boolean);
      const kept = segments.slice(0, segmentsToKeep);
      path = kept.length > 0 ? '/' + kept.join('/') : '/';
    }

    // Remove trailing slash unless root
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return `${parsed.protocol}//${parsed.hostname}${path}`;
  } catch {
    return null;
  }
}
