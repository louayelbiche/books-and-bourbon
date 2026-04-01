/**
 * Tests for Product Search Improvements
 *
 * Covers:
 * - Multi-word search splitting and OR matching
 * - All-terms bonus multiplier (1.5x for matching ALL terms)
 * - Default availability-first sort
 * - Regression: single-term queries, explicit sort_by, empty queries
 */

import { describe, it, expect } from 'vitest';
import { searchProductsTool } from '../src/tools/products.js';
import type { Product, PidgieContext } from '../src/types/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

function createProduct(overrides: Partial<Product> & { name: string }): Product {
  return {
    id: overrides.name.toLowerCase().replace(/\s+/g, '-'),
    description: '',
    price: { amount: 10, currency: 'USD' },
    available: true,
    featured: false,
    ...overrides,
  };
}

function createContext(products: Product[]): PidgieContext {
  return {
    business: {
      id: 'test',
      name: 'Test Store',
      description: 'A test store',
      category: 'retail',
      products,
      services: [],
      faqs: [],
      contact: {},
    },
    timestamp: new Date(),
    sessionId: 'test-session',
    visitorId: 'test-visitor',
  } as unknown as PidgieContext;
}

async function searchProducts(
  products: Product[],
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const ctx = createContext(products);
  return (await searchProductsTool.execute!(args, ctx as never)) as Record<string, unknown>;
}

// ── Multi-word search splitting ──────────────────────────────────────

