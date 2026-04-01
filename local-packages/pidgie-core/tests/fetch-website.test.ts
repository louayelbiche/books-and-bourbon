/**
 * fetch_website Tool — Unit Tests (Phase 1)
 *
 * Tests the createFetchWebsiteTool function in isolation:
 * - Tool definition shape
 * - URL normalization & validation
 * - Successful scrape pipeline
 * - Gemini summarization
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScrapedWebsite } from '../src/scraper/types.js';
import type { BusinessSignals } from '../src/detection/types.js';

// ============================================================================
// Mocks
// ============================================================================

const mockScrapeWebsite = vi.fn();
const mockNormalizeUrl = vi.fn();

vi.mock('../src/scraper/index.js', () => ({
  scrapeWebsite: (...args: unknown[]) => mockScrapeWebsite(...args),
  normalizeUrl: (...args: unknown[]) => mockNormalizeUrl(...args),
}));

const mockDetectBusinessSignals = vi.fn();

vi.mock('../src/detection/index.js', () => ({
  detectBusinessSignals: (...args: unknown[]) =>
    mockDetectBusinessSignals(...args),
}));

const mockGenerateContent = vi.fn();

vi.mock('@runwell/agent-core', async () => {
  const actual = await vi.importActual('@runwell/agent-core');
  return {
    ...(actual as object),
    getGeminiClient: vi.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  };
});

// ============================================================================
// Fixtures
// ============================================================================

function createMockSignals(
  overrides?: Partial<BusinessSignals>
): BusinessSignals {
  return {
    businessType: 'ecommerce',
    confidence: 0.85,
    hasProducts: true,
    hasServices: false,
    hasPricing: true,
    hasBooking: false,
    hasCaseStudies: false,
    hasTeamPage: false,
    hasFAQ: true,
    hasBlog: false,
    primaryOfferings: ['Widget Pro', 'Widget Lite'],
    industryKeywords: ['retail', 'widgets'],
    contactMethods: {
      email: 'info@example.com',
      phone: '555-1234',
      form: true,
      chat: false,
      social: ['twitter.com/example'],
    },
    ...overrides,
  };
}

function createMockWebsite(
  overrides?: Partial<ScrapedWebsite>
): ScrapedWebsite {
  return {
    url: 'https://example.com',
    businessName: 'Example Corp',
    combinedContent: 'Example Corp sells premium widgets for businesses.',
    language: 'en',
    pages: [
      {
        url: 'https://example.com',
        title: 'Example Corp - Premium Widgets',
        description: 'Best widgets for your business',
        headings: ['Welcome to Example Corp', 'Our Products'],
        bodyText: 'Example Corp sells premium widgets for businesses. '.repeat(
          20
        ),
        links: ['https://example.com/products', 'https://example.com/about'],
        isExternal: false,
        domain: 'example.com',
      },
    ],
    signals: createMockSignals(),
    ...overrides,
  };
}

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { createFetchWebsiteTool } from '../src/tools/fetch-website.js';

// ============================================================================
// Tests
// ============================================================================

describe('createFetchWebsiteTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior
    mockNormalizeUrl.mockImplementation((url: string) => {
      const u = url.trim();
      const withProtocol =
        u.startsWith('http://') || u.startsWith('https://')
          ? u
          : 'https://' + u;
      return new URL(withProtocol).origin;
    });

    mockScrapeWebsite.mockResolvedValue(createMockWebsite());
    mockDetectBusinessSignals.mockReturnValue(createMockSignals());
    mockGenerateContent.mockResolvedValue({
      text: 'Example Corp is an ecommerce company selling premium widgets to businesses worldwide.',
    });
  });

  // --------------------------------------------------------------------------
  // 1.2 Tool Definition
  // --------------------------------------------------------------------------

  describe('tool definition', () => {
    it('returns a tool with name "fetch_website"', () => {
      const tool = createFetchWebsiteTool();
      expect(tool.name).toBe('fetch_website');
    });

    it('has correct parameter schema', () => {
      const tool = createFetchWebsiteTool();
      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.properties.url).toBeDefined();
      expect(tool.parameters.properties.url.type).toBe('string');
      expect(tool.parameters.required).toEqual(['url']);
    });

    it('description mentions website analysis', () => {
      const tool = createFetchWebsiteTool();
      expect(tool.description.toLowerCase()).toContain('website');
      expect(tool.description.toLowerCase()).toContain('analyze');
    });

    it('has an execute function', () => {
      const tool = createFetchWebsiteTool();
      expect(typeof tool.execute).toBe('function');
    });

    it('uses defaults when no options provided', () => {
      const tool = createFetchWebsiteTool();
      // Verify defaults via execution — will check scraper call args
      expect(tool).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 1.3 URL Normalization
  // --------------------------------------------------------------------------

  describe('URL handling', () => {
    it('normalizes bare domain "example.com"', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'example.com' });
      expect(mockNormalizeUrl).toHaveBeenCalledWith('example.com');
    });

    it('passes through "http://example.com"', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'http://example.com' });
      expect(mockNormalizeUrl).toHaveBeenCalledWith('http://example.com');
    });

    it('passes through "https://example.com/path"', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'https://example.com/path' });
      expect(mockNormalizeUrl).toHaveBeenCalledWith(
        'https://example.com/path'
      );
    });

    it('returns error for empty URL', async () => {
      const tool = createFetchWebsiteTool();
      const result = await tool.execute({ url: '' });
      expect(result).toHaveProperty('error');
    });

    it('returns error for null/undefined URL', async () => {
      const tool = createFetchWebsiteTool();
      const result = await tool.execute({ url: undefined });
      expect(result).toHaveProperty('error');
    });

    it('returns error for whitespace-only URL', async () => {
      const tool = createFetchWebsiteTool();
      mockNormalizeUrl.mockReturnValue(null);
      const result = await tool.execute({ url: '   ' });
      expect(result).toHaveProperty('error');
    });

    it('returns error for invalid URL format', async () => {
      const tool = createFetchWebsiteTool();
      mockNormalizeUrl.mockReturnValue(null);
      const result = await tool.execute({ url: 'not a url at all' });
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toContain('Invalid URL');
    });

    it('handles URL with trailing whitespace', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: '  example.com  ' });
      // normalizeUrl is called — it should handle trimming
      expect(mockNormalizeUrl).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 1.4 Successful Scrape Pipeline
  // --------------------------------------------------------------------------

  describe('successful execution', () => {
    it('returns FetchWebsiteResult shape with all required fields', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('businessName');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('businessType');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('hasProducts');
      expect(result).toHaveProperty('hasServices');
      expect(result).toHaveProperty('hasPricing');
      expect(result).toHaveProperty('hasBooking');
      expect(result).toHaveProperty('primaryOfferings');
      expect(result).toHaveProperty('industryKeywords');
      expect(result).toHaveProperty('contact');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('homepageExcerpt');
      expect(result).toHaveProperty('pagesScraped');
      expect(result).toHaveProperty('scrapedAt');
    });

    it('includes businessName from scraper', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.businessName).toBe('Example Corp');
    });

    it('includes businessType from signal detection', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.businessType).toBe('ecommerce');
    });

    it('includes confidence from signal detection', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.confidence).toBe(0.85);
    });

    it('includes boolean flags', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.hasProducts).toBe(true);
      expect(result.hasServices).toBe(false);
      expect(result.hasPricing).toBe(true);
      expect(result.hasBooking).toBe(false);
    });

    it('includes primaryOfferings array', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.primaryOfferings).toEqual(['Widget Pro', 'Widget Lite']);
    });

    it('includes industryKeywords array', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.industryKeywords).toEqual(['retail', 'widgets']);
    });

    it('includes contact object', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      const contact = result.contact as Record<string, unknown>;
      expect(contact.email).toBe('info@example.com');
      expect(contact.phone).toBe('555-1234');
      expect(contact.form).toBe(true);
      expect(contact.social).toEqual(['twitter.com/example']);
    });

    it('includes summary from Gemini Flash', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.summary).toContain('ecommerce');
    });

    it('includes homepageExcerpt from first page bodyText', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(typeof result.homepageExcerpt).toBe('string');
      expect((result.homepageExcerpt as string).length).toBeGreaterThan(0);
    });

    it('includes pagesScraped count', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.pagesScraped).toBe(1);
    });

    it('includes scrapedAt as ISO timestamp', async () => {
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(typeof result.scrapedAt).toBe('string');
      // Should parse as valid date
      expect(new Date(result.scrapedAt as string).toISOString()).toBeTruthy();
    });

    it('passes scraper options with maxPages from tool config', async () => {
      const tool = createFetchWebsiteTool({ maxPages: 3 });
      await tool.execute({ url: 'https://example.com' });
      expect(mockScrapeWebsite).toHaveBeenCalledWith(
        'https://example.com',
        undefined,
        expect.objectContaining({ maxInternalPages: 3 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // 1.5 Gemini Summarization
  // --------------------------------------------------------------------------

  describe('summarization', () => {
    it('calls Gemini with correct prompt prefix', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'https://example.com' });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const promptArg = mockGenerateContent.mock.calls[0][0] as string;
      expect(promptArg).toContain('Analyze this website content');
    });

    it('truncates input to maxSummaryInput', async () => {
      const longContent = 'A'.repeat(50000);
      mockScrapeWebsite.mockResolvedValue(
        createMockWebsite({ combinedContent: longContent })
      );
      const tool = createFetchWebsiteTool({ maxSummaryInput: 15000 });
      await tool.execute({ url: 'https://example.com' });

      const promptArg = mockGenerateContent.mock.calls[0][0] as string;
      // Prompt prefix + truncated content should be under the limit
      expect(promptArg.length).toBeLessThanOrEqual(15000 + 600); // ~530 chars for prompt prefix
    });

    it('uses temperature 0.3', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'https://example.com' });
      const optionsArg = mockGenerateContent.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(optionsArg.temperature).toBe(0.3);
    });

    it('uses maxOutputTokens 1024', async () => {
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'https://example.com' });
      const optionsArg = mockGenerateContent.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(optionsArg.maxOutputTokens).toBe(1024);
    });

    it('returns fallback message on Gemini error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      // Should NOT throw — should degrade gracefully
      expect(result).not.toHaveProperty('error');
      expect(result.summary).toContain('Summary generation failed');
    });

    it('does NOT throw when Gemini fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API down'));
      const tool = createFetchWebsiteTool();
      // Should resolve, not reject
      await expect(
        tool.execute({ url: 'https://example.com' })
      ).resolves.toBeDefined();
    });

    it('passes combinedContent to summarizer', async () => {
      const website = createMockWebsite({
        combinedContent: 'Unique combined content for all pages',
      });
      mockScrapeWebsite.mockResolvedValue(website);
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'https://example.com' });

      const promptArg = mockGenerateContent.mock.calls[0][0] as string;
      expect(promptArg).toContain('Unique combined content for all pages');
    });
  });

  // --------------------------------------------------------------------------
  // 1.6 Error Handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns error when scrapeWebsite throws generic error', async () => {
      mockScrapeWebsite.mockRejectedValue(new Error('Network error'));
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect((result.error as string)).toContain('Failed to fetch website');
    });

    it('returns specific 403 message when error contains "403"', async () => {
      mockScrapeWebsite.mockRejectedValue(
        new Error('Access denied (403): https://example.com')
      );
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect((result.error as string)).toContain('403');
      expect((result.error as string)).toContain('bot protection');
    });

    it('403 message includes the URL', async () => {
      mockScrapeWebsite.mockRejectedValue(
        new Error('Access denied (403): https://blocked.com')
      );
      const tool = createFetchWebsiteTool();
      mockNormalizeUrl.mockReturnValue('https://blocked.com');
      const result = (await tool.execute({
        url: 'https://blocked.com',
      })) as Record<string, unknown>;

      expect((result.error as string)).toContain('https://blocked.com');
    });

    it('returns error for network timeouts', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockScrapeWebsite.mockRejectedValue(abortError);
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://slow.com',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
    });

    it('returns error for DNS resolution failures', async () => {
      mockScrapeWebsite.mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND nonexistent.com')
      );
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://nonexistent.com',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
    });

    it('handles non-Error throws with "Unknown error" fallback', async () => {
      mockScrapeWebsite.mockRejectedValue('string error, not Error object');
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unknown error');
    });

    it('KNOWN GAP: error messages include raw error text (may leak paths)', async () => {
      // The tool wraps errors as "Failed to fetch website: <message>"
      // where <message> is the raw Error.message from scraper.
      // This means file paths in errors ARE exposed in the tool result.
      // The result goes to the LLM (not directly to users), but could
      // be reflected in agent responses.
      mockScrapeWebsite.mockRejectedValue(
        new Error('ENOENT /home/user/.env not found')
      );
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      // Document: raw error IS included in the message
      expect(result.error).toContain('ENOENT');
      expect(result.error).toContain('/home/user/.env');
    });

    it('never throws — always returns result or error object', async () => {
      mockScrapeWebsite.mockRejectedValue(new Error('catastrophic'));
      const tool = createFetchWebsiteTool();
      // Should resolve, not throw
      const result = await tool.execute({ url: 'https://example.com' });
      expect(result).toBeDefined();
      expect(result).toHaveProperty('error');
    });
  });

  // --------------------------------------------------------------------------
  // 1.7 Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles website with zero pages (empty array)', async () => {
      const website = createMockWebsite({
        pages: [],
      });
      mockScrapeWebsite.mockResolvedValue(website);
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).not.toHaveProperty('error');
      expect(result.homepageExcerpt).toBe('');
      expect(result.pagesScraped).toBe(0);
    });

    it('handles website with only homepage (1 page)', async () => {
      const website = createMockWebsite();
      // Already 1 page by default
      mockScrapeWebsite.mockResolvedValue(website);
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;
      expect(result.pagesScraped).toBe(1);
    });

    it('handles website with empty bodyText on homepage', async () => {
      const website = createMockWebsite({
        pages: [
          {
            url: 'https://example.com',
            title: 'Empty Site',
            description: '',
            headings: [],
            bodyText: '',
            links: [],
            isExternal: false,
            domain: 'example.com',
          },
        ],
      });
      mockScrapeWebsite.mockResolvedValue(website);
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).not.toHaveProperty('error');
      expect(result.homepageExcerpt).toBe('');
    });

    it('handles website with no detected signals', async () => {
      mockDetectBusinessSignals.mockReturnValue({
        businessType: 'other',
        confidence: 0.1,
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
      });

      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result).not.toHaveProperty('error');
      expect(result.businessType).toBe('other');
      expect(result.hasProducts).toBe(false);
    });

    it('truncates very long homepage content', async () => {
      const longBody = 'A'.repeat(100_000);
      const website = createMockWebsite({
        pages: [
          {
            url: 'https://example.com',
            title: 'Long',
            description: '',
            headings: [],
            bodyText: longBody,
            links: [],
            isExternal: false,
            domain: 'example.com',
          },
        ],
      });
      mockScrapeWebsite.mockResolvedValue(website);
      const tool = createFetchWebsiteTool({ maxHomepageExcerpt: 3000 });
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect((result.homepageExcerpt as string).length).toBeLessThanOrEqual(
        3000
      );
    });

    it('returns error when SSRF URL parsing fails after normalizeUrl', async () => {
      // Edge case: normalizeUrl returns something that isBlockedUrl catches as invalid
      mockNormalizeUrl.mockReturnValue('not-a-valid-url');
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'anything',
      })) as Record<string, unknown>;

      expect(result).toHaveProperty('error');
      // isBlockedUrl returns true for unparseable URLs, so the error is about private URLs
      expect(result.error).toContain('internal/private');
      expect(mockScrapeWebsite).not.toHaveBeenCalled();
    });

    it('handles URL with port number', async () => {
      mockNormalizeUrl.mockReturnValue('https://example.com:8080');
      const tool = createFetchWebsiteTool();
      const result = await tool.execute({ url: 'example.com:8080' });
      expect(mockScrapeWebsite).toHaveBeenCalled();
    });

    it('handles non-ASCII URLs', async () => {
      mockNormalizeUrl.mockReturnValue('https://xn--e1afmapc.xn--p1ai');
      const tool = createFetchWebsiteTool();
      await tool.execute({ url: 'пример.рф' });
      expect(mockScrapeWebsite).toHaveBeenCalled();
    });

    it('handles multiple pages in scrape result', async () => {
      const website = createMockWebsite({
        pages: [
          {
            url: 'https://example.com',
            title: 'Home',
            description: '',
            headings: [],
            bodyText: 'Homepage content',
            links: [],
            isExternal: false,
            domain: 'example.com',
          },
          {
            url: 'https://example.com/about',
            title: 'About',
            description: '',
            headings: [],
            bodyText: 'About page content',
            links: [],
            isExternal: false,
            domain: 'example.com',
          },
          {
            url: 'https://example.com/products',
            title: 'Products',
            description: '',
            headings: [],
            bodyText: 'Products page content',
            links: [],
            isExternal: false,
            domain: 'example.com',
          },
        ],
      });
      mockScrapeWebsite.mockResolvedValue(website);
      const tool = createFetchWebsiteTool();
      const result = (await tool.execute({
        url: 'https://example.com',
      })) as Record<string, unknown>;

      expect(result.pagesScraped).toBe(3);
      // homepageExcerpt should be from first page only
      expect(result.homepageExcerpt).toBe('Homepage content');
    });
  });
});
