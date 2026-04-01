import { describe, it, expect } from 'vitest';
import type { ScrapedPageInput } from '../../src/detection/types.js';
import {
  detectBusinessSignals,
  detectProducts,
  detectServices,
  detectPricing,
  detectBooking,
  detectCaseStudies,
  detectTeamPage,
  detectFAQ,
  detectBlog,
  detectBusinessType,
  extractPrimaryOfferings,
  extractIndustryKeywords,
  calculateConfidence,
  createDefaultSignals,
} from '../../src/detection/index.js';

function makePage(overrides: Partial<ScrapedPageInput> = {}): ScrapedPageInput {
  return {
    url: 'https://example.com',
    title: 'Test Page',
    headings: [],
    bodyText: '',
    links: [],
    ...overrides,
  };
}

describe('detectProducts', () => {
  it('detects products from text + price', () => {
    const pages = [makePage({ bodyText: 'Add to cart. Widget $29.99' })];
    expect(detectProducts(pages)).toBe(true);
  });

  it('detects products from URL patterns', () => {
    const pages = [makePage({ links: ['https://example.com/products/widget'] })];
    expect(detectProducts(pages)).toBe(true);
  });

  it('returns false for no product signals', () => {
    const pages = [makePage({ bodyText: 'Welcome to our consultancy' })];
    expect(detectProducts(pages)).toBe(false);
  });
});

describe('detectServices', () => {
  it('detects services from text', () => {
    const pages = [makePage({ bodyText: 'Our services include consulting and advisory' })];
    expect(detectServices(pages)).toBe(true);
  });

  it('detects services from URL', () => {
    const pages = [makePage({ links: ['https://example.com/services/web-dev'] })];
    expect(detectServices(pages)).toBe(true);
  });
});

describe('detectPricing', () => {
  it('detects pricing page', () => {
    const pages = [makePage({ bodyText: 'See our pricing plans' })];
    expect(detectPricing(pages)).toBe(true);
  });

  it('detects pricing URL', () => {
    const pages = [makePage({ links: ['https://example.com/pricing'] })];
    expect(detectPricing(pages)).toBe(true);
  });
});

describe('detectBooking', () => {
  it('detects booking text', () => {
    const pages = [makePage({ bodyText: 'Book a consultation today' })];
    expect(detectBooking(pages)).toBe(true);
  });

  it('detects calendly links', () => {
    const pages = [makePage({ links: ['https://calendly.com/team'] })];
    expect(detectBooking(pages)).toBe(true);
  });
});

describe('detectCaseStudies', () => {
  it('detects case studies text', () => {
    const pages = [makePage({ bodyText: 'Read our case studies and success stories' })];
    expect(detectCaseStudies(pages)).toBe(true);
  });
});

describe('detectTeamPage', () => {
  it('detects team page', () => {
    const pages = [makePage({ bodyText: 'Meet the team behind our company' })];
    expect(detectTeamPage(pages)).toBe(true);
  });

  it('detects roles', () => {
    const pages = [makePage({ bodyText: 'John Smith, CEO and founder' })];
    expect(detectTeamPage(pages)).toBe(true);
  });
});

describe('detectFAQ', () => {
  it('detects FAQ', () => {
    const pages = [makePage({ bodyText: 'Frequently Asked Questions' })];
    expect(detectFAQ(pages)).toBe(true);
  });
});

describe('detectBlog', () => {
  it('detects blog', () => {
    const pages = [makePage({ bodyText: 'Check out our latest blog posts' })];
    expect(detectBlog(pages)).toBe(true);
  });

  it('detects blog URL', () => {
    const pages = [makePage({ links: ['https://example.com/blog'] })];
    expect(detectBlog(pages)).toBe(true);
  });
});

