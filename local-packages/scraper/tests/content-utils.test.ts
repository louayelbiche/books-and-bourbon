import { describe, it, expect } from 'vitest';
import {
  hashContent,
  isCountryOrRegion,
  isGenericPhrase,
  extractFromDomain,
  extractFromTitle,
  extractBusinessName,
  buildCombinedContent,
} from '../src/content-utils.js';
import type { ScrapedPage } from '../src/types.js';
import * as cheerio from 'cheerio';

describe('hashContent', () => {
  it('produces consistent hashes for same content', () => {
    const hash1 = hashContent('Hello World');
    const hash2 = hashContent('Hello World');
    expect(hash1).toBe(hash2);
  });

  it('normalizes whitespace before hashing', () => {
    const hash1 = hashContent('Hello   World');
    const hash2 = hashContent('Hello World');
    expect(hash1).toBe(hash2);
  });

  it('is case-insensitive', () => {
    const hash1 = hashContent('Hello World');
    const hash2 = hashContent('hello world');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', () => {
    const hash1 = hashContent('Hello World');
    const hash2 = hashContent('Goodbye World');
    expect(hash1).not.toBe(hash2);
  });

  it('truncates to 1000 chars before hashing', () => {
    const long = 'a'.repeat(2000);
    const hash = hashContent(long);
    expect(hash).toBeTruthy();
  });
});

describe('isCountryOrRegion', () => {
  it('identifies country codes', () => {
    expect(isCountryOrRegion('US')).toBe(true);
    expect(isCountryOrRegion('uk')).toBe(true);
    expect(isCountryOrRegion('fr')).toBe(true);
  });

  it('identifies country names', () => {
    expect(isCountryOrRegion('United States')).toBe(true);
    expect(isCountryOrRegion('global')).toBe(true);
    expect(isCountryOrRegion('international')).toBe(true);
  });

  it('identifies short strings (<= 3 chars) as regions', () => {
    expect(isCountryOrRegion('ab')).toBe(true);
  });

  it('rejects business names', () => {
    expect(isCountryOrRegion('Acme Corporation')).toBe(false);
    expect(isCountryOrRegion('TechCorp Solutions')).toBe(false);
  });
});

describe('isGenericPhrase', () => {
  it('detects generic phrases', () => {
    expect(isGenericPhrase('Welcome Home')).toBe(true);
    expect(isGenericPhrase('The Best Online Solution')).toBe(true);
  });

  it('passes business names', () => {
    expect(isGenericPhrase('Acme Corporation')).toBe(false);
    expect(isGenericPhrase('TechVision Labs')).toBe(false);
  });
});

describe('extractFromDomain', () => {
  it('extracts name from simple domain', () => {
    expect(extractFromDomain('https://calendly.com')).toBe('Calendly');
  });

  it('extracts name from hyphenated domain', () => {
    expect(extractFromDomain('https://bio-instruments.tn')).toBe('Bio Instruments');
  });

  it('strips www prefix', () => {
    expect(extractFromDomain('https://www.example.com')).toBe('Example');
  });

  it('returns null for invalid URLs', () => {
    expect(extractFromDomain('not-a-url')).toBeNull();
  });

  it('returns null for very short domain parts', () => {
    expect(extractFromDomain('https://ab.com')).toBeNull();
  });
});

describe('extractFromTitle', () => {
  it('extracts brand from title with pipe separator', () => {
    // Without domain hint, shortest non-generic part wins
    expect(extractFromTitle('Homepage | Acme Corp', null)).toBe('Homepage');
    // With domain hint, matching part is preferred
    expect(extractFromTitle('Homepage | Acme Corp', 'Acme Corp')).toBe('Acme Corp');
  });

  it('extracts brand from title with dash separator', () => {
    expect(extractFromTitle('About Us - TechVision', null)).toBe('About Us');
    expect(extractFromTitle('About Us - TechVision', 'TechVision')).toBe('TechVision');
  });

  it('uses domain hint for matching', () => {
    expect(extractFromTitle('Products | TechVision | More', 'TechVision')).toBe(
      'TechVision'
    );
  });

  it('returns null for titles without separators', () => {
    expect(extractFromTitle('Simple Title', null)).toBeNull();
  });

  it('filters out generic phrases', () => {
    const result = extractFromTitle('Welcome Home | Acme', null);
    expect(result).toBe('Acme');
  });
});

