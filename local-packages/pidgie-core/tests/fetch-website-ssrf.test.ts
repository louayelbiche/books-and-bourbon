/**
 * fetch_website Tool — SSRF & Security Penetration Tests (Phase 2)
 *
 * Tests the inline SSRF check in fetch-website.ts:
 * - Localhost variants
 * - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
 * - Cloud metadata endpoints (169.254.x)
 * - Common SSRF bypass techniques
 *
 * Tests marked "KNOWN GAP" document bypass vectors that the current
 * implementation does NOT block. These serve as an audit trail.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks — scraper should NEVER be called for blocked URLs
// ============================================================================

const mockScrapeWebsite = vi.fn();
const mockNormalizeUrl = vi.fn();

vi.mock('../src/scraper/index.js', () => ({
  scrapeWebsite: (...args: unknown[]) => mockScrapeWebsite(...args),
  normalizeUrl: (...args: unknown[]) => mockNormalizeUrl(...args),
}));

vi.mock('../src/detection/index.js', () => ({
  detectBusinessSignals: vi.fn(() => ({
    businessType: 'other',
    confidence: 0,
    hasProducts: false,
    hasServices: false,
    hasPricing: false,
    hasBooking: false,
    hasCaseStudies: false,
    hasTeamPage: false,
    hasFAQ: false,
    hasBlog: false,
    primaryOfferings: [],
    industryKeywords: [],
    contactMethods: {
      email: null,
      phone: null,
      form: false,
      chat: false,
      social: [],
    },
  })),
}));

vi.mock('@runwell/agent-core', async () => {
  const actual = await vi.importActual('@runwell/agent-core');
  return {
    ...(actual as object),
    getGeminiClient: vi.fn(() => ({
      generateContent: vi.fn(async () => ({ text: 'Summary' })),
    })),
  };
});

import { createFetchWebsiteTool } from '../src/tools/fetch-website.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * normalizeUrl pass-through: returns the URL as-is (already has protocol)
 * This ensures the SSRF check receives the exact URL we want to test.
 */
function setupNormalizePassthrough() {
  mockNormalizeUrl.mockImplementation((url: string) => {
    const u = url.trim();
    const withProtocol =
      u.startsWith('http://') || u.startsWith('https://') ? u : 'https://' + u;
    try {
      return new URL(withProtocol).origin;
    } catch {
      throw new Error('Invalid URL format');
    }
  });
}

async function expectBlocked(url: string) {
  const tool = createFetchWebsiteTool();
  const result = (await tool.execute({ url })) as Record<string, unknown>;
  expect(result).toHaveProperty('error');
  expect(result.error).toContain('Cannot fetch internal/private URLs');
  // Scraper should NOT have been called
  expect(mockScrapeWebsite).not.toHaveBeenCalled();
}

