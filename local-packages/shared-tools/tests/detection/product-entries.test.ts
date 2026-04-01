import { describe, it, expect } from 'vitest';
import type { ScrapedPageInput } from '../../src/detection/types.js';
import { extractProductEntries } from '../../src/detection/signals.js';

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

describe('extractProductEntries', () => {
  // ─── JSON-LD extraction ────────────────────────────────

  describe('JSON-LD extraction', () => {
    it('extracts Product with offers', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Product',
          name: 'URIT-5160 Hematology Analyzer',
          description: 'Automated hematology analyzer',
          image: 'https://example.com/urit.jpg',
          offers: {
            '@type': 'Offer',
            price: '32000',
            priceCurrency: 'TND',
          },
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('URIT-5160 Hematology Analyzer');
      expect(entries[0].priceInCents).toBe(3200000);
      expect(entries[0].currency).toBe('TND');
      expect(entries[0].description).toBe('Automated hematology analyzer');
      expect(entries[0].imageUrl).toBe('https://example.com/urit.jpg');
      expect(entries[0].extractionMethod).toBe('json-ld');
    });

    it('extracts Product with no price', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Product',
          name: 'Custom Widget',
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].priceInCents).toBe(0);
      expect(entries[0].currency).toBeUndefined();
    });

    it('extracts ItemList products', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'ItemList',
          itemListElement: [
            { '@type': 'Product', name: 'Widget A', offers: { price: '10.99', priceCurrency: 'USD' } },
            { '@type': 'Product', name: 'Widget B', offers: { price: '24.99', priceCurrency: 'USD' } },
          ],
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(2);
      expect(entries[0].name).toBe('Widget A');
      expect(entries[0].priceInCents).toBe(1099);
      expect(entries[1].name).toBe('Widget B');
      expect(entries[1].priceInCents).toBe(2499);
    });

    it('extracts from @graph arrays', () => {
      const pages = [makePage({
        jsonLd: [{
          '@graph': [
            { '@type': 'Product', name: 'Graph Product', offers: { price: '50', priceCurrency: 'EUR' } },
          ],
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('Graph Product');
      expect(entries[0].currency).toBe('EUR');
    });

    it('handles offers as array', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Product',
          name: 'Multi Offer',
          offers: [
            { price: '15.00', priceCurrency: 'USD' },
            { price: '20.00', priceCurrency: 'USD' },
          ],
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].priceInCents).toBe(1500); // takes first offer
    });
  });

  // ─── Link text extraction ──────────────────────────────

  describe('link text extraction', () => {
    it('extracts product names from links to product URLs', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/urit-5160', text: 'URIT-5160 Hematology Analyzer' },
        ],
        bodyText: 'Our catalog includes the URIT-5160 Hematology Analyzer priced at 32,000 DT.',
      })];

      const entries = extractProductEntries(pages);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      const entry = entries.find(e => e.extractionMethod === 'link-text');
      expect(entry).toBeDefined();
      expect(entry!.name).toBe('URIT-5160 Hematology Analyzer');
      expect(entry!.priceInCents).toBe(3200000);
      expect(entry!.currency).toBe('TND');
    });

    it('ignores links without product URL patterns', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/about', text: 'About Us' },
          { href: 'https://example.com/contact', text: 'Contact' },
        ],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(0);
    });
  });

  // ─── Price parsing ─────────────────────────────────────

  describe('price parsing', () => {
    it('parses USD prices', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/item', text: 'Deluxe Widget' },
        ],
        bodyText: 'The Deluxe Widget costs $1,500.00',
      })];

      const entries = extractProductEntries(pages);
      const entry = entries.find(e => e.name === 'Deluxe Widget');
      expect(entry).toBeDefined();
      expect(entry!.priceInCents).toBe(150000);
      expect(entry!.currency).toBe('USD');
    });

    it('parses EUR prices', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/item', text: 'Euro Item' },
        ],
        bodyText: 'Euro Item is available for 500 EUR',
      })];

      const entries = extractProductEntries(pages);
      const entry = entries.find(e => e.name === 'Euro Item');
      expect(entry).toBeDefined();
      expect(entry!.priceInCents).toBe(50000);
      expect(entry!.currency).toBe('EUR');
    });

    it('parses DT/TND prices', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/equipment/analyzer', text: 'Blood Analyzer' },
        ],
        bodyText: 'Blood Analyzer 8,000 DT available now',
      })];

      const entries = extractProductEntries(pages);
      const entry = entries.find(e => e.name === 'Blood Analyzer');
      expect(entry).toBeDefined();
      expect(entry!.priceInCents).toBe(800000);
      expect(entry!.currency).toBe('TND');
    });

    it('returns 0 when no price found', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/mystery', text: 'Mystery Product' },
        ],
        bodyText: 'The Mystery Product is available upon request.',
      })];

      const entries = extractProductEntries(pages);
      const entry = entries.find(e => e.name === 'Mystery Product');
      expect(entry).toBeDefined();
      expect(entry!.priceInCents).toBe(0);
    });

    it('parses GBP symbol prices', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/british', text: 'British Widget' },
        ],
        bodyText: 'British Widget for only \u00a399.99',
      })];

      const entries = extractProductEntries(pages);
      const entry = entries.find(e => e.name === 'British Widget');
      expect(entry).toBeDefined();
      expect(entry!.priceInCents).toBe(9999);
      expect(entry!.currency).toBe('GBP');
    });
  });

  // ─── URL path extraction ───────────────────────────────

  describe('URL path extraction', () => {
    it('extracts name from URL path for links with no useful text', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://manufacturer.com/products/cyclo_mixer/', text: 'View Details' },
        ],
      })];

      const entries = extractProductEntries(pages);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      const entry = entries.find(e => e.extractionMethod === 'url-path');
      expect(entry).toBeDefined();
      expect(entry!.name).toBe('Cyclo Mixer');
      expect(entry!.priceInCents).toBe(0);
    });

    it('skips URL path for links with useful anchor text', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://manufacturer.com/products/cyclo_mixer/', text: 'Cyclo Mixer Pro 3000' },
        ],
      })];

      const entries = extractProductEntries(pages);
      // Should be extracted as link-text, not url-path
      const urlPathEntry = entries.find(e => e.extractionMethod === 'url-path');
      expect(urlPathEntry).toBeUndefined();
    });
  });

  // ─── Heading text extraction ───────────────────────────

  describe('heading text extraction', () => {
    it('extracts products from headings in product sections with prices', () => {
      const pages = [makePage({
        url: 'https://example.com',
        headings: ['Products', 'URIT-5160 Analyzer', 'GE 300 Device', 'About'],
        bodyText: 'URIT-5160 Analyzer $29,000 and GE 300 Device $8,000 available',
      })];

      const entries = extractProductEntries(pages);
      const headingEntries = entries.filter(e => e.extractionMethod === 'heading-text');
      expect(headingEntries.length).toBe(2);
      expect(headingEntries[0].name).toBe('URIT-5160 Analyzer');
      expect(headingEntries[1].name).toBe('GE 300 Device');
    });

    it('skips headings without nearby prices', () => {
      const pages = [makePage({
        url: 'https://example.com',
        headings: ['Products', 'Some Category Label', 'About'],
        bodyText: 'We offer various products for your needs.',
      })];

      const entries = extractProductEntries(pages);
      const headingEntries = entries.filter(e => e.extractionMethod === 'heading-text');
      expect(headingEntries).toHaveLength(0);
    });
  });

  // ─── Deduplication ─────────────────────────────────────

  describe('deduplication', () => {
    it('deduplicates by normalized name', () => {
      const pages = [makePage({
        jsonLd: [
          { '@type': 'Product', name: 'Widget Pro', offers: { price: '10', priceCurrency: 'USD' } },
        ],
        linkDetails: [
          { href: 'https://example.com/products/widget-pro', text: 'Widget Pro' },
        ],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].extractionMethod).toBe('json-ld'); // JSON-LD wins (higher priority)
    });

    it('treats case-different names as duplicates', () => {
      const pages = [makePage({
        jsonLd: [
          { '@type': 'Product', name: 'Premium Widget', offers: { price: '10', priceCurrency: 'USD' } },
          { '@type': 'Product', name: 'PREMIUM WIDGET', offers: { price: '20', priceCurrency: 'USD' } },
        ],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
    });
  });

  // ─── Product cap ───────────────────────────────────────

  describe('product cap', () => {
    it('caps at 20 products', () => {
      const products = Array.from({ length: 30 }, (_, i) => ({
        '@type': 'Product' as const,
        name: `Product ${i + 1}`,
        offers: { price: String(10 + i), priceCurrency: 'USD' },
      }));

      const pages = [makePage({ jsonLd: products })];
      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(20);
    });
  });

  // ─── Backward compatibility ────────────────────────────

  describe('backward compatibility', () => {
    it('returns empty array for pages without linkDetails or jsonLd', () => {
      const pages = [makePage({
        bodyText: 'Just a regular page',
        headings: ['Welcome'],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(0);
    });

    it('returns empty array for empty pages', () => {
      const entries = extractProductEntries([]);
      expect(entries).toHaveLength(0);
    });
  });

  // ─── Noise filtering ──────────────────────────────────

  describe('noise filtering', () => {
    it('rejects UI chrome anchor texts', () => {
      const noiseTexts = ['View Details', 'Add to Cart', 'Learn More', 'Buy Now', 'Shop Now', 'Read More'];
      const pages = [makePage({
        linkDetails: noiseTexts.map(text => ({
          href: 'https://example.com/products/some-long-product-name-here',
          text,
        })),
      })];

      const entries = extractProductEntries(pages);
      // All noise texts should be rejected as link-text
      const linkTextEntries = entries.filter(e => e.extractionMethod === 'link-text');
      expect(linkTextEntries).toHaveLength(0);
    });

    it('rejects very short anchor texts', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/x', text: 'Go' },
        ],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(0);
    });
  });

  // ─── Image matching ───────────────────────────────────

  describe('image matching', () => {
    it('matches product image from imageDetails by alt text', () => {
      const pages = [makePage({
        linkDetails: [
          { href: 'https://example.com/products/widget', text: 'Super Widget' },
        ],
        imageDetails: [
          { src: 'https://example.com/img/super-widget.jpg', alt: 'Super Widget' },
          { src: 'https://example.com/img/logo.jpg', alt: 'Company Logo' },
        ],
        bodyText: 'The Super Widget is our best seller.',
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].imageUrl).toBe('https://example.com/img/super-widget.jpg');
    });
  });

  // ─── Service JSON-LD extraction ────────────────────────

  describe('Service JSON-LD extraction', () => {
    it('extracts @type: Service like Product', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Service',
          name: 'Deep Tissue Massage',
          description: 'A thorough massage targeting deep muscle layers',
          offers: {
            '@type': 'Offer',
            price: '80',
            priceCurrency: 'USD',
          },
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('Deep Tissue Massage');
      expect(entries[0].priceInCents).toBe(8000);
      expect(entries[0].currency).toBe('USD');
      expect(entries[0].extractionMethod).toBe('json-ld');
    });
  });

  // ─── LocalBusiness with makesOffer ─────────────────────

  describe('LocalBusiness with makesOffer', () => {
    it('extracts products from makesOffer > itemOffered', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Restaurant',
          name: 'Cafe Delight',
          makesOffer: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Product',
                name: 'House Espresso',
                offers: { price: '3.50', priceCurrency: 'USD' },
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Product',
                name: 'Avocado Toast',
                offers: { price: '12', priceCurrency: 'USD' },
              },
            },
          ],
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(2);
      expect(entries[0].name).toBe('House Espresso');
      expect(entries[0].priceInCents).toBe(350);
      expect(entries[1].name).toBe('Avocado Toast');
      expect(entries[1].priceInCents).toBe(1200);
    });
  });

  // ─── Menu JSON-LD extraction ──────────────────────────

  describe('Menu JSON-LD extraction', () => {
    it('extracts MenuItems from Menu > MenuSection', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Menu',
          hasMenuSection: [
            {
              '@type': 'MenuSection',
              name: 'Appetizers',
              hasMenuItem: [
                {
                  '@type': 'MenuItem',
                  name: 'Spring Rolls',
                  description: 'Crispy vegetable spring rolls',
                  offers: { price: '8', priceCurrency: 'USD' },
                },
                {
                  '@type': 'MenuItem',
                  name: 'Soup of the Day',
                  offers: { price: '6', priceCurrency: 'USD' },
                },
              ],
            },
            {
              '@type': 'MenuSection',
              name: 'Mains',
              hasMenuItem: [
                {
                  '@type': 'MenuItem',
                  name: 'Grilled Salmon',
                  offers: { price: '22', priceCurrency: 'USD' },
                },
              ],
            },
          ],
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(3);
      expect(entries[0].name).toBe('Spring Rolls');
      expect(entries[0].priceInCents).toBe(800);
      expect(entries[0].description).toBe('Crispy vegetable spring rolls');
      expect(entries[1].name).toBe('Soup of the Day');
      expect(entries[2].name).toBe('Grilled Salmon');
      expect(entries[2].priceInCents).toBe(2200);
    });

    it('handles MenuItem without price', () => {
      const pages = [makePage({
        jsonLd: [{
          '@type': 'Menu',
          hasMenuSection: [{
            '@type': 'MenuSection',
            name: 'Specials',
            hasMenuItem: [{
              '@type': 'MenuItem',
              name: 'Chef Special',
            }],
          }],
        }],
      })];

      const entries = extractProductEntries(pages);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('Chef Special');
      expect(entries[0].priceInCents).toBe(0);
    });
  });
});
