import { describe, it, expect } from 'vitest';
import type { ScrapedPageInput } from '../../src/detection/types.js';
import { extractBlogEntries } from '../../src/detection/signals.js';

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

describe('extractBlogEntries', () => {
  // JSON-LD BlogPosting extraction

  describe('JSON-LD BlogPosting extraction', () => {
    it('extracts BlogPosting with all fields', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'BlogPosting',
          headline: 'How to Choose the Right Equipment',
          description: 'A guide to selecting laboratory equipment.',
          url: 'https://example.com/blog/choosing-equipment',
          datePublished: '2026-01-15',
          image: 'https://example.com/img/equipment-guide.jpg',
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('How to Choose the Right Equipment');
      expect(entries[0].slug).toBe('choosing-equipment');
      expect(entries[0].excerpt).toBe('A guide to selecting laboratory equipment.');
      expect(entries[0].publishedAt).toBe('2026-01-15');
      expect(entries[0].imageUrl).toBe('https://example.com/img/equipment-guide.jpg');
      expect(entries[0].extractionMethod).toBe('json-ld');
    });

    it('extracts BlogPosting with minimal fields', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'BlogPosting',
          headline: 'Quick Update',
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Quick Update');
      expect(entries[0].slug).toBeTruthy();
      expect(entries[0].excerpt).toBeUndefined();
      expect(entries[0].publishedAt).toBeUndefined();
    });
  });

  // JSON-LD Article extraction

  describe('JSON-LD Article extraction', () => {
    it('extracts Article type', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Article',
          headline: 'Industry Trends 2026',
          description: 'Analysis of emerging trends in the industry.',
          url: 'https://example.com/articles/industry-trends-2026',
          datePublished: '2026-02-01',
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Industry Trends 2026');
      expect(entries[0].slug).toBe('industry-trends-2026');
    });

    it('extracts NewsArticle type', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'NewsArticle',
          headline: 'Company Launches New Product',
          url: 'https://example.com/news/new-product-launch',
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Company Launches New Product');
    });

    it('handles @graph arrays', () => {
      const pages = [makePage({
        jsonLd: [{
          '@graph': [
            { '@type': 'BlogPosting', headline: 'Post One', url: 'https://example.com/blog/post-one' },
            { '@type': 'BlogPosting', headline: 'Post Two', url: 'https://example.com/blog/post-two' },
          ],
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBe('Post One');
      expect(entries[1].title).toBe('Post Two');
    });
  });

  // Link text on blog listing pages

  describe('link text on blog listing pages', () => {
    it('extracts blog post titles from blog page links', () => {
      const pages = [makePage({
        url: 'https://example.com/blog',
        linkDetails: [
          { href: 'https://example.com/blog/first-post', text: 'Our First Blog Post' },
          { href: 'https://example.com/blog/second-post', text: 'Tips for Better Service' },
          { href: 'https://example.com/about', text: 'About Us' },
        ],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(2);
      expect(entries[0].title).toBe('Our First Blog Post');
      expect(entries[0].slug).toBe('first-post');
      expect(entries[0].extractionMethod).toBe('link-text');
      expect(entries[1].title).toBe('Tips for Better Service');
    });

    it('extracts from /articles listing page', () => {
      const pages = [makePage({
        url: 'https://example.com/articles',
        linkDetails: [
          { href: 'https://example.com/articles/deep-dive', text: 'A Deep Dive into Analytics' },
        ],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].slug).toBe('deep-dive');
    });

    it('ignores noise anchor texts on blog pages', () => {
      const pages = [makePage({
        url: 'https://example.com/blog',
        linkDetails: [
          { href: 'https://example.com/blog/real-post', text: 'A Real Blog Post Title Here' },
          { href: 'https://example.com/blog', text: 'Read More' },
          { href: 'https://example.com/blog', text: 'View All' },
        ],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('A Real Blog Post Title Here');
    });

    it('ignores links on non-blog pages', () => {
      const pages = [makePage({
        url: 'https://example.com/products',
        linkDetails: [
          { href: 'https://example.com/products/item-1', text: 'Widget Pro' },
        ],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(0);
    });
  });

  // Slug derivation

  describe('slug derivation', () => {
    it('derives slug from URL path', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'BlogPosting',
          headline: 'My Post Title',
          url: 'https://example.com/blog/my-custom-slug',
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries[0].slug).toBe('my-custom-slug');
    });

    it('falls back to title-based slug when no URL', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'BlogPosting',
          headline: 'Hello World Post',
        }],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries[0].slug).toContain('hello-world-post');
    });
  });

  // Empty/edge cases

  describe('empty and edge cases', () => {
    it('returns empty array for pages without blog content', () => {
      const pages = [makePage({
        bodyText: 'Just a product page with no blog content.',
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(0);
    });

    it('deduplicates by title', () => {
      const pages = [makePage({
        jsonLd: [
          { '@type': 'BlogPosting', headline: 'Same Title', url: 'https://example.com/blog/a' },
          { '@type': 'BlogPosting', headline: 'Same Title', url: 'https://example.com/blog/b' },
        ],
      })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(1);
    });

    it('caps at 10 entries', () => {
      const posts = Array.from({ length: 15 }, (_, i) => ({
        '@type': 'BlogPosting',
        headline: `Blog Post Number ${i + 1}`,
        url: `https://example.com/blog/post-${i + 1}`,
      }));

      const pages = [makePage({ jsonLd: posts })];

      const entries = extractBlogEntries(pages);
      expect(entries).toHaveLength(10);
    });
  });
});
