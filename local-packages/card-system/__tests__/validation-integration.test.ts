import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCardFromDB,
  buildCardsFromDB,
  registerCardMapper,
  validateRecordId,
  validateActionPayload,
  toCardRenderedEvent,
  toCardDroppedEvent,
  type CardQueryFn,
  type CardValidationLogger,
  type CardDropLog,
  type CardRenderLog,
  type ActionPayload,
  type CardAnalyticsEvent,
} from '../src/validation/index.js';

/**
 * Integration tests for the complete validation flow.
 *
 * Tests the full pipeline:
 * 1. Record ID validation
 * 2. Card building from DB
 * 3. Analytics event generation
 * 4. Action payload validation
 * 5. Batch processing with mixed valid/invalid
 * 6. Error propagation across layers
 */

// === Test fixtures ===

const PRODUCT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const SERVICE_ID = 'b1ffcd00-0d1c-4f09-bc7e-7cc0ce491b22';
const EVENT_ID = 'c2aade11-1e2d-4a10-ad8f-8dd1df502c33';
const TENANT_ID = 'biz-integration-test';

const mockDB = {
  products: new Map([
    [PRODUCT_ID, { id: PRODUCT_ID, name: 'Espresso', price: { amount: 4.5, currency: 'USD' } }],
  ]),
  services: new Map([
    [SERVICE_ID, { id: SERVICE_ID, name: 'Haircut', price: { amount: 35, currency: 'USD' }, duration: 30, available: true }],
  ]),
  events: new Map([
    [EVENT_ID, { id: EVENT_ID, name: 'Open Mic Night', date: '2026-03-20', startTime: '19:00' }],
  ]),
};

