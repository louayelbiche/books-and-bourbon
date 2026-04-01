import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateActionPayload,
  registerCardMapper,
  type CardQueryFn,
  type ActionPayload,
} from '../src/validation/index.js';

describe('validateActionPayload', () => {
  const validId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const tenantId = 'tenant-123';

  beforeEach(() => {
    registerCardMapper('product', (record: any, tid) => ({
      type: 'product',
      id: record.id,
      data: { name: record.name },
      source: {
        table: 'Product',
        recordId: record.id,
        tenantId: tid,
        validatedAt: Date.now(),
      },
    }));
  });

  const queryFn: CardQueryFn = async (_type, recordId) => {
    if (recordId === validId) return { id: validId, name: 'Test Product' };
    return null;
  };

  it('validates a valid action payload', async () => {
    const payload: ActionPayload = {
      action: 'send_campaign',
      recordId: validId,
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, tenantId, queryFn);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.recordId).toBe(validId);
      expect(result.cardType).toBe('product');
    }
  });

  it('rejects invalid record ID format', async () => {
    const payload: ActionPayload = {
      action: 'send_campaign',
      recordId: 'bad-id',
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, tenantId, queryFn);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Invalid record reference');
    }
  });

  it('rejects record that does not exist', async () => {
    const nonExistentId = 'b1ffcd00-0d1c-4f09-bc7e-7cc0ce491b22';
    const payload: ActionPayload = {
      action: 'send_campaign',
      recordId: nonExistentId,
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, tenantId, queryFn);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('no longer exists');
    }
  });

  it('handles query failures gracefully', async () => {
    const failingQueryFn: CardQueryFn = async () => {
      throw new Error('DB connection failed');
    };

    const payload: ActionPayload = {
      action: 'send_campaign',
      recordId: validId,
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, tenantId, failingQueryFn);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('Unable to verify');
    }
  });

  it('rejects SQL injection in payload recordId', async () => {
    const payload: ActionPayload = {
      action: 'send_campaign',
      recordId: "'; DROP TABLE campaigns; --",
      cardType: 'product',
    };

    const result = await validateActionPayload(payload, tenantId, queryFn);
    expect(result.valid).toBe(false);
  });
});