describe('extractPrimaryOfferings', () => {
  it('extracts offerings from section-gated headings', () => {
    const pages = [makePage({
      url: 'https://example.com',
      headings: ['Services', 'Web Development', 'Mobile Apps', 'About Us', 'Our Team'],
    })];
    const offerings = extractPrimaryOfferings(pages);
    expect(offerings).toContain('Web Development');
    expect(offerings).toContain('Mobile Apps');
  });

  it('returns empty for non-listing pages', () => {
    const pages = [makePage({
      url: 'https://example.com/products/specific-widget',
      headings: ['Services', 'Web Development'],
    })];
    expect(extractPrimaryOfferings(pages)).toEqual([]);
  });
});

describe('extractIndustryKeywords', () => {
  it('extracts industry with 2+ pattern matches', () => {
    const pages = [makePage({ bodyText: 'Our restaurant offers fine dining and cuisine' })];
    const keywords = extractIndustryKeywords(pages);
    expect(keywords).toContain('food');
  });

  it('requires 2+ matches (single match insufficient)', () => {
    const pages = [makePage({ bodyText: 'We offer restaurant-quality service' })];
    const keywords = extractIndustryKeywords(pages);
    // "restaurant" alone is only 1 match
    expect(keywords).not.toContain('food');
  });
});

describe('detectBusinessType', () => {
  it('detects ecommerce', () => {
    const signals = {
      ...createDefaultSignals(),
      hasProducts: true,
      hasPricing: true,
    };
    // @ts-expect-error - testing with full signals object
    delete signals.businessType;
    // @ts-expect-error - testing with full signals object
    delete signals.confidence;
    expect(detectBusinessType(signals)).toBe('ecommerce');
  });

  it('detects services', () => {
    const result = detectBusinessType({
      hasProducts: false, hasServices: true, hasPricing: false,
      hasBooking: false, hasCaseStudies: true, hasTeamPage: true,
      hasFAQ: false, hasBlog: false,
      contactMethods: { form: false, email: null, phone: null, chat: false, social: [] },
      primaryOfferings: [], industryKeywords: [],
    });
    expect(result).toBe('services');
  });

  it('returns other for low scores', () => {
    const result = detectBusinessType({
      hasProducts: false, hasServices: false, hasPricing: false,
      hasBooking: false, hasCaseStudies: false, hasTeamPage: false,
      hasFAQ: false, hasBlog: false,
      contactMethods: { form: false, email: null, phone: null, chat: false, social: [] },
      primaryOfferings: [], industryKeywords: [],
    });
    expect(result).toBe('other');
  });
});

describe('calculateConfidence', () => {
  it('returns 0 for empty signals', () => {
    const signals = createDefaultSignals();
    const conf = calculateConfidence(signals);
    expect(conf).toBe(0);
  });

  it('increases with more capabilities', () => {
    const low = calculateConfidence(createDefaultSignals());
    const high = calculateConfidence({
      ...createDefaultSignals(),
      hasProducts: true,
      hasServices: true,
      hasPricing: true,
      contactMethods: { form: true, email: 'a@b.com', phone: '555-1234', chat: false, social: ['linkedin'] },
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe('detectBusinessSignals (main)', () => {
  it('returns default signals for empty pages', () => {
    const signals = detectBusinessSignals([]);
    expect(signals.businessType).toBe('other');
    expect(signals.confidence).toBe(0);
  });

  it('detects an ecommerce site', () => {
    const pages = [makePage({
      bodyText: 'Add to cart. Buy now. $49.99 free shipping',
      links: ['https://example.com/products/widget', 'https://example.com/shop/'],
    })];
    const signals = detectBusinessSignals(pages);
    expect(signals.hasProducts).toBe(true);
    expect(signals.businessType).toBe('ecommerce');
    expect(signals.confidence).toBeGreaterThan(0);
  });

  it('detects a services site', () => {
    const pages = [makePage({
      bodyText: 'Our services include consulting. Read our case studies and success stories. Meet the team.',
      headings: ['Our Services', 'Case Studies'],
      links: ['https://example.com/services/', 'https://example.com/case-studies'],
    })];
    const signals = detectBusinessSignals(pages);
    expect(signals.hasServices).toBe(true);
    expect(signals.hasCaseStudies).toBe(true);
  });
});
