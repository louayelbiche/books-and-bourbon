import { describe, it, expect } from 'vitest';
import {
  resolveUrl,
  isExternalUrl,
  shouldSkipUrl,
  isValuableExternalDomain,
  getDomain,
  scoreUrl,
  normalizeUrl,
} from '../src/url-utils.js';

describe('resolveUrl', () => {
  it('resolves relative URLs', () => {
    expect(resolveUrl('https://example.com/page', '/about')).toBe(
      'https://example.com/about'
    );
    expect(resolveUrl('https://example.com/page', 'contact')).toBe(
      'https://example.com/contact'
    );
  });

  it('returns absolute URLs as-is', () => {
    expect(resolveUrl('https://example.com', 'https://other.com/page')).toBe(
      'https://other.com/page'
    );
  });

  it('strips hash fragments', () => {
    expect(resolveUrl('https://example.com', '/page#section')).toBe(
      'https://example.com/page'
    );
  });

  it('returns null for mailto: links', () => {
    expect(resolveUrl('https://example.com', 'mailto:test@example.com')).toBeNull();
  });

  it('returns null for tel: links', () => {
    expect(resolveUrl('https://example.com', 'tel:+1234567890')).toBeNull();
  });

  it('returns null for javascript: links', () => {
    expect(resolveUrl('https://example.com', 'javascript:void(0)')).toBeNull();
  });

  it('returns null for data: URIs', () => {
    expect(resolveUrl('https://example.com', 'data:text/html,hello')).toBeNull();
  });

  it('returns null for hash-only links', () => {
    expect(resolveUrl('https://example.com', '#top')).toBeNull();
  });

  it('returns null for non-HTTP protocols', () => {
    expect(resolveUrl('https://example.com', 'ftp://files.example.com')).toBeNull();
  });
});

describe('isExternalUrl', () => {
  it('detects external URLs', () => {
    expect(isExternalUrl('https://other.com', 'example.com')).toBe(true);
  });

  it('detects internal URLs', () => {
    expect(isExternalUrl('https://example.com/page', 'example.com')).toBe(false);
  });

  it('strips www. for comparison', () => {
    expect(isExternalUrl('https://www.example.com/page', 'example.com')).toBe(false);
    expect(isExternalUrl('https://example.com/page', 'www.example.com')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isExternalUrl('not-a-url', 'example.com')).toBe(false);
  });
});

describe('shouldSkipUrl', () => {
  it('skips file extensions', () => {
    expect(shouldSkipUrl('https://example.com/doc.pdf')).toBe(true);
    expect(shouldSkipUrl('https://example.com/img.jpg')).toBe(true);
    expect(shouldSkipUrl('https://example.com/archive.zip')).toBe(true);
  });

  it('skips auth/admin paths', () => {
    expect(shouldSkipUrl('https://example.com/login')).toBe(true);
    expect(shouldSkipUrl('https://example.com/admin/dashboard')).toBe(true);
    expect(shouldSkipUrl('https://example.com/cart')).toBe(true);
    expect(shouldSkipUrl('https://example.com/checkout')).toBe(true);
  });

  it('skips video platform domains', () => {
    expect(shouldSkipUrl('https://youtube.com/watch?v=abc')).toBe(true);
    expect(shouldSkipUrl('https://vimeo.com/123456')).toBe(true);
    expect(shouldSkipUrl('https://tiktok.com/@user')).toBe(true);
  });

  it('allows normal pages', () => {
    expect(shouldSkipUrl('https://example.com/about')).toBe(false);
    expect(shouldSkipUrl('https://example.com/products')).toBe(false);
    expect(shouldSkipUrl('https://example.com/contact')).toBe(false);
  });

  it('returns true for invalid URLs', () => {
    expect(shouldSkipUrl('not-a-url')).toBe(true);
  });
});

describe('isValuableExternalDomain', () => {
  it('recognizes valuable domains', () => {
    expect(isValuableExternalDomain('https://linkedin.com/company/test')).toBe(true);
    expect(isValuableExternalDomain('https://www.yelp.com/biz/test')).toBe(true);
    expect(isValuableExternalDomain('https://github.com/org/repo')).toBe(true);
    expect(isValuableExternalDomain('https://www.crunchbase.com/org/test')).toBe(true);
  });

  it('rejects non-valuable domains', () => {
    expect(isValuableExternalDomain('https://randomsite.com')).toBe(false);
  });
});

describe('getDomain', () => {
  it('extracts hostname', () => {
    expect(getDomain('https://www.example.com/path')).toBe('www.example.com');
    expect(getDomain('http://example.com')).toBe('example.com');
  });

  it('returns empty string for invalid URLs', () => {
    expect(getDomain('not-a-url')).toBe('');
  });
});

describe('scoreUrl', () => {
  it('scores product URLs higher', () => {
    expect(scoreUrl('https://example.com/products')).toBe(1);
    expect(scoreUrl('https://example.com/produits')).toBe(1);
    expect(scoreUrl('https://example.com/shop')).toBe(1);
    expect(scoreUrl('https://example.com/pricing')).toBe(1);
    expect(scoreUrl('https://example.com/tarifs')).toBe(1);
    expect(scoreUrl('https://example.com/services')).toBe(1);
    expect(scoreUrl('https://example.com/catalog')).toBe(1);
    expect(scoreUrl('https://example.com/catalogue')).toBe(1);
  });

  it('scores non-product URLs as 0', () => {
    expect(scoreUrl('https://example.com/about')).toBe(0);
    expect(scoreUrl('https://example.com/blog')).toBe(0);
    expect(scoreUrl('https://example.com/news')).toBe(0);
  });

  it('returns 0 for invalid URLs', () => {
    expect(scoreUrl('not-a-url')).toBe(0);
  });
});

describe('normalizeUrl', () => {
  it('adds https:// if missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
  });

  it('preserves existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('preserves existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('preserves paths and query strings', () => {
    expect(normalizeUrl('example.com/path?q=1')).toBe('https://example.com/path?q=1');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com/');
  });

  it('returns null for empty input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
  });

  it('returns null for non-HTTP protocols', () => {
    expect(normalizeUrl('ftp://example.com')).toBeNull();
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('data:text/html,test')).toBeNull();
    expect(normalizeUrl('file:///etc/passwd')).toBeNull();
  });

  it('handles international domain names', () => {
    const result = normalizeUrl('münchen.de');
    expect(result).not.toBeNull();
    expect(result).toContain('https://');
  });
});
