import { describe, it, expect } from 'vitest';
import type { ScrapedPageInput } from '../../src/detection/types.js';
import { extractFAQEntries } from '../../src/detection/signals.js';

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

describe('extractFAQEntries', () => {
  // JSON-LD FAQPage extraction

  describe('JSON-LD FAQPage extraction', () => {
    it('extracts from FAQPage mainEntity', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What are your hours?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'We are open Monday through Friday, 9am to 5pm.',
              },
            },
            {
              '@type': 'Question',
              name: 'Do you offer delivery?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, we deliver within a 10 mile radius.',
              },
            },
          ],
        }],
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(2);
      expect(entries[0].question).toBe('What are your hours?');
      expect(entries[0].answer).toBe('We are open Monday through Friday, 9am to 5pm.');
      expect(entries[0].extractionMethod).toBe('json-ld');
      expect(entries[1].question).toBe('Do you offer delivery?');
    });

    it('handles FAQPage inside @graph', () => {
      const pages = [makePage({
        jsonLd: [{
          '@graph': [{
            '@type': 'FAQPage',
            mainEntity: [{
              '@type': 'Question',
              name: 'How do I contact support?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Email us at support@example.com.',
              },
            }],
          }],
        }],
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].question).toBe('How do I contact support?');
    });

    it('skips entries without an answer', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'FAQPage',
          mainEntity: [{
            '@type': 'Question',
            name: 'No answer here',
          }],
        }],
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(0);
    });

    it('skips non-Question types in mainEntity', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'FAQPage',
          mainEntity: [{
            '@type': 'Thing',
            name: 'Not a question',
            acceptedAnswer: { text: 'Not an answer' },
          }],
        }],
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(0);
    });
  });

  // Heading pattern extraction

  describe('heading pattern extraction', () => {
    it('extracts Q&A from FAQ page headings ending in ?', () => {
      const pages = [makePage({
        url: 'https://example.com/faq',
        headings: [
          'Frequently Asked Questions',
          'What is your return policy?',
          'How long does shipping take?',
        ],
        bodyText: 'Frequently Asked Questions What is your return policy? We accept returns within 30 days of purchase. All items must be in original condition. How long does shipping take? Standard shipping takes 3 to 5 business days.',
      })];

      const entries = extractFAQEntries(pages);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      const first = entries.find(e => e.question === 'What is your return policy?');
      expect(first).toBeDefined();
      expect(first!.extractionMethod).toBe('heading-pattern');
      expect(first!.answer.length).toBeGreaterThan(10);
    });

    it('detects FAQ pages by heading content', () => {
      const pages = [makePage({
        url: 'https://example.com/help',
        headings: [
          'FAQ',
          'Can I cancel my order?',
        ],
        bodyText: 'FAQ Can I cancel my order? Yes, you can cancel your order within 24 hours of placing it for a full refund.',
      })];

      const entries = extractFAQEntries(pages);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].question).toBe('Can I cancel my order?');
    });

    it('ignores non-FAQ pages', () => {
      const pages = [makePage({
        url: 'https://example.com/about',
        headings: ['Who are we?'],
        bodyText: 'Who are we? We are a company founded in 2020.',
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(0);
    });
  });

  // Empty/edge cases

  describe('empty and edge cases', () => {
    it('returns empty array for pages without FAQ content', () => {
      const pages = [makePage({
        bodyText: 'Just a regular page with no FAQ content at all.',
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(0);
    });

    it('deduplicates by question text', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is your return policy?',
              acceptedAnswer: { '@type': 'Answer', text: 'First answer.' },
            },
            {
              '@type': 'Question',
              name: 'What is your return policy?',
              acceptedAnswer: { '@type': 'Answer', text: 'Duplicate answer.' },
            },
          ],
        }],
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(1);
    });

    it('caps at 20 entries', () => {
      const questions = Array.from({ length: 25 }, (_, i) => ({
        '@type': 'Question',
        name: `Question number ${i + 1}?`,
        acceptedAnswer: { '@type': 'Answer', text: `Answer for question ${i + 1}.` },
      }));

      const pages = [makePage({
        jsonLd: [{ '@type': 'FAQPage', mainEntity: questions }],
      })];

      const entries = extractFAQEntries(pages);
      expect(entries).toHaveLength(20);
    });
  });
});
