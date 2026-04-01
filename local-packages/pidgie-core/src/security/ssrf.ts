/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * Re-exports from @runwell/scraper for backward compatibility.
 * All SSRF protection logic lives in the shared scraper package.
 */
export { isBlockedUrl, sanitizeUrl, validateExternalUrl } from '@runwell/scraper';
