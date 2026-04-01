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
export function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const protocol = url.protocol;

    // Only allow http and https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return true;
    }

    // Block localhost variants (including bracketed IPv6 and 0.0.0.0)
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0'
    ) {
      return true;
    }

    // Block private IPv4 ranges
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);
      // 10.x.x.x, 127.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
      if (
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254)
      ) {
        return true;
      }
      // Block broadcast (255.255.255.255) and 0.0.0.0/8
      if (a === 255 || (a === 0 && b === 0 && c === 0 && d === 0)) {
        return true;
      }
    }

    // Block private IPv6 ranges
    // Strip brackets: URL parser gives "[::1]" as hostname for IPv6
    const bareHost = hostname.replace(/^\[|\]$/g, '');
    if (bareHost.startsWith('fd') || bareHost.startsWith('fc')) return true; // ULA (private)
    if (bareHost.startsWith('fe80')) return true; // Link-local
    if (bareHost.startsWith('::ffff:')) {
      // IPv4-mapped IPv6: extract and check the mapped IPv4
      const mapped = bareHost.slice(7); // after "::ffff:"
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

    // Block metadata endpoints
    if (hostname === '169.254.169.254') {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Strip credentials (username/password) from a URL.
 */
export function sanitizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * Check if a site allows iframe embedding via X-Frame-Options / CSP headers.
 * Returns true if embedding is likely allowed.
 */
export async function checkIframeAllowed(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    // Check X-Frame-Options
    const xfo = res.headers.get('x-frame-options')?.toLowerCase();
    if (xfo === 'deny' || xfo === 'sameorigin') {
      return false;
    }

    // Check Content-Security-Policy frame-ancestors
    const csp = res.headers.get('content-security-policy')?.toLowerCase() || '';
    if (csp.includes('frame-ancestors')) {
      const match = csp.match(/frame-ancestors\s+([^;]+)/);
      if (match) {
        const value = match[1].trim();
        if (value === "'none'" || value === "'self'" || !value.includes('*')) {
          return false;
        }
      }
    }

    return true;
  } catch {
    // If HEAD fails, assume iframe might work (will fallback client-side anyway)
    return true;
  }
}