describe('Validation Layer Integration', () => {
  let drops: CardDropLog[];
  let renders: CardRenderLog[];
  let analyticsEvents: CardAnalyticsEvent[];
  let logger: CardValidationLogger;

  const queryFn: CardQueryFn = async (type, recordId) => {
    switch (type) {
      case 'product':
        return mockDB.products.get(recordId) ?? null;
      case 'service':
        return mockDB.services.get(recordId) ?? null;
      case 'event':
        return mockDB.events.get(recordId) ?? null;
      default:
        return null;
    }
  };

  beforeEach(() => {
    drops = [];
    renders = [];
    analyticsEvents = [];

    logger = {
      onDrop: (log) => {
        drops.push(log);
        analyticsEvents.push(toCardDroppedEvent(log, 'pidgie'));
      },
      onRender: (log) => {
        renders.push(log);
        analyticsEvents.push(toCardRenderedEvent(log, 'pidgie', TENANT_ID));
      },
    };

    registerCardMapper('product', (record: any, tid) => ({
      type: 'product',
      id: record.id,
      data: { name: record.name, price: record.price.amount, currency: record.price.currency },
      source: { table: 'Product', recordId: record.id, tenantId: tid, validatedAt: Date.now() },
    }));

    registerCardMapper('service', (record: any, tid) => ({
      type: 'service',
      id: record.id,
      data: { name: record.name, price: record.price.amount, duration: record.duration },
      source: { table: 'Service', recordId: record.id, tenantId: tid, validatedAt: Date.now() },
    }));

    registerCardMapper('event', (record: any, tid) => ({
      type: 'event',
      id: record.id,
      data: { name: record.name, date: record.date, startTime: record.startTime },
      source: { table: 'Event', recordId: record.id, tenantId: tid, validatedAt: Date.now() },
    }));
  });

  // === E2E: Full card retrieval + analytics ===

  it('full flow: build card → render log → analytics event', async () => {
    const result = await buildCardFromDB('product', PRODUCT_ID, TENANT_ID, queryFn, logger);

    // Card built successfully
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.name).toBe('Espresso');
      expect(result.card.data.price).toBe(4.5);
      expect(result.card.source.table).toBe('Product');
    }

    // Render log captured
    expect(renders).toHaveLength(1);
    expect(renders[0].event).toBe('card-rendered');
    expect(renders[0].source).toBe('db');

    // Analytics event generated
    expect(analyticsEvents).toHaveLength(1);
    expect(analyticsEvents[0].event).toBe('card_rendered');
    expect(analyticsEvents[0].properties.source).toBe('db');
    expect(analyticsEvents[0].properties.agentType).toBe('pidgie');
  });

  it('full flow: invalid card → drop log → analytics event', async () => {
    const result = await buildCardFromDB('product', 'bad-id', TENANT_ID, queryFn, logger);

    expect(result.success).toBe(false);

    // Drop log captured
    expect(drops).toHaveLength(1);
    expect(drops[0].reason).toBe('invalid_record_id');

    // Analytics event generated
    expect(analyticsEvents).toHaveLength(1);
    expect(analyticsEvents[0].event).toBe('card_dropped');
    if (analyticsEvents[0].event === 'card_dropped') {
      expect(analyticsEvents[0].properties.reason).toBe('invalid_record_id');
    }
  });

  // === E2E: Batch processing with analytics ===

  it('batch: mixed valid and invalid cards with full analytics', async () => {
    const cards = await buildCardsFromDB(
      [
        { type: 'product', recordId: PRODUCT_ID },
        { type: 'product', recordId: 'bad-id' },
        { type: 'service', recordId: SERVICE_ID },
        { type: 'event', recordId: EVENT_ID },
        { type: 'product', recordId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99' }, // valid ID, not in DB
      ],
      TENANT_ID,
      queryFn,
      logger,
    );

    // Only valid cards returned
    expect(cards).toHaveLength(3);
    expect(cards[0].type).toBe('product');
    expect(cards[1].type).toBe('service');
    expect(cards[2].type).toBe('event');

    // Drop and render logs
    expect(renders).toHaveLength(3);
    expect(drops).toHaveLength(2);

    // All 5 attempts generated analytics events
    expect(analyticsEvents).toHaveLength(5);

    const renderedEvents = analyticsEvents.filter((e) => e.event === 'card_rendered');
    const droppedEvents = analyticsEvents.filter((e) => e.event === 'card_dropped');
    expect(renderedEvents).toHaveLength(3);
    expect(droppedEvents).toHaveLength(2);
  });

  // === E2E: Action payload validation ===

  it('action payload: valid payload passes validation', async () => {
    const payload: ActionPayload = {
      action: 'view_details',
      recordId: PRODUCT_ID,
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, TENANT_ID, queryFn);
    expect(result.valid).toBe(true);
  });

  it('action payload: invalid record is rejected with user message', async () => {
    const payload: ActionPayload = {
      action: 'send_campaign',
      recordId: "'; DROP TABLE users; --",
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, TENANT_ID, queryFn);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeTruthy();
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  // === E2E: Record ID validation ===

  it('record ID validation: UUID v4 formats', () => {
    expect(validateRecordId(PRODUCT_ID)).toBe(true);
    expect(validateRecordId(SERVICE_ID)).toBe(true);
    expect(validateRecordId(EVENT_ID)).toBe(true);
    expect(validateRecordId('not-a-uuid')).toBe(false);
    expect(validateRecordId('')).toBe(false);
    expect(validateRecordId(null)).toBe(false);
    expect(validateRecordId(123)).toBe(false);
  });

  // === E2E: Error propagation ===

  it('DB failure propagates through all layers', async () => {
    const failingQueryFn: CardQueryFn = async () => {
      throw new Error('Connection refused');
    };

    // Build card fails gracefully
    const result = await buildCardFromDB('product', PRODUCT_ID, TENANT_ID, failingQueryFn, logger);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('query_failed');
    }

    // Drop log has error detail
    expect(drops).toHaveLength(1);
    expect(drops[0].error).toBe('Connection refused');

    // Analytics event captures the failure
    expect(analyticsEvents).toHaveLength(1);
    if (analyticsEvents[0].event === 'card_dropped') {
      expect(analyticsEvents[0].properties.error).toBe('Connection refused');
    }

    // Action payload also fails gracefully
    const payload: ActionPayload = {
      action: 'view',
      recordId: PRODUCT_ID,
      cardType: 'product',
    };
    const payloadResult = await validateActionPayload(payload, TENANT_ID, failingQueryFn);
    expect(payloadResult.valid).toBe(false);
  });

  // === Provenance guarantee ===

  it('every card field comes from DB, not from tool args', async () => {
    const result = await buildCardFromDB('product', PRODUCT_ID, TENANT_ID, queryFn, logger);

    expect(result.success).toBe(true);
    if (result.success) {
      // Source proves provenance
      expect(result.card.source.table).toBe('Product');
      expect(result.card.source.recordId).toBe(PRODUCT_ID);
      expect(result.card.source.tenantId).toBe(TENANT_ID);
      expect(result.card.source.validatedAt).toBeGreaterThan(0);

      // Data matches DB record exactly
      expect(result.card.data.name).toBe('Espresso');
      expect(result.card.data.price).toBe(4.5);
    }
  });
});