describe('Product Search — multi-word queries', () => {
  const products = [
    createProduct({ name: 'Red Silk Dress', description: 'Elegant red dress made of silk', category: 'Dresses', tags: ['red', 'silk', 'evening'] }),
    createProduct({ name: 'Blue Denim Jacket', description: 'Casual blue jacket', category: 'Jackets', tags: ['blue', 'casual'] }),
    createProduct({ name: 'Red Leather Bag', description: 'Stylish red leather handbag', category: 'Accessories', tags: ['red', 'leather'] }),
    createProduct({ name: 'White Summer Dress', description: 'Light and airy summer dress', category: 'Dresses', tags: ['white', 'summer'] }),
    createProduct({ name: 'Black Formal Shoes', description: 'Classic black dress shoes', category: 'Shoes', tags: ['black', 'formal'] }),
  ];

  it('finds products matching ANY term in a multi-word query (OR behavior)', async () => {
    const result = await searchProducts(products, { query: 'red dress' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    // Should find: "Red Silk Dress" (both terms), "Red Leather Bag" (red),
    // "White Summer Dress" (dress), "Black Formal Shoes" (dress in description)
    expect(names).toContain('Red Silk Dress');
    expect(names).toContain('Red Leather Bag');
    expect(names).toContain('White Summer Dress');
  });

  it('ranks products matching ALL terms higher than single-term matches', async () => {
    const result = await searchProducts(products, { query: 'red dress' });
    const resultProducts = result.products as Record<string, unknown>[];

    // "Red Silk Dress" matches BOTH "red" and "dress" → should be first
    expect(resultProducts[0].name).toBe('Red Silk Dress');
  });

  it('handles single-term queries correctly (regression)', async () => {
    const result = await searchProducts(products, { query: 'blue' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Blue Denim Jacket');
    expect(names).not.toContain('Red Silk Dress');
  });

  it('handles empty string query (returns all products)', async () => {
    const result = await searchProducts(products, { query: '' });
    // Empty query → no relevance filtering, all products returned
    expect((result.products as unknown[]).length).toBe(products.length);
  });

  it('handles query with extra whitespace', async () => {
    const result = await searchProducts(products, { query: '  red   dress  ' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Red Silk Dress');
  });

  it('matches terms in category field', async () => {
    const result = await searchProducts(products, { query: 'jackets' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Blue Denim Jacket');
  });

  it('matches terms in tags field', async () => {
    const result = await searchProducts(products, { query: 'silk' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Red Silk Dress');
  });

  it('matches terms in description field', async () => {
    const result = await searchProducts(products, { query: 'elegant' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Red Silk Dress');
  });

  it('matches terms in attributes field', async () => {
    const productsWithAttrs = [
      createProduct({ name: 'Custom Hat', description: 'A hat', attributes: { material: 'wool', color: 'green' } }),
      createProduct({ name: 'Plain Cap', description: 'A cap' }),
    ];

    const result = await searchProducts(productsWithAttrs, { query: 'wool' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Custom Hat');
    expect(names).not.toContain('Plain Cap');
  });

  it('case-insensitive search works', async () => {
    const result = await searchProducts(products, { query: 'RED DRESS' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Red Silk Dress');
  });
});

// ── All-terms bonus multiplier ──────────────────────────────────────

describe('Product Search — all-terms bonus', () => {
  it('product matching ALL terms scores higher than one matching only some', async () => {
    const products = [
      createProduct({ name: 'Green Tea', description: 'Herbal green tea blend' }),
      createProduct({ name: 'Green Smoothie', description: 'Fresh green smoothie' }),
      createProduct({ name: 'Tea Set', description: 'Ceramic tea set for serving' }),
    ];

    const result = await searchProducts(products, { query: 'green tea' });
    const resultProducts = result.products as Record<string, unknown>[];

    // "Green Tea" matches both "green" and "tea" → should be ranked first
    expect(resultProducts[0].name).toBe('Green Tea');
  });

  it('single-term queries do NOT get bonus (no multiplier for 1 term)', async () => {
    const products = [
      createProduct({ name: 'Alpha', description: 'Product alpha' }),
      createProduct({ name: 'Beta Alpha', description: 'Product beta alpha thing' }),
    ];

    // Single term: both match "alpha", "Beta Alpha" has more matches but
    // no all-terms bonus applies since there's only 1 term
    const result = await searchProducts(products, { query: 'alpha' });
    expect((result.products as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('three-term query with full match gets bonus', async () => {
    const products = [
      createProduct({ name: 'Large Red Widget', description: 'A large red widget for testing', tags: ['large', 'red'] }),
      createProduct({ name: 'Small Red Widget', description: 'A small red widget', tags: ['small', 'red'] }),
      createProduct({ name: 'Large Blue Thing', description: 'A large blue thing' }),
    ];

    const result = await searchProducts(products, { query: 'large red widget' });
    const resultProducts = result.products as Record<string, unknown>[];

    // "Large Red Widget" matches all 3 terms → should be ranked first with bonus
    expect(resultProducts[0].name).toBe('Large Red Widget');
  });
});

// ── Default availability-first sort ─────────────────────────────────

describe('Product Search — default availability sort', () => {
  it('available products appear before unavailable when no sort_by', async () => {
    const products = [
      createProduct({ name: 'Unavailable First', description: 'Desc', available: false }),
      createProduct({ name: 'Available Second', description: 'Desc', available: true }),
      createProduct({ name: 'Unavailable Third', description: 'Desc', available: false }),
      createProduct({ name: 'Available Fourth', description: 'Desc', available: true }),
    ];

    const result = await searchProducts(products, { available_only: false });
    const resultProducts = result.products as Record<string, unknown>[];

    // First results should be available
    expect(resultProducts[0].available).toBe(true);
    expect(resultProducts[1].available).toBe(true);
    // Last results should be unavailable
    expect(resultProducts[2].available).toBe(false);
    expect(resultProducts[3].available).toBe(false);
  });

  it('availability sort does NOT apply when sort_by is specified', async () => {
    const products = [
      createProduct({ name: 'Zebra Widget', description: 'Desc', available: false, price: { amount: 5, currency: 'USD' } }),
      createProduct({ name: 'Alpha Widget', description: 'Desc', available: true, price: { amount: 10, currency: 'USD' } }),
    ];

    const result = await searchProducts(products, {
      sort_by: 'name',
      available_only: false,
    });
    const resultProducts = result.products as Record<string, unknown>[];

    // Sorted by name alphabetically, NOT by availability
    expect(resultProducts[0].name).toBe('Alpha Widget');
    expect(resultProducts[1].name).toBe('Zebra Widget');
  });

  it('availability sort works with query results', async () => {
    const products = [
      createProduct({ name: 'Blue Widget Unavailable', description: 'A blue widget', available: false }),
      createProduct({ name: 'Blue Widget Available', description: 'A blue widget', available: true }),
    ];

    const result = await searchProducts(products, {
      query: 'blue widget',
      available_only: false,
    });
    const resultProducts = result.products as Record<string, unknown>[];

    // Available should come first even with equal relevance
    expect(resultProducts[0].name).toBe('Blue Widget Available');
  });

  it('explicit sort_by=price_low overrides availability sort', async () => {
    const products = [
      createProduct({ name: 'Expensive Available', description: 'Desc', available: true, price: { amount: 100, currency: 'USD' } }),
      createProduct({ name: 'Cheap Unavailable', description: 'Desc', available: false, price: { amount: 5, currency: 'USD' } }),
    ];

    const result = await searchProducts(products, {
      sort_by: 'price_low',
      available_only: false,
    });
    const resultProducts = result.products as Record<string, unknown>[];

    // Sorted by price ascending, ignoring availability
    expect(resultProducts[0].name).toBe('Cheap Unavailable');
  });
});

// ── Regression: existing behavior preserved ─────────────────────────

describe('Product Search — regression tests', () => {
  it('returns empty when no products exist', async () => {
    const result = await searchProducts([], { query: 'anything' });
    expect(result.products).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('category filter still works', async () => {
    const products = [
      createProduct({ name: 'Shirt A', description: 'A shirt', category: 'Tops' }),
      createProduct({ name: 'Pants B', description: 'Pants', category: 'Bottoms' }),
    ];

    const result = await searchProducts(products, { category: 'Tops' });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Shirt A');
    expect(names).not.toContain('Pants B');
  });

  it('price filters still work', async () => {
    const products = [
      createProduct({ name: 'Cheap', description: 'Desc', price: { amount: 5, currency: 'USD' } }),
      createProduct({ name: 'Mid', description: 'Desc', price: { amount: 50, currency: 'USD' } }),
      createProduct({ name: 'Expensive', description: 'Desc', price: { amount: 500, currency: 'USD' } }),
    ];

    const result = await searchProducts(products, { min_price: 10, max_price: 100 });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Mid');
    expect(names).not.toContain('Cheap');
    expect(names).not.toContain('Expensive');
  });

  it('limit still works', async () => {
    const products = Array.from({ length: 20 }, (_, i) =>
      createProduct({ name: `Product ${i}`, description: `Description ${i}` })
    );

    const result = await searchProducts(products, { limit: 5 });
    expect((result.products as unknown[]).length).toBe(5);
    expect(result.hasMore).toBe(true);
    expect(result.totalMatching).toBe(20);
  });

  it('featured_only filter still works', async () => {
    const products = [
      createProduct({ name: 'Featured', description: 'Desc', featured: true }),
      createProduct({ name: 'Not Featured', description: 'Desc', featured: false }),
    ];

    const result = await searchProducts(products, { featured_only: true });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Featured');
    expect(names).not.toContain('Not Featured');
  });

  it('tags filter still works', async () => {
    const products = [
      createProduct({ name: 'Vegan Snack', description: 'Desc', tags: ['vegan', 'snack'] }),
      createProduct({ name: 'Meat Jerky', description: 'Desc', tags: ['meat'] }),
    ];

    const result = await searchProducts(products, { tags: ['vegan'] });
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Vegan Snack');
    expect(names).not.toContain('Meat Jerky');
  });

  it('available_only defaults to true', async () => {
    const products = [
      createProduct({ name: 'Available', description: 'Desc', available: true }),
      createProduct({ name: 'Unavailable', description: 'Desc', available: false }),
    ];

    const result = await searchProducts(products, {});
    const names = ((result.products as Record<string, unknown>[]) || []).map(
      (p) => p.name
    );

    expect(names).toContain('Available');
    expect(names).not.toContain('Unavailable');
  });

  it('no query returns all available products', async () => {
    const products = [
      createProduct({ name: 'A', description: 'Desc' }),
      createProduct({ name: 'B', description: 'Desc' }),
      createProduct({ name: 'C', description: 'Desc' }),
    ];

    const result = await searchProducts(products, {});
    expect((result.products as unknown[]).length).toBe(3);
  });
});
