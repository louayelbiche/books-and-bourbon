/**
 * SSRF protection utilities for demo scraping endpoints.
 *
 * Blocks requests to internal/private IPs, localhost, cloud metadata endpoints,
 * and internal domains. Also strips credentials from URLs.
 */
/**
 * Check if a URL targets a blocked internal/private address.
 * Returns true if the URL should be blocked.
 */
declare function isBlockedUrl(urlString: string): boolean;
/**
 * Strip credentials (username/password) from a URL.
 */
declare function sanitizeUrl(urlString: string): string;
/**
 * Check if a site allows iframe embedding via X-Frame-Options / CSP headers.
 * Returns true if embedding is likely allowed.
 */
declare function checkIframeAllowed(url: string): Promise<boolean>;

export { checkIframeAllowed, isBlockedUrl, sanitizeUrl };
