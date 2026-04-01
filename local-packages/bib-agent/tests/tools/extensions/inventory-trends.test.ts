/**
 * Tests for inventoryTrendsTool (Extension PoC)
 *
 * Verifies:
 * - Tool metadata (name, tier, description, parameters)
 * - Execution with populated products
 * - Execution with empty products
 * - EC-07: reads from ctx.dataContext directly
 * - Registration in ToolRegistry
 * - SecurityModule blocks in public mode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { inventoryTrendsTool } from '../../../src/tools/extensions/inventory-trends.js';
import { ToolRegistry } from '../../../src/tools/registry.js';
import { SecurityModule } from '../../../src/modules/security.js';
import type { BibToolContext } from '../../../src/tools/types.js';
import type { DataContext } from '../../../src/context/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function createMinimalDataContext(overrides: Partial<DataContext> = {}): DataContext {
  return {
    tenantId: 'test-tenant',
    tenantName: 'Test Business',
    business: { name: 'Test Business', category: 'retail', description: null, industry: null },
    contact: { phone: null, email: null, address: null, socialMedia: null },
    hours: null,
    services: [],
    products: [],
    faqs: [],
    promotions: [],
    booking: null,
    ordering: null,
    website: { scraped: null, url: null, publishStatus: null },
    brand: { voice: null, identity: null },
    _meta: {
      availableFields: ['tenantId', 'tenantName'],
      missingFields: [],
      emptyCollections: [],
      lastUpdated: new Date().toISOString(),
    },
    ...overrides,
  };
}

function createToolContext(overrides: Partial<BibToolContext> = {}): BibToolContext {
  return {
    dataContext: createMinimalDataContext(),
    tenantId: 'test-tenant',
    mode: 'dashboard',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('inventoryTrendsTool', () => {
  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  describe('metadata', () => {
    it('has correct name', () => {
      expect(inventoryTrendsTool.name).toBe('get_inventory_trends');
    });

    it('has extension tier', () => {
      expect(inventoryTrendsTool.tier).toBe('extension');
    });

    it('has a description', () => {
      expect(inventoryTrendsTool.description).toBeTruthy();
      expect(typeof inventoryTrendsTool.description).toBe('string');
    });

    it('has correct parameters schema', () => {
      expect(inventoryTrendsTool.parameters.type).toBe('object');
      expect(inventoryTrendsTool.parameters.properties.period).toBeDefined();
      expect(inventoryTrendsTool.parameters.properties.period.type).toBe('string');
      expect(inventoryTrendsTool.parameters.properties.period.enum).toEqual(['weekly', 'monthly']);
      expect(inventoryTrendsTool.parameters.required).toEqual(['period']);
    });
  });

  // ---------------------------------------------------------------------------
  // Execution — populated products
  // ---------------------------------------------------------------------------

  describe('execution with populated products', () => {
    it('returns correct summary with products', async () => {
      const ctx = createToolContext({
        dataContext: createMinimalDataContext({
          products: [
            {
              id: 'p1',
              name: 'Widget A',
              slug: 'widget-a',
              description: null,
              sku: null,
              priceInCents: 1999,
              comparePriceInCents: null,
              images: [],
              tags: [],
              isFeatured: true,
              categoryName: 'Electronics',
            },
            {
              id: 'p2',
              name: 'Widget B',
              slug: 'widget-b',
              description: null,
              sku: null,
              priceInCents: 2999,
              comparePriceInCents: null,
              images: [],
              tags: [],
              isFeatured: false,
              categoryName: 'Electronics',
            },
            {
              id: 'p3',
              name: 'Gadget C',
              slug: 'gadget-c',
              description: null,
              sku: null,
              priceInCents: 4999,
              comparePriceInCents: null,
              images: [],
              tags: [],
              isFeatured: true,
              categoryName: 'Gadgets',
            },
          ],
        }),
      });

      const result = (await inventoryTrendsTool.execute({ period: 'monthly' }, ctx)) as any;

      expect(result.period).toBe('monthly');
      expect(result.totalProducts).toBe(3);
      expect(result.featuredProducts).toBe(2);
      expect(result.categories).toEqual(expect.arrayContaining(['Electronics', 'Gadgets']));
      expect(result.categories).toHaveLength(2);
      expect(result.message).toBe('3 products across 2 categories');
    });

    it('handles weekly period', async () => {
      const ctx = createToolContext({
        dataContext: createMinimalDataContext({
          products: [
            {
              id: 'p1',
              name: 'Item',
              slug: 'item',
              description: null,
              sku: null,
              priceInCents: 100,
              comparePriceInCents: null,
              images: [],
              tags: [],
              isFeatured: false,
              categoryName: 'General',
            },
          ],
        }),
      });

      const result = (await inventoryTrendsTool.execute({ period: 'weekly' }, ctx)) as any;

      expect(result.period).toBe('weekly');
      expect(result.totalProducts).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Execution — empty products
  // ---------------------------------------------------------------------------

  describe('execution with empty products', () => {
    it('returns "No products configured" message', async () => {
      const ctx = createToolContext();

      const result = (await inventoryTrendsTool.execute({ period: 'monthly' }, ctx)) as any;

      expect(result.trends).toEqual([]);
      expect(result.period).toBe('monthly');
      expect(result.message).toBe('No products configured');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-07: reads from ctx.dataContext directly
  // ---------------------------------------------------------------------------

  describe('EC-07: DataContext direct read', () => {
    it('reads products from ctx.dataContext without invoking other tools', async () => {
      const products = [
        {
          id: 'p1',
          name: 'Direct Read Product',
          slug: 'direct-read',
          description: null,
          sku: null,
          priceInCents: 500,
          comparePriceInCents: null,
          images: [],
          tags: [],
          isFeatured: false,
          categoryName: 'TestCat',
        },
      ];

      const dataContext = createMinimalDataContext({ products });
      const ctx = createToolContext({ dataContext });

      // The tool reads directly from ctx.dataContext.products —
      // no LLM invocation, no tool call chain
      const result = (await inventoryTrendsTool.execute({ period: 'weekly' }, ctx)) as any;

      expect(result.totalProducts).toBe(1);
      expect(result.categories).toContain('TestCat');
    });
  });

  // ---------------------------------------------------------------------------
  // ToolRegistry integration
  // ---------------------------------------------------------------------------

  describe('ToolRegistry integration', () => {
    beforeEach(() => {
      ToolRegistry.resetInstance();
    });

    it('can be registered in ToolRegistry', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(inventoryTrendsTool);

      expect(registry.has('get_inventory_trends')).toBe(true);
    });

    it('can be retrieved by name', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(inventoryTrendsTool);

      const retrieved = registry.get('get_inventory_trends');
      expect(retrieved).toBe(inventoryTrendsTool);
    });

    it('appears in getByTier("extension")', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(inventoryTrendsTool);

      const extensionTools = registry.getByTier('extension');
      expect(extensionTools).toHaveLength(1);
      expect(extensionTools[0].name).toBe('get_inventory_trends');
    });
  });

  // ---------------------------------------------------------------------------
  // SecurityModule — blocked in public mode
  // ---------------------------------------------------------------------------

  describe('SecurityModule public mode blocking', () => {
    it('is blocked in public mode', () => {
      const security = new SecurityModule('public');
      const allowed = security.isToolAllowed('get_inventory_trends', 'extension');

      expect(allowed).toBe(false);
    });

    it('is allowed in dashboard mode', () => {
      const security = new SecurityModule('dashboard');
      const allowed = security.isToolAllowed('get_inventory_trends', 'extension');

      expect(allowed).toBe(true);
    });
  });
});