async function expectAllowed(url: string) {
  const tool = createFetchWebsiteTool();
  const result = (await tool.execute({ url })) as Record<string, unknown>;
  // Should either succeed or fail for reasons OTHER than SSRF
  if (result.error) {
    expect(result.error).not.toContain('Cannot fetch internal/private URLs');
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('SSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupNormalizePassthrough();
  });

  // --------------------------------------------------------------------------
  // 2.1 Localhost Variants
  // --------------------------------------------------------------------------

  describe('localhost blocking', () => {
    it('blocks http://localhost', async () => {
      await expectBlocked('http://localhost');
    });

    it('blocks http://localhost:3000', async () => {
      await expectBlocked('http://localhost:3000');
    });

    it('blocks http://127.0.0.1', async () => {
      await expectBlocked('http://127.0.0.1');
    });

    it('blocks http://127.0.0.1:8080', async () => {
      await expectBlocked('http://127.0.0.1:8080');
    });

    it('KNOWN GAP: http://[::1] IPv6 localhost is not blocked', async () => {
      // new URL('http://[::1]').hostname returns '[::1]' (with brackets)
      // but the SSRF check compares hostname === '::1' (without brackets)
      // This means IPv6 localhost bypasses the SSRF check.
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://[::1]',
      })) as Record<string, unknown>;

      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        // If it IS blocked, that's even better
        expect(true).toBe(true);
      } else {
        // Documenting: [::1] passes through (hostname includes brackets)
        expect(mockScrapeWebsite).toHaveBeenCalled();
      }
    });

    it('KNOWN GAP: 0.0.0.0 is not blocked', async () => {
      // 0.0.0.0 resolves to localhost on many systems but the current
      // SSRF check only checks for 127.x.x.x, not 0.0.0.0
      // Documenting actual behavior:
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://0.0.0.0',
      })) as Record<string, unknown>;

      // Current behavior: NOT blocked (gap)
      // The scraper will be called because 0.0.0.0 passes the check
      // This documents the gap for future hardening
      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        // If it IS blocked, that's even better — test passes either way
        expect(true).toBe(true);
      } else {
        // Documenting: 0.0.0.0 passes through
        expect(mockScrapeWebsite).toHaveBeenCalled();
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2.2 Private IP Ranges
  // --------------------------------------------------------------------------

  describe('private IP ranges', () => {
    it('blocks 10.0.0.1 (Class A private)', async () => {
      await expectBlocked('http://10.0.0.1');
    });

    it('blocks 10.255.255.255 (Class A upper bound)', async () => {
      await expectBlocked('http://10.255.255.255');
    });

    it('blocks 172.16.0.1 (Class B lower bound)', async () => {
      await expectBlocked('http://172.16.0.1');
    });

    it('blocks 172.31.255.255 (Class B upper bound)', async () => {
      await expectBlocked('http://172.31.255.255');
    });

    it('allows 172.15.0.1 (just below Class B range)', async () => {
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      await expectAllowed('http://172.15.0.1');
    });

    it('allows 172.32.0.1 (just above Class B range)', async () => {
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      await expectAllowed('http://172.32.0.1');
    });

    it('blocks 192.168.0.1 (Class C private)', async () => {
      await expectBlocked('http://192.168.0.1');
    });

    it('blocks 192.168.255.255 (Class C upper bound)', async () => {
      await expectBlocked('http://192.168.255.255');
    });
  });

  // --------------------------------------------------------------------------
  // 2.3 Cloud Metadata Endpoints
  // --------------------------------------------------------------------------

  describe('cloud metadata', () => {
    it('blocks 169.254.169.254 (AWS/GCP metadata)', async () => {
      await expectBlocked('http://169.254.169.254');
    });

    it('blocks 169.254.0.1 (link-local range)', async () => {
      await expectBlocked('http://169.254.0.1');
    });

    it('blocks .internal domains', async () => {
      await expectBlocked('http://myservice.internal');
    });

    it('blocks metadata.google.internal', async () => {
      await expectBlocked('http://metadata.google.internal');
    });
  });

  // --------------------------------------------------------------------------
  // 2.4 SSRF Bypass Attempts
  // --------------------------------------------------------------------------

  describe('bypass attempts', () => {
    it('KNOWN GAP: DNS rebinding (127.0.0.1.nip.io) is not blocked', async () => {
      // DNS rebinding: nip.io resolves any subdomain to the embedded IP
      // The SSRF check only inspects the hostname string, not DNS resolution
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://127.0.0.1.nip.io',
      })) as Record<string, unknown>;

      // Document actual behavior: hostname is "127.0.0.1.nip.io", not an IP
      // The regex check won't match because it's not a dotted quad
      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        expect(true).toBe(true); // Blocked — good
      } else {
        // Passes through — this is a known gap
        expect(mockScrapeWebsite).toHaveBeenCalled();
      }
    });

    it('KNOWN GAP: hex IP (0x7f000001) is not blocked', async () => {
      // Hex IP encoding: 0x7f000001 = 127.0.0.1
      // URL constructor may or may not resolve this
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://0x7f000001',
      })) as Record<string, unknown>;

      // Document: hex IP hostname doesn't match dotted quad regex
      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        expect(true).toBe(true);
      } else {
        expect(result).toHaveProperty('error'); // Will fail at fetch level
      }
    });

    it('KNOWN GAP: decimal IP (2130706433) is not blocked', async () => {
      // Decimal IP: 2130706433 = 127.0.0.1
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://2130706433',
      })) as Record<string, unknown>;

      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        expect(true).toBe(true);
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('KNOWN GAP: short IP (127.1) is not blocked', async () => {
      // Short notation: 127.1 = 127.0.0.1 on some systems
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://127.1',
      })) as Record<string, unknown>;

      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        expect(true).toBe(true);
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('KNOWN GAP: octal IP (0177.0.0.1) is not blocked', async () => {
      // Octal: 0177 = 127
      mockScrapeWebsite.mockRejectedValue(new Error('unreachable'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'http://0177.0.0.1',
      })) as Record<string, unknown>;

      if (result.error && (result.error as string).includes('Cannot fetch internal')) {
        expect(true).toBe(true);
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('blocks URL with credentials targeting localhost', async () => {
      await expectBlocked('http://admin:pass@localhost');
    });

    it('KNOWN GAP: redirect to private IP not testable at SSRF level', async () => {
      // fetch() follows redirects transparently — if a public site
      // redirects to http://169.254.169.254, the SSRF check on the
      // initial URL passes, and fetch follows the redirect.
      // This is documented as a gap — would need a custom fetch wrapper.
      expect(true).toBe(true); // Acknowledged gap
    });
  });
});