describe('extractBusinessName', () => {
  const makePage = (overrides: Partial<ScrapedPage> = {}): ScrapedPage => ({
    url: 'https://example.com',
    title: 'Example Site',
    description: '',
    headings: [],
    bodyText: 'Some content',
    links: [],
    isExternal: false,
    domain: 'example.com',
    ...overrides,
  });

  it('prefers og:site_name', () => {
    const html = '<html><head><meta property="og:site_name" content="Acme Corp"></head><body></body></html>';
    const $ = cheerio.load(html);
    const page = makePage({ title: 'Home - Something Else' });
    expect(extractBusinessName(page, $, 'https://acme.com')).toBe('Acme Corp');
  });

  it('falls back to title parsing', () => {
    const html = '<html><head></head><body></body></html>';
    const $ = cheerio.load(html);
    const page = makePage({ title: 'About | TechVision Labs' });
    expect(extractBusinessName(page, $, 'https://techvision.com')).toBe(
      'TechVision Labs'
    );
  });

  it('falls back to domain name', () => {
    const html = '<html><head></head><body></body></html>';
    const $ = cheerio.load(html);
    const page = makePage({ title: 'Welcome' });
    expect(extractBusinessName(page, $, 'https://acme-corp.com')).toBe(
      'Acme Corp'
    );
  });

  it('falls back to first heading', () => {
    const html = '<html><head></head><body></body></html>';
    const $ = cheerio.load(html);
    const page = makePage({
      title: '',
      headings: ['Our Amazing Company'],
    });
    expect(extractBusinessName(page, $, 'https://ab.com')).toBe(
      'Our Amazing Company'
    );
  });
});

describe('buildCombinedContent', () => {
  it('builds markdown with internal and external sections', () => {
    const pages: ScrapedPage[] = [
      {
        url: 'https://example.com',
        title: 'Home',
        description: 'Welcome',
        headings: ['Main Heading'],
        bodyText: 'Homepage content here.',
        links: [],
        isExternal: false,
        domain: 'example.com',
      },
      {
        url: 'https://linkedin.com/company/example',
        title: 'Example on LinkedIn',
        description: 'LinkedIn profile',
        headings: ['About'],
        bodyText: 'External content here.',
        links: [],
        isExternal: true,
        domain: 'linkedin.com',
      },
    ];

    const content = buildCombinedContent(pages, 'Example Corp', 'example.com', 50000);

    expect(content).toContain('# Example Corp - Website Content');
    expect(content).toContain('## Primary Website (example.com)');
    expect(content).toContain('### Home');
    expect(content).toContain('Homepage content here.');
    expect(content).toContain('## External Sources & Social Profiles');
    expect(content).toContain('[External: linkedin.com]');
    expect(content).toContain('External content here.');
  });

  it('respects maxChars limit', () => {
    const pages: ScrapedPage[] = [
      {
        url: 'https://example.com',
        title: 'Home',
        description: '',
        headings: [],
        bodyText: 'x'.repeat(1000),
        links: [],
        isExternal: false,
        domain: 'example.com',
      },
    ];

    const content = buildCombinedContent(pages, 'Test', 'example.com', 100);
    expect(content.length).toBeLessThanOrEqual(100);
  });

  it('includes images when present', () => {
    const pages: ScrapedPage[] = [
      {
        url: 'https://example.com',
        title: 'Home',
        description: '',
        headings: [],
        bodyText: 'Content',
        links: [],
        isExternal: false,
        domain: 'example.com',
        images: ['https://example.com/img.jpg'],
      },
    ];

    const content = buildCombinedContent(pages, 'Test', 'example.com', 50000);
    expect(content).toContain('https://example.com/img.jpg');
  });
});
