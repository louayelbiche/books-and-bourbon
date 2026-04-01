/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * Utilities to prevent SSRF attacks when fetching external URLs.
 * Blocks requests to internal networks, localhost, and metadata endpoints.
 * Includes DNS rebinding protection via resolveAndCheckIp().
 */

import { lookup } from 'dns/promises';

/**
 * Check if a URL should be blocked for SSRF protection
 *
 * Blocks:
 * - localhost (127.x.x.x, ::1, 0.0.0.0)
 * - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
 * - Link-local addresses (169.254.x.x)
 * - IPv6 ULA (fc00::/7), link-local (fe80::/10)
 * - IPv4-mapped IPv6 (::ffff:private)
 * - AWS/cloud metadata endpoints (169.254.169.254)
 * - Internal hostnames (.internal, .local, .localhost, .localdomain)
 * - Non-HTTP protocols
 *
 * @param urlString - URL to validate
 * @returns true if URL should be blocked, false if safe
 */
export function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const protocol = url.protocol;

    // Only allow http and https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return true;
    }

    // Block localhost variants
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0'
    ) {
      return true;
    }

    // Check for IP addresses
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Block loopback (127.x.x.x)
      if (a === 127) {
        return true;
      }

      // Block private class A (10.x.x.x)
      if (a === 10) {
        return true;
      }

      // Block private class B (172.16.x.x - 172.31.x.x)
      if (a === 172 && b >= 16 && b <= 31) {
        return true;
      }

      // Block private class C (192.168.x.x)
      if (a === 192 && b === 168) {
        return true;
      }

      // Block link-local (169.254.x.x) - includes AWS metadata
      if (a === 169 && b === 254) {
        return true;
      }

      // Block broadcast
      if (a === 255 || (a === 0 && b === 0 && c === 0 && d === 0)) {
        return true;
      }
    }

    // Block private IPv6 ranges
    const bareHost = hostname.replace(/^\[|\]$/g, '');
    if (bareHost.startsWith('fd') || bareHost.startsWith('fc')) return true; // ULA (private)
    if (bareHost.startsWith('fe80')) return true; // Link-local
    if (bareHost.startsWith('::ffff:')) {
      // IPv4-mapped IPv6 — extract and check the mapped IPv4
      const mapped = bareHost.slice(7);

      // Dotted decimal form: ::ffff:10.0.0.1
      const mappedMatch = mapped.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
      if (mappedMatch) {
        const [, ma, mb] = mappedMatch.map(Number);
        if (
          ma === 10 || ma === 127 ||
          (ma === 172 && mb >= 16 && mb <= 31) ||
          (ma === 192 && mb === 168) ||
          (ma === 169 && mb === 254)
        ) {
          return true;
        }
      }

      // Hex form (URL parser converts dotted to hex): ::ffff:a00:1 = 10.0.0.1
      // Parse the last 32 bits as IPv4
      const hexMatch = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
      if (hexMatch) {
        const high = parseInt(hexMatch[1], 16);
        const low = parseInt(hexMatch[2], 16);
        const ma = (high >> 8) & 0xff;
        const mb = high & 0xff;
        if (
          ma === 10 || ma === 127 ||
          (ma === 172 && mb >= 16 && mb <= 31) ||
          (ma === 192 && mb === 168) ||
          (ma === 169 && mb === 254) ||
          ma === 0 || ma === 255
        ) {
          return true;
        }
      }
    }

    // Block internal hostnames
    if (
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.localdomain')
    ) {
      return true;
    }

    // Block common metadata endpoints
    const metadataHosts = [
      'metadata.google.internal',
      'metadata.google.com',
      'metadata',
    ];
    if (metadataHosts.includes(hostname)) {
      return true;
    }

    return false;
  } catch {
    // Invalid URL - block it
    return true;
  }
}

/**
 * Sanitize a URL by removing credentials and normalizing
 *
 * @param urlString - URL to sanitize
 * @returns Sanitized URL string
 */
export function sanitizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    // Remove credentials
    url.username = '';
    url.password = '';

    // Normalize
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * Validate and sanitize a URL for external fetching
 *
 * @param urlString - URL to validate
 * @returns Object with validation result and sanitized URL
 */
export function validateExternalUrl(urlString: string): {
  valid: boolean;
  url: string;
  error?: string;
} {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, url: '', error: 'URL is required' };
  }

  // Try to parse and normalize
  let normalizedUrl: string;
  try {
    // Add protocol if missing
    let input = urlString;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'https://' + input;
    }
    normalizedUrl = new URL(input).toString();
  } catch {
    return { valid: false, url: '', error: 'Invalid URL format' };
  }

  // Check for blocked URLs
  if (isBlockedUrl(normalizedUrl)) {
    return { valid: false, url: '', error: 'URL not allowed' };
  }

  // Sanitize and return
  return {
    valid: true,
    url: sanitizeUrl(normalizedUrl),
  };
}

/**
 * Resolve hostname DNS and check if the resolved IP is blocked.
 * Prevents DNS rebinding attacks where a public hostname resolves
 * to a private/internal IP address.
 *
 * @param urlString - URL to resolve and check
 * @returns true if the resolved IP is blocked, false if safe
 */
export async function isResolvedIpBlocked(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    // Skip DNS check for raw IP addresses (already checked by isBlockedUrl)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) {
      return false;
    }

    const { address, family } = await lookup(hostname);

    // Format IP correctly for URL: IPv6 needs brackets
    const formattedIp = family === 6 ? `[${address}]` : address;
    return isBlockedUrl(`${url.protocol}//${formattedIp}/`);
  } catch {
    // DNS resolution failed — block the request
    return true;
  }
}
