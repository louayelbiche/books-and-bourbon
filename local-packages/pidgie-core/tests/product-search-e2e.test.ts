/**
 * End-to-end product search verification
 *
 * Tests with realistic product catalogs, complex queries,
 * filter combinations, and edge cases to catch regressions.
 */

import { describe, it, expect } from 'vitest';
import { searchProductsTool } from '../src/tools/products.js';
import type { Product, PidgieContext } from '../src/types/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

function p(overrides: Partial<Product> & { name: string; id?: string }): Product {
  return {
    id: overrides.id ?? overrides.name.toLowerCase().replace(/\s+/g, '-'),
    description: overrides.description ?? '',
    price: overrides.price ?? { amount: 25, currency: 'USD' },
    available: overrides.available ?? true,
    featured: overrides.featured ?? false,
    ...overrides,
  };
}

function ctx(products: Product[]): PidgieContext {
  return {
    business: {
      id: 'shop', name: 'Test Shop', description: 'Test', category: 'retail',
      products, services: [], faqs: [], contact: {},
    },
    timestamp: new Date(),
    sessionId: 's1', visitorId: 'v1',
  } as unknown as PidgieContext;
}

type SearchResult = {
  products: Array<{ id: string; name: string; available: boolean; price: string }>;
  totalCount: number;
  totalMatching: number;
  hasMore?: boolean;
  categories?: string[];
};

async function search(products: Product[], args: Record<string, unknown>): Promise<SearchResult> {
  return (await searchProductsTool.execute!(args, ctx(products) as never)) as SearchResult;
}

// ── Realistic product catalog ────────────────────────────────────────

const catalog: Product[] = [
  p({ name: 'Vintage Red Leather Jacket', description: 'Classic vintage motorcycle jacket in deep red leather', category: 'Outerwear', tags: ['vintage', 'leather', 'red', 'motorcycle'], price: { amount: 299, currency: 'USD' }, available: true, featured: true }),
  p({ name: 'Red Cotton T-Shirt', description: 'Comfortable everyday red t-shirt', category: 'Tops', tags: ['red', 'cotton', 'casual'], price: { amount: 29, currency: 'USD' }, available: true }),
  p({ name: 'Blue Denim Jacket', description: 'Faded blue denim trucker jacket', category: 'Outerwear', tags: ['blue', 'denim', 'casual'], price: { amount: 89, currency: 'USD' }, available: true }),
  p({ name: 'Black Leather Belt', description: 'Premium black leather belt with silver buckle', category: 'Accessories', tags: ['black', 'leather', 'premium'], price: { amount: 59, currency: 'USD' }, available: true }),
  p({ name: 'Red Silk Scarf', description: 'Elegant red silk scarf for formal occasions', category: 'Accessories', tags: ['red', 'silk', 'formal', 'elegant'], price: { amount: 79, currency: 'USD' }, available: false }),
  p({ name: 'White Canvas Sneakers', description: 'Clean white canvas sneakers, classic style', category: 'Footwear', tags: ['white', 'canvas', 'casual', 'classic'], price: { amount: 69, currency: 'USD' }, available: true }),
  p({ name: 'Leather Crossbody Bag', description: 'Brown leather crossbody bag with adjustable strap', category: 'Bags', tags: ['leather', 'brown', 'crossbody'], price: { amount: 149, currency: 'USD' }, available: true }),
  p({ name: 'Navy Wool Sweater', description: 'Warm navy blue wool sweater, cable knit pattern', category: 'Tops', tags: ['navy', 'wool', 'warm', 'cable-knit'], price: { amount: 119, currency: 'USD' }, available: true }),
  p({ name: 'Red Running Shoes', description: 'Lightweight red running shoes with breathable mesh', category: 'Footwear', tags: ['red', 'running', 'athletic', 'mesh'], price: { amount: 129, currency: 'USD' }, available: false }),
  p({ name: 'Vintage Denim Shorts', description: 'Distressed vintage denim shorts', category: 'Bottoms', tags: ['vintage', 'denim', 'distressed', 'shorts'], price: { amount: 49, currency: 'USD' }, available: true }),
];

// ── Multi-word query: "red leather" ─────────────────────────────────

describe('E2E: "red leather" query', () => {
  it('top result matches BOTH "red" and "leather"', async () => {
    const result = await search(catalog, { query: 'red leather', available_only: false });
    // "Vintage Red Leather Jacket" has both "red" and "leather" in name, description, tags
    expect(result.products[0].name).toBe('Vintage Red Leather Jacket');
  });

  it('returns multiple results matching at least one term', async () => {
    const result = await search(catalog, { query: 'red leather', available_only: false });
    expect(result.totalCount).toBeGreaterThan(3);

    const names = result.products.map((p) => p.name);
    // Should include items matching "red" OR "leather"
    expect(names).toContain('Red Cotton T-Shirt'); // red
    expect(names).toContain('Black Leather Belt'); // leather
    expect(names).toContain('Leather Crossbody Bag'); // leather
  });

  it('available products come before unavailable with default sort', async () => {
    const result = await search(catalog, { query: 'red leather', available_only: false });
    // Find first unavailable product
    const firstUnavailableIdx = result.products.findIndex((p) => !p.available);
    const lastAvailableIdx = result.products.findLastIndex((p) => p.available);

    if (firstUnavailableIdx !== -1 && lastAvailableIdx !== -1) {
      expect(lastAvailableIdx).toBeLessThan(firstUnavailableIdx);
    }
  });
});

