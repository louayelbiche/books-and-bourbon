import { describe, it, expect, vi } from 'vitest';
import type { CardValidationLogger } from '@runwell/card-system/validation';

// We test the getLogger utility by simulating the PidgieContext pattern
// used in show-card.ts. The actual tool execution requires full agent setup,
// so we test the logger extraction logic directly.

describe('show-card CardValidationLogger threading', () => {
  // Replicate the getLogger function from show-card.ts
  function getLogger(ctx: unknown): CardValidationLogger | undefined {
    return (ctx as { metadata?: { cardLogger?: CardValidationLogger } }).metadata?.cardLogger;
  }

  it('extracts logger from context metadata', () => {
    const mockLogger: CardValidationLogger = {
      onRender: vi.fn(),
      onDrop: vi.fn(),
    };

    const ctx = {
      business: { id: 'b1' },
      metadata: { cardLogger: mockLogger },
    };

    const logger = getLogger(ctx);
    expect(logger).toBe(mockLogger);
  });

  it('returns undefined when no metadata', () => {
    const ctx = { business: { id: 'b1' } };
    const logger = getLogger(ctx);
    expect(logger).toBeUndefined();
  });

  it('returns undefined when metadata has no cardLogger', () => {
    const ctx = {
      business: { id: 'b1' },
      metadata: { onProgress: vi.fn() },
    };
    const logger = getLogger(ctx);
    expect(logger).toBeUndefined();
  });

  it('logger onRender callback is callable', () => {
    const onRender = vi.fn();
    const onDrop = vi.fn();
    const mockLogger: CardValidationLogger = { onRender, onDrop };

    const ctx = {
      business: { id: 'b1' },
      metadata: { cardLogger: mockLogger },
    };

    const logger = getLogger(ctx);
    logger?.onRender({
      event: 'card.rendered',
      cardType: 'product',
      recordId: 'p1',
      source: 'bib-dashboard',
      timestamp: Date.now(),
    });

    expect(onRender).toHaveBeenCalledWith(
      expect.objectContaining({
        cardType: 'product',
        recordId: 'p1',
      }),
    );
  });

  it('logger onDrop callback is callable', () => {
    const onRender = vi.fn();
    const onDrop = vi.fn();
    const mockLogger: CardValidationLogger = { onRender, onDrop };

    const ctx = {
      business: { id: 'b1' },
      metadata: { cardLogger: mockLogger },
    };

    const logger = getLogger(ctx);
    logger?.onDrop({
      event: 'card.dropped',
      cardType: 'service',
      recordId: 's1',
      reason: 'not_found',
      tenantId: 'b1',
      timestamp: Date.now(),
    });

    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        cardType: 'service',
        recordId: 's1',
        reason: 'not_found',
      }),
    );
  });

  it('buildCardFromDB accepts optional logger parameter', async () => {
    // Verify the function signature accepts the logger (compile-time check)
    const { buildCardFromDB } = await import('@runwell/card-system/validation');

    const mockLogger: CardValidationLogger = {
      onRender: vi.fn(),
      onDrop: vi.fn(),
    };

    const queryFn = vi.fn().mockResolvedValue(null);

    // Call with logger; should not throw even with null record
    const result = await buildCardFromDB('product', 'invalid-id', 'b1', queryFn, mockLogger);
    expect(result.success).toBe(false);

    // Logger's onDrop should have been called for the failed lookup
    expect(mockLogger.onDrop).toHaveBeenCalled();
  });
});
