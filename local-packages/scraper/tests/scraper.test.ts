import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeWebsite } from '../src/scraper.js';

// Helper: create a minimal HTML page
function makeHtml(options: {
  title?: string;
  description?: string;
  ogSiteName?: string;
  body?: string;
  links?: string[];
  lang?: string;
  jsonLd?: Record<string, unknown>;
} = {}): string {
  const links = (options.links || [])
    .map((href) => `<a href="${href}">Link</a>`)
    .join('\n');

  const jsonLdTag = options.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(options.jsonLd)}</script>`
    : '';

  return `<!DOCTYPE html>
<html${options.lang ? ` lang="${options.lang}"` : ''}>
<head>
  <title>${options.title || 'Test Page'}</title>
  ${options.description ? `<meta name="description" content="${options.description}">` : ''}
  ${options.ogSiteName ? `<meta property="og:site_name" content="${options.ogSiteName}">` : ''}
  ${jsonLdTag}
</head>
<body>
  <main>
    <h1>${options.title || 'Test Page'}</h1>
    <p>${options.body || 'Default body content for testing purposes. '.repeat(10)}</p>
    ${links}
  </main>
</body>
</html>`;
}

describe('scrapeWebsite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('scrapes homepage and returns ScrapedWebsite without signals', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(makeHtml({
        title: 'Acme Corp',
        ogSiteName: 'Acme Corp',
        description: 'Leading provider',
        body: 'We build amazing products. '.repeat(20),
        lang: 'en',
      })),
    });

    const result = await scrapeWebsite('https://acme.com', undefined, { stealth: false });

    expect(result.url).toBe('https://acme.com');
    expect(result.businessName).toBe('Acme Corp');
    expect(result.language).toBe('en');
    expect(result.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.combinedContent).toContain('Acme Corp');
    // No signals field
    expect(result).not.toHaveProperty('signals');
  });

  it('follows internal links during BFS crawl', async () => {
    const pages: Record<string, string> = {
      'https://example.com': makeHtml({
        title: 'Home | Example',
        ogSiteName: 'Example',
        body: 'Homepage content for testing. '.repeat(10),
        links: [
          'https://example.com/about',
          'https://example.com/products',
        ],
      }),
      'https://example.com/about': makeHtml({
        title: 'About | Example',
        body: 'About us page with unique content here. '.repeat(10),
      }),
      'https://example.com/products': makeHtml({
        title: 'Products | Example',
        body: 'Our products are the best in the market. '.repeat(10),
      }),
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const html = pages[url];
      if (!html) {
        return Promise.resolve({
          ok: false,
          status: 404,
          headers: { get: () => 'text/html' },
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });
    });

    const result = await scrapeWebsite('https://example.com', undefined, {
      followExternalLinks: false,
      stealth: false,
    });

    expect(result.pages.length).toBe(3);
    expect(result.pages.map((p) => p.url)).toContain('https://example.com/about');
    expect(result.pages.map((p) => p.url)).toContain('https://example.com/products');
  });

  it('deduplicates pages with same content hash', async () => {
    // Use the same title AND body so the extracted bodyText is truly identical
    const duplicateTitle = 'Duplicate Page';
    const duplicateBody = 'Exactly the same content on every page. '.repeat(10);

    const pages: Record<string, string> = {
      'https://example.com': makeHtml({
        title: 'Home',
        ogSiteName: 'Test',
        body: 'Unique homepage content for dedup test. '.repeat(10),
        links: ['https://example.com/page1', 'https://example.com/page2'],
      }),
      'https://example.com/page1': makeHtml({
        title: duplicateTitle,
        body: duplicateBody,
      }),
      'https://example.com/page2': makeHtml({
        title: duplicateTitle,
        body: duplicateBody,
      }),
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const html = pages[url];
      if (!html) {
        return Promise.resolve({ ok: false, status: 404, headers: { get: () => 'text/html' } });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });
    });

    const result = await scrapeWebsite('https://example.com', undefined, {
      followExternalLinks: false,
      stealth: false,
    });

    // Homepage + 1 of the 2 duplicate pages (second gets skipped)
    expect(result.pages.length).toBe(2);
  });

  it('respects maxInternalPages limit', async () => {
    const links = Array.from({ length: 20 }, (_, i) => `https://example.com/page-${i}`);
    const pages: Record<string, string> = {
      'https://example.com': makeHtml({
        title: 'Home',
        ogSiteName: 'Test',
        body: 'Homepage. '.repeat(20),
        links,
      }),
    };
    // Create pages for all links with unique content
    links.forEach((link, i) => {
      pages[link] = makeHtml({
        title: `Page ${i}`,
        body: `Unique content for page number ${i}. `.repeat(10),
      });
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const html = pages[url];
      if (!html) {
        return Promise.resolve({ ok: false, status: 404, headers: { get: () => 'text/html' } });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });
    });

    const result = await scrapeWebsite('https://example.com', undefined, {
      maxInternalPages: 3,
      followExternalLinks: false,
      stealth: false,
      maxContentChars: 75000,
      maxExternalPages: 0,
    });

    // 1 homepage + 2 more = 3 total
    expect(result.pages.length).toBeLessThanOrEqual(3);
  });

  it('calls progress callback', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(makeHtml({
        ogSiteName: 'Test',
        body: 'Content. '.repeat(20),
      })),
    });

    const onProgress = vi.fn();
    await scrapeWebsite('https://example.com', onProgress, {
      followExternalLinks: false,
      stealth: false,
    });

    expect(onProgress).toHaveBeenCalledWith('Fetching homepage...', 0);
    expect(onProgress).toHaveBeenCalledWith(
      expect.stringContaining('Processing content'),
      expect.any(Number)
    );
  });

  it('throws on homepage fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'text/html' },
    });

    await expect(
      scrapeWebsite('https://example.com', undefined, { stealth: false })
    ).rejects.toThrow('HTTP_500');
  });

  it('extracts JSON-LD from pages', async () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Test Org',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(makeHtml({
        ogSiteName: 'Test',
        body: 'Content. '.repeat(20),
        jsonLd,
      })),
    });

    const result = await scrapeWebsite('https://example.com', undefined, {
      followExternalLinks: false,
      stealth: false,
    });

    expect(result.pages[0].jsonLd).toBeDefined();
    expect(result.pages[0].jsonLd![0]).toEqual(jsonLd);
  });

  it('extracts language from html lang attribute', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: () => Promise.resolve(makeHtml({
        ogSiteName: 'Test',
        body: 'Contenu. '.repeat(20),
        lang: 'fr-FR',
      })),
    });

    const result = await scrapeWebsite('https://example.com', undefined, {
      followExternalLinks: false,
      stealth: false,
    });

    expect(result.language).toBe('fr');
  });
});
