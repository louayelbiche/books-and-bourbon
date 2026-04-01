/**
 * URL Policy: origin-aware URL stripping for bot text responses.
 *
 * Bots can share URLs that match their allowed origins (the site they serve).
 * All other external URLs are stripped from text. URLs in card JSON are
 * handled separately by the card URL policy enforcer.
 */

/**
 * Strip URLs from text that don't match allowed origins.
 * URLs matching allowedOrigins are kept. All others are removed.
 * If no origins provided, all URLs are stripped (backward-compatible default).
 */
export function stripUnauthorizedUrls(text: string, allowedOrigins?: string[]): string {
  return text
    .replace(/(?:https?:\/\/|www\.)\S+/gi, (match) => {
      if (!allowedOrigins || allowedOrigins.length === 0) return '';
      try {
        // Ensure we have a protocol for URL parsing
        const urlStr = match.startsWith('www.') ? `https://${match}` : match;
        const hostname = new URL(urlStr.replace(/[)}\].,;:!?]+$/, '')).hostname;
        if (allowedOrigins.some(o => hostname === o || hostname.endsWith(`.${o}`))) {
          return match; // Keep: matches allowed origin
        }
      } catch { /* invalid URL */ }
      return '';
    })
    .replace(/ {2,}/g, ' ')
    .replace(/\n /g, '\n')
    .trim();
}

/**
 * @deprecated Use `stripUnauthorizedUrls()` instead for origin-aware stripping.
 * Strip ALL URLs from bot text responses.
 */
export function stripTextUrls(text: string): string {
  return stripUnauthorizedUrls(text);
}
