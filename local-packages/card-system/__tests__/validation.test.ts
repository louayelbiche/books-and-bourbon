import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCardFromDB,
  buildCardsFromDB,
  registerCardMapper,
  validateRecordId,
} from '../src/validation/index.js';
import type {
  CardValidationLogger,
  CardQueryFn,
  CardDropLog,
  CardRenderLog,
  ValidatedCard,
} from '../src/validation/index.js';

// === validateRecordId ===

describe('validateRecordId', () => {
  it('accepts valid UUID v4', () => {
    expect(validateRecordId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
  });

  it('accepts valid UUID v4 uppercase', () => {
    expect(validateRecordId('A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11')).toBe(true);
  });

  it('accepts valid CUID', () => {
    expect(validateRecordId('clh1234567890abcdefghijk')).toBe(true);
    expect(validateRecordId('cm1abcdefghij1234567890abcd')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateRecordId('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(validateRecordId(null)).toBe(false);
    expect(validateRecordId(undefined)).toBe(false);
    expect(validateRecordId(123)).toBe(false);
    expect(validateRecordId({})).toBe(false);
  });

  it('rejects malformed UUIDs', () => {
    expect(validateRecordId('not-a-uuid')).toBe(false);
    expect(validateRecordId('a0eebc99-9c0b-4ef8-bb6d')).toBe(false);
    expect(validateRecordId('a0eebc99-9c0b-1ef8-bb6d-6bb9bd380a11')).toBe(false); // v1 not v4
  });

  it('rejects SQL injection attempts', () => {
    expect(validateRecordId("'; DROP TABLE users; --")).toBe(false);
    expect(validateRecordId('1 OR 1=1')).toBe(false);
  });
});

// === buildCardFromDB ===

describe('buildCardFromDB', () => {
  let logger: CardValidationLogger;
  let drops: CardDropLog[];
  let renders: CardRenderLog[];

  beforeEach(() => {
    drops = [];
    renders = [];
    logger = {
      onDrop: (log) => drops.push(log),
      onRender: (log) => renders.push(log),
    };
  });

  const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const tenantId = 'tenant-123';

  // Register a test mapper
  beforeEach(() => {
    registerCardMapper('product', (record: any, tid) => ({
      type: 'product',
      id: record.id,
      data: { title: record.title, price: record.price },
      source: {
        table: 'Product',
        recordId: record.id,
        tenantId: tid,
        validatedAt: Date.now(),
      },
    }));
  });

  it('returns validated card for valid record', async () => {
    const queryFn: CardQueryFn = async () => ({
      id: validId,
      title: 'Test Product',
      price: 29.99,
    });

    const result = await buildCardFromDB('product', validId, tenantId, queryFn, logger);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.type).toBe('product');
      expect(result.card.data.title).toBe('Test Product');
      expect(result.card.data.price).toBe(29.99);
      expect(result.card.source.table).toBe('Product');
      expect(result.card.source.tenantId).toBe(tenantId);
    }
    expect(renders).toHaveLength(1);
    expect(renders[0].event).toBe('card-rendered');
    expect(renders[0].source).toBe('db');
    expect(drops).toHaveLength(0);
  });

  it('drops card with invalid record ID', async () => {
    const queryFn: CardQueryFn = async () => null;

    const result = await buildCardFromDB('product', 'bad-id', tenantId, queryFn, logger);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('invalid_record_id');
    }
    expect(drops).toHaveLength(1);
    expect(drops[0].reason).toBe('invalid_record_id');
    expect(renders).toHaveLength(0);
  });

  it('drops card when record not found', async () => {
    const queryFn: CardQueryFn = async () => null;

    const result = await buildCardFromDB('product', validId, tenantId, queryFn, logger);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('record_not_found');
    }
    expect(drops).toHaveLength(1);
    expect(drops[0].reason).toBe('record_not_found');
  });

  it('drops card when DB query fails', async () => {
    const queryFn: CardQueryFn = async () => {
      throw new Error('Connection timeout');
    };

    const result = await buildCardFromDB('product', validId, tenantId, queryFn, logger);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('query_failed');
    }
    expect(drops).toHaveLength(1);
    expect(drops[0].reason).toBe('query_failed');
    expect(drops[0].error).toBe('Connection timeout');
  });

  it('drops card when no mapper registered for type', async () => {
    const queryFn: CardQueryFn = async () => ({ id: validId });

    const result = await buildCardFromDB(
      'brand-profile' as any,
      validId,
      tenantId,
      queryFn,
      logger,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('mapping_error');
    }
    expect(drops).toHaveLength(1);
    expect(drops[0].error).toContain('No mapper registered');
  });

  it('drops card when mapper throws', async () => {
    registerCardMapper('event', () => {
      throw new Error('Missing required field');
    });

    const queryFn: CardQueryFn = async () => ({ id: validId });

    const result = await buildCardFromDB('event', validId, tenantId, queryFn, logger);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('mapping_error');
      expect(result.recordId).toBe(validId);
    }
    expect(drops).toHaveLength(1);
    expect(drops[0].error).toBe('Missing required field');
  });

  it('works without logger (noop)', async () => {
    const queryFn: CardQueryFn = async () => ({
      id: validId,
      title: 'Test',
      price: 10,
    });

    // No logger passed — should not throw
    const result = await buildCardFromDB('product', validId, tenantId, queryFn);
    expect(result.success).toBe(true);
  });
});

// === buildCardsFromDB ===

describe('buildCardsFromDB', () => {
  let drops: CardDropLog[];
  let logger: CardValidationLogger;

  beforeEach(() => {
    drops = [];
    logger = {
      onDrop: (log) => drops.push(log),
      onRender: () => {},
    };

    registerCardMapper('product', (record: any, tid) => ({
      type: 'product',
      id: record.id,
      data: { title: record.title },
      source: {
        table: 'Product',
        recordId: record.id,
        tenantId: tid,
        validatedAt: Date.now(),
      },
    }));
  });

  const validId1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validId2 = 'b1ffcd00-0d1c-4f09-bc7e-7cc0ce491b22';
  const tenantId = 'tenant-123';

  it('returns only valid cards, drops invalid silently', async () => {
    const queryFn: CardQueryFn = async (_type, id) => {
      if (id === validId1) return { id: validId1, title: 'Product 1' };
      return null; // second one not found
    };

    const cards = await buildCardsFromDB(
      [
        { type: 'product', recordId: validId1 },
        { type: 'product', recordId: validId2 },
      ],
      tenantId,
      queryFn,
      logger,
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].data.title).toBe('Product 1');
    expect(drops).toHaveLength(1);
    expect(drops[0].reason).toBe('record_not_found');
  });

  it('returns empty array when all cards are invalid', async () => {
    const queryFn: CardQueryFn = async () => null;

    const cards = await buildCardsFromDB(
      [
        { type: 'product', recordId: 'bad-id' },
        { type: 'product', recordId: 'also-bad' },
      ],
      tenantId,
      queryFn,
      logger,
    );

    expect(cards).toHaveLength(0);
    expect(drops).toHaveLength(2);
  });
});
