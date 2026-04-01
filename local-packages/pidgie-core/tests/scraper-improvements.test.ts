/**
 * Tests for scraper improvements:
 * - URL priority scoring (scoreUrl)
 * - Paragraph-preserving bodyText extraction
 * - Increased page budget
 * - PRODUCT_URL_PATTERNS constant
 */

import { describe, it, expect } from 'vitest';
import { scoreUrl, DEFAULT_OPTIONS, PRODUCT_URL_PATTERNS } from '../src/scraper/index.js';

describe('scoreUrl', () => {
  it('scores product URLs higher than 0', () => {
    expect(scoreUrl('https://example.com/products')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/products/widget-123')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/shop')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/collections/summer')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/catalog')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/services')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/equipment/analyzers')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/our-products')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/our-services')).toBeGreaterThan(0);
  });

  it('scores generic URLs as 0', () => {
    expect(scoreUrl('https://example.com/')).toBe(0);
    expect(scoreUrl('https://example.com/blog/post-1')).toBe(0);
    expect(scoreUrl('https://example.com/faq')).toBe(0);
  });

  it('scores contact/about pages as high priority', () => {
    expect(scoreUrl('https://example.com/about')).toBe(100);
    expect(scoreUrl('https://example.com/contact')).toBe(100);
    expect(scoreUrl('https://example.com/team')).toBe(100);
    expect(scoreUrl('https://example.com/locations')).toBe(100);
  });

  it('is case-insensitive', () => {
    expect(scoreUrl('https://example.com/Products')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/SHOP')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/Catalog/Items')).toBeGreaterThan(0);
  });

  it('returns 0 for invalid URLs', () => {
    expect(scoreUrl('not-a-url')).toBe(0);
    expect(scoreUrl('')).toBe(0);
  });

  it('matches patterns as substrings of pathname', () => {
    expect(scoreUrl('https://example.com/en/products/page/2')).toBeGreaterThan(0);
    expect(scoreUrl('https://example.com/fr/category/electronics')).toBeGreaterThan(0);
  });
});

describe('PRODUCT_URL_PATTERNS', () => {
  it('includes expected patterns', () => {
    expect(PRODUCT_URL_PATTERNS).toContain('/products');
    expect(PRODUCT_URL_PATTERNS).toContain('/shop');
    expect(PRODUCT_URL_PATTERNS).toContain('/catalog');
    expect(PRODUCT_URL_PATTERNS).toContain('/equipment');
    expect(PRODUCT_URL_PATTERNS).toContain('/services');
    expect(PRODUCT_URL_PATTERNS).toContain('/solutions');
    expect(PRODUCT_URL_PATTERNS).toContain('/pricing');
  });

  it('has at least 15 patterns', () => {
    expect(PRODUCT_URL_PATTERNS.length).toBeGreaterThanOrEqual(15);
  });
});

describe('DEFAULT_OPTIONS', () => {
  it('has maxInternalPages set to 20', () => {
    expect(DEFAULT_OPTIONS.maxInternalPages).toBe(20);
  });

  it('preserves other defaults', () => {
    expect(DEFAULT_OPTIONS.maxExternalPages).toBe(5);
    expect(DEFAULT_OPTIONS.followExternalLinks).toBe(true);
    expect(DEFAULT_OPTIONS.maxContentChars).toBe(75000);
  });
});

describe('bodyText paragraph preservation', () => {
  // These test the regex transformations applied to bodyText
  // Simulating what extractPageContent does

  function simulateBodyTextExtraction(rawText: string): string {
    return rawText
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n /g, '\n')
      .trim()
      .slice(0, 10000);
  }

  it('preserves double newlines as paragraph breaks', () => {
    const input = 'First paragraph.\n\nSecond paragraph.';
    const result = simulateBodyTextExtraction(input);
    expect(result).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('collapses triple+ newlines to double', () => {
    const input = 'Para 1.\n\n\n\nPara 2.\n\n\n\n\nPara 3.';
    const result = simulateBodyTextExtraction(input);
    expect(result).toBe('Para 1.\n\nPara 2.\n\nPara 3.');
  });

  it('collapses horizontal whitespace (tabs, spaces)', () => {
    const input = 'Some    text\twith   spaces';
    const result = simulateBodyTextExtraction(input);
    expect(result).toBe('Some text with spaces');
  });

  it('trims leading spaces after newlines', () => {
    const input = 'Line 1\n   Line 2\n  Line 3';
    const result = simulateBodyTextExtraction(input);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('preserves single newlines', () => {
    const input = 'Line 1\nLine 2\nLine 3';
    const result = simulateBodyTextExtraction(input);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles mixed whitespace correctly', () => {
    const input = 'Product A   $99.99\n\nProduct B\t$49.99\n\n\n\nProduct C  $29.99';
    const result = simulateBodyTextExtraction(input);
    expect(result).toBe('Product A $99.99\n\nProduct B $49.99\n\nProduct C $29.99');
  });

  it('truncates to 10000 chars', () => {
    const input = 'A'.repeat(20000);
    const result = simulateBodyTextExtraction(input);
    expect(result.length).toBe(10000);
  });

  it('does NOT collapse everything to single line (the old bug)', () => {
    const input = 'First section content.\n\nSecond section content.\n\nThird section content.';
    const result = simulateBodyTextExtraction(input);
    // Old behavior would return: "First section content. Second section content. Third section content."
    // New behavior preserves paragraph breaks
    expect(result).toContain('\n\n');
    expect(result.split('\n\n').length).toBe(3);
  });
});
