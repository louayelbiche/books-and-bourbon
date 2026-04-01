import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCardFromDB,
  buildCardsFromDB,
  registerCardMapper,
  validateRecordId,
  type CardQueryFn,
  type CardValidationLogger,
  type CardDropLog,
  type CardRenderLog,
} from '../src/validation/index.js';

/**
 * Tests for card retrieval tool flow.
 *
 * These tests exercise the full validation pipeline as used by
 * show_product_card, show_service_card, and show_event_card tools.
 */

const validProductId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validServiceId = 'b1ffcd00-0d1c-4f09-bc7e-7cc0ce491b22';
const validEventId = 'c2aade11-1e2d-4a10-ad8f-8dd1df502c33';
const tenantId = 'biz-001';

// Mock business data (simulates PidgieContext.business)
const mockProducts = [
  {
    id: validProductId,
    name: 'Premium Coffee Blend',
    description: 'Single-origin Arabica beans',
    category: 'Coffee',
    price: { amount: 24.99, currency: 'USD', compareAt: 29.99 },
    images: [
      { url: 'https://cdn.example.com/coffee.jpg', alt: 'Coffee bag', primary: true },
    ],
    available: true,
    stockStatus: 'in_stock' as const,
    featured: true,
    variants: [
      { id: 'v1', name: '250g', price: { amount: 12.99, currency: 'USD' }, available: true },
      { id: 'v2', name: '500g', price: { amount: 24.99, currency: 'USD' }, available: true },
    ],
    tags: ['coffee', 'premium', 'arabica'],
  },
];

const mockServices = [
  {
    id: validServiceId,
    name: 'Deep Tissue Massage',
    description: '60-minute therapeutic massage',
    category: 'Massage',
    price: { amount: 89.0, currency: 'USD', unit: 'per session' },
    duration: 60,
    available: true,
  },
];

const mockEvents = [
  {
    id: validEventId,
    name: 'Coffee Tasting Workshop',
    description: 'Learn to taste like a pro',
    date: '2026-03-15',
    startTime: '14:00',
    endTime: '16:00',
    location: 'Main Store',
    capacity: 20,
    price: { amount: 35.0, currency: 'USD' },
  },
];