// ── Multi-word query: "vintage denim" ───────────────────────────────

describe('E2E: "vintage denim" query', () => {
  it('product matching both terms ranks highest', async () => {
    const result = await search(catalog, { query: 'vintage denim' });
    // "Vintage Denim Shorts" matches both in name
    expect(result.products[0].name).toBe('Vintage Denim Shorts');
  });

  it('also finds products matching only one term', async () => {
    const result = await search(catalog, { query: 'vintage denim' });
    const names = result.products.map((p) => p.name);
    // "Vintage Red Leather Jacket" matches "vintage" only
    expect(names).toContain('Vintage Red Leather Jacket');
    // "Blue Denim Jacket" matches "denim" only
    expect(names).toContain('Blue Denim Jacket');
  });
});

// ── Query + filter combinations ─────────────────────────────────────

describe('E2E: query + filter combinations', () => {
  it('query + category filter', async () => {
    const result = await search(catalog, { query: 'red', category: 'Accessories' });
    const names = result.products.map((p) => p.name);

    // Only accessories matching "red"
    // "Red Silk Scarf" matches but is unavailable (filtered by default available_only=true)
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
    // Should NOT include non-accessories
    expect(names).not.toContain('Red Cotton T-Shirt');
    expect(names).not.toContain('Vintage Red Leather Jacket');
  });

  it('query + price range', async () => {
    const result = await search(catalog, { query: 'leather', min_price: 100 });
    const names = result.products.map((p) => p.name);

    // Only leather items >= $100
    expect(names).toContain('Vintage Red Leather Jacket'); // $299
    expect(names).toContain('Leather Crossbody Bag'); // $149
    expect(names).not.toContain('Black Leather Belt'); // $59
  });

  it('query + featured_only', async () => {
    const result = await search(catalog, { query: 'red', featured_only: true });
    const names = result.products.map((p) => p.name);

    // Only featured items matching "red"
    expect(names).toContain('Vintage Red Leather Jacket'); // featured: true
    expect(names).not.toContain('Red Cotton T-Shirt'); // featured: false
  });

  it('query + limit', async () => {
    const result = await search(catalog, { query: 'red', limit: 2, available_only: false });
    expect(result.products.length).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(result.totalMatching).toBeGreaterThan(2);
  });

  it('query + explicit sort_by overrides availability sort', async () => {
    const result = await search(catalog, {
      query: 'leather',
      sort_by: 'price_low',
      available_only: false,
    });

    // Should be sorted by price ascending
    const prices = result.products.map((p) => {
      const match = typeof p.price === 'string' ? p.price.match(/[\d.]+/) : null;
      return match ? parseFloat(match[0]) : 0;
    });

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('E2E: product search edge cases', () => {
  it('single-character query works', async () => {
    // Should not crash or hang
    const result = await search(catalog, { query: 'r' });
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('query with special characters does not crash', async () => {
    const result = await search(catalog, { query: 'red & blue "test"' });
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('very long query does not crash', async () => {
    const longQuery = 'red leather vintage premium quality authentic genuine handmade artisan crafted';
    const result = await search(catalog, { query: longQuery });
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('query matching nothing returns empty results', async () => {
    const result = await search(catalog, { query: 'xyznonexistent123' });
    expect(result.totalCount).toBe(0);
    expect(result.products).toEqual([]);
  });

  it('empty catalog returns empty results for any query', async () => {
    const result = await search([], { query: 'red dress' });
    expect(result.totalCount).toBe(0);
    expect(result.products).toEqual([]);
  });

  it('all products unavailable returns empty with default available_only', async () => {
    const unavailable = catalog.map((prod) => ({ ...prod, available: false }));
    const result = await search(unavailable, { query: 'red' });
    expect(result.totalCount).toBe(0);
  });

  it('categories list always reflects full catalog (not just filtered)', async () => {
    const result = await search(catalog, { query: 'red', available_only: false });
    expect(result.categories).toBeDefined();
    // Should include categories from ALL products, not just search results
    expect(result.categories!.length).toBeGreaterThanOrEqual(4);
  });
});

// ── Availability sort stability ─────────────────────────────────────

describe('E2E: availability sort stability', () => {
  it('within available group, relevance ordering is preserved', async () => {
    // Create products where relevance should determine order within availability group
    const products = [
      p({ name: 'Generic Item', description: 'basic item', available: true }),
      p({ name: 'Red Spectacular Widget', description: 'amazing red widget with red accents', tags: ['red'], available: true }),
      p({ name: 'Red Simple Thing', description: 'a thing', available: true }),
    ];

    const result = await search(products, { query: 'red' });
    const names = result.products.map((p) => p.name);

    // "Red Spectacular Widget" should rank higher (more "red" matches) than "Red Simple Thing"
    const spectIdx = names.indexOf('Red Spectacular Widget');
    const simpIdx = names.indexOf('Red Simple Thing');
    expect(spectIdx).toBeLessThan(simpIdx);
  });
});