describe('Card Retrieval Tool Flow', () => {
  let drops: CardDropLog[];
  let renders: CardRenderLog[];
  let logger: CardValidationLogger;

  beforeEach(() => {
    drops = [];
    renders = [];
    logger = {
      onDrop: (log) => drops.push(log),
      onRender: (log) => renders.push(log),
    };

    // Register mappers (simulates registerPidgieCardMappers)
    registerCardMapper('product', (record: any, tid) => ({
      type: 'product',
      id: record.id,
      data: {
        name: record.name,
        description: record.description,
        category: record.category,
        price: record.price.amount,
        currency: record.price.currency,
        compareAtPrice: record.price.compareAt,
        image: record.images?.[0]?.url,
        available: record.available,
        stockStatus: record.stockStatus,
        featured: record.featured,
        variants: record.variants?.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: v.price?.amount,
          available: v.available,
        })),
        tags: record.tags,
      },
      source: {
        table: 'Product',
        recordId: record.id,
        tenantId: tid,
        validatedAt: Date.now(),
      },
    }));

    registerCardMapper('service', (record: any, tid) => ({
      type: 'service',
      id: record.id,
      data: {
        name: record.name,
        description: record.description,
        category: record.category,
        price: record.price?.amount,
        currency: record.price?.currency,
        priceUnit: record.price?.unit,
        duration: record.duration,
        available: record.available,
      },
      source: {
        table: 'Service',
        recordId: record.id,
        tenantId: tid,
        validatedAt: Date.now(),
      },
    }));

    registerCardMapper('event', (record: any, tid) => ({
      type: 'event',
      id: record.id,
      data: {
        name: record.name,
        description: record.description,
        date: record.date,
        startTime: record.startTime,
        endTime: record.endTime,
        location: record.location,
        capacity: record.capacity,
        price: record.price?.amount,
        currency: record.price?.currency,
      },
      source: {
        table: 'Event',
        recordId: record.id,
        tenantId: tid,
        validatedAt: Date.now(),
      },
    }));
  });

  // Simulates createBusinessQueryFn from show-card.ts
  const queryFn: CardQueryFn = async (type, recordId) => {
    switch (type) {
      case 'product':
        return mockProducts.find((p) => p.id === recordId) ?? null;
      case 'service':
        return mockServices.find((s) => s.id === recordId) ?? null;
      case 'event':
        return mockEvents.find((e) => e.id === recordId) ?? null;
      default:
        return null;
    }
  };

  // === show_product_card flow ===

  describe('show_product_card flow', () => {
    it('returns validated product card with all fields', async () => {
      const result = await buildCardFromDB('product', validProductId, tenantId, queryFn, logger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.card.type).toBe('product');
        expect(result.card.id).toBe(validProductId);
        expect(result.card.data.name).toBe('Premium Coffee Blend');
        expect(result.card.data.price).toBe(24.99);
        expect(result.card.data.currency).toBe('USD');
        expect(result.card.data.compareAtPrice).toBe(29.99);
        expect(result.card.data.image).toBe('https://cdn.example.com/coffee.jpg');
        expect(result.card.data.available).toBe(true);
        expect(result.card.data.stockStatus).toBe('in_stock');
        expect(result.card.data.featured).toBe(true);
        expect(result.card.data.variants).toHaveLength(2);
        expect(result.card.data.tags).toEqual(['coffee', 'premium', 'arabica']);
        expect(result.card.source.table).toBe('Product');
        expect(result.card.source.tenantId).toBe(tenantId);
      }
      expect(renders).toHaveLength(1);
      expect(drops).toHaveLength(0);
    });

    it('drops card for non-existent product', async () => {
      const unknownId = 'd3aabe22-2f3e-4b21-9e9a-9ee2ea613d44';
      const result = await buildCardFromDB('product', unknownId, tenantId, queryFn, logger);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('record_not_found');
      }
      expect(drops).toHaveLength(1);
      expect(drops[0].reason).toBe('record_not_found');
    });
  });

  // === show_service_card flow ===

  describe('show_service_card flow', () => {
    it('returns validated service card with all fields', async () => {
      const result = await buildCardFromDB('service', validServiceId, tenantId, queryFn, logger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.card.type).toBe('service');
        expect(result.card.data.name).toBe('Deep Tissue Massage');
        expect(result.card.data.price).toBe(89.0);
        expect(result.card.data.priceUnit).toBe('per session');
        expect(result.card.data.duration).toBe(60);
        expect(result.card.data.available).toBe(true);
        expect(result.card.source.table).toBe('Service');
      }
      expect(renders).toHaveLength(1);
    });

    it('drops card for non-existent service', async () => {
      const unknownId = 'e4aafb33-3a4f-4c32-af0a-0ff3fa724e55';
      const result = await buildCardFromDB('service', unknownId, tenantId, queryFn, logger);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('record_not_found');
      }
    });
  });

  // === show_event_card flow ===

  describe('show_event_card flow', () => {
    it('returns validated event card with all fields', async () => {
      const result = await buildCardFromDB('event', validEventId, tenantId, queryFn, logger);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.card.type).toBe('event');
        expect(result.card.data.name).toBe('Coffee Tasting Workshop');
        expect(result.card.data.date).toBe('2026-03-15');
        expect(result.card.data.startTime).toBe('14:00');
        expect(result.card.data.endTime).toBe('16:00');
        expect(result.card.data.location).toBe('Main Store');
        expect(result.card.data.capacity).toBe(20);
        expect(result.card.data.price).toBe(35.0);
        expect(result.card.source.table).toBe('Event');
      }
      expect(renders).toHaveLength(1);
    });

    it('drops card for non-existent event', async () => {
      const unknownId = 'f5aaba44-4a5a-4d43-ba1a-1aa4a1835f66';
      const result = await buildCardFromDB('event', unknownId, tenantId, queryFn, logger);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('record_not_found');
      }
    });
  });

  // === Multi-card batch flow ===

  describe('batch card retrieval', () => {
    it('builds multiple cards of different types', async () => {
      const cards = await buildCardsFromDB(
        [
          { type: 'product', recordId: validProductId },
          { type: 'service', recordId: validServiceId },
          { type: 'event', recordId: validEventId },
        ],
        tenantId,
        queryFn,
        logger,
      );

      expect(cards).toHaveLength(3);
      expect(cards[0].type).toBe('product');
      expect(cards[1].type).toBe('service');
      expect(cards[2].type).toBe('event');
    });

    it('filters out invalid cards from batch', async () => {
      const unknownId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';
      const cards = await buildCardsFromDB(
        [
          { type: 'product', recordId: validProductId },
          { type: 'product', recordId: unknownId }, // doesn't exist
          { type: 'service', recordId: validServiceId },
        ],
        tenantId,
        queryFn,
        logger,
      );

      expect(cards).toHaveLength(2);
      expect(drops).toHaveLength(1);
      expect(drops[0].reason).toBe('record_not_found');
    });
  });

  // === Security tests ===

  describe('card security', () => {
    it('rejects SQL injection in record ID', async () => {
      const result = await buildCardFromDB(
        'product',
        "'; DROP TABLE products; --",
        tenantId,
        queryFn,
        logger,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('invalid_record_id');
      }
      // Query function should never be called
      expect(renders).toHaveLength(0);
    });

    it('rejects path traversal in record ID', async () => {
      const result = await buildCardFromDB(
        'product',
        '../../../etc/passwd',
        tenantId,
        queryFn,
        logger,
      );

      expect(result.success).toBe(false);
    });

    it('card data comes from DB, not from tool arguments', async () => {
      // Even if the tool receives extra args, the card data
      // comes from the DB record via the mapper, not from args
      const result = await buildCardFromDB('product', validProductId, tenantId, queryFn, logger);

      expect(result.success).toBe(true);
      if (result.success) {
        // Price comes from DB, not from any LLM-supplied value
        expect(result.card.data.price).toBe(24.99);
        expect(result.card.source.table).toBe('Product');
      }
    });
  });
});
