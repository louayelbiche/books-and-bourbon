import { describe, test, expect, vi } from 'vitest';
import { createProgressiveEmitter } from '../src/validation/progressive-emitter.js';
import { registerCardMapper } from '../src/validation/build-card.js';
import type { AgentCardType, ValidatedCard } from '../src/validation/types.js';

// Valid UUID v4 test IDs (validateRecordId requires UUID or CUID format)
const ID_1 = 'a0000000-0000-4000-8000-000000000001';
const ID_2 = 'a0000000-0000-4000-8000-000000000002';
const ID_MISSING = 'a0000000-0000-4000-8000-000000000099';

// Register a test mapper
registerCardMapper('campaign-summary' as AgentCardType, (record: unknown, tenantId: string) => {
  const r = record as { id: string; name: string };
  return {
    type: 'campaign-summary' as AgentCardType,
    id: r.id,
    data: { name: r.name },
    source: {
      table: 'SalesCampaign',
      recordId: r.id,
      tenantId,
      validatedAt: Date.now(),
    },
  };
});

describe('createProgressiveEmitter', () => {
  function createMockWriter() {
    const emittedCards: unknown[] = [];
    return {
      writer: {
        cards: vi.fn(async (cards: unknown[]) => {
          emittedCards.push(...cards);
        }),
      },
      emittedCards,
    };
  }

  function createMockQueryFn(records: Record<string, unknown>) {
    return async (_type: AgentCardType, recordId: string, _tenantId: string) => {
      return records[recordId] ?? null;
    };
  }

  test('emit() builds card from DB and emits immediately', async () => {
    const { writer, emittedCards } = createMockWriter();
    const queryFn = createMockQueryFn({
      [ID_1]: { id: ID_1, name: 'Summer Campaign' },
    });

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');

    const result = await emitter.emit('campaign-summary' as AgentCardType, ID_1);

    expect(result).toBe(true);
    expect(writer.cards).toHaveBeenCalledTimes(1);
    expect(writer.cards).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'campaign-summary',
          id: ID_1,
          data: { name: 'Summer Campaign' },
        }),
      ]),
      'progressive',
    );
    expect(emittedCards.length).toBe(1);
  });

  test('emit() returns false and increments dropped for missing record', async () => {
    const { writer } = createMockWriter();
    const queryFn = createMockQueryFn({}); // No records

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');

    const result = await emitter.emit('campaign-summary' as AgentCardType, ID_MISSING);

    expect(result).toBe(false);
    expect(writer.cards).not.toHaveBeenCalled();

    const summary = emitter.getSummary();
    expect(summary.dropped).toBe(1);
    expect(summary.emitted).toBe(0);
  });

  test('emitDirect() emits card without DB query', async () => {
    const { writer, emittedCards } = createMockWriter();
    const queryFn = createMockQueryFn({});

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');

    const card: ValidatedCard = {
      type: 'brand-profile' as AgentCardType,
      id: 'bp-1',
      data: { companyName: 'Test Corp' },
      source: {
        table: 'WebsiteScrape',
        recordId: 'ws-1',
        tenantId: 'tenant-1',
        validatedAt: Date.now(),
      },
    };

    await emitter.emitDirect(card);

    expect(writer.cards).toHaveBeenCalledTimes(1);
    expect(emittedCards[0]).toEqual(expect.objectContaining({ type: 'brand-profile' }));
  });

  test('getSummary() tracks emitted and dropped counts', async () => {
    const { writer } = createMockWriter();
    const queryFn = createMockQueryFn({
      [ID_1]: { id: ID_1, name: 'Campaign 1' },
      [ID_2]: { id: ID_2, name: 'Campaign 2' },
    });

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');

    await emitter.emit('campaign-summary' as AgentCardType, ID_1);
    await emitter.emit('campaign-summary' as AgentCardType, ID_MISSING);
    await emitter.emit('campaign-summary' as AgentCardType, ID_2);

    const summary = emitter.getSummary();
    expect(summary.emitted).toBe(2);
    expect(summary.dropped).toBe(1);
    expect(summary.cardTypes).toEqual(['campaign-summary', 'campaign-summary']);
  });

  test('multiple progressive emissions fire separate SSE events', async () => {
    const { writer } = createMockWriter();
    const queryFn = createMockQueryFn({
      [ID_1]: { id: ID_1, name: 'Campaign 1' },
      [ID_2]: { id: ID_2, name: 'Campaign 2' },
    });

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');

    await emitter.emit('campaign-summary' as AgentCardType, ID_1);
    await emitter.emit('campaign-summary' as AgentCardType, ID_2);

    // Each emit() fires a separate SSE event (progressive)
    expect(writer.cards).toHaveBeenCalledTimes(2);
  });

  // --- Performance metrics ---

  test('getSummary() includes perf metrics', async () => {
    const { writer } = createMockWriter();
    const queryFn = createMockQueryFn({
      [ID_1]: { id: ID_1, name: 'Campaign 1' },
    });

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');
    await emitter.emit('campaign-summary' as AgentCardType, ID_1);

    const summary = emitter.getSummary();
    expect(summary.perf).toBeDefined();
    expect(summary.perf.firstCardLatencyMs).toBeTypeOf('number');
    expect(summary.perf.firstCardLatencyMs).toBeGreaterThanOrEqual(0);
    expect(summary.perf.totalMs).toBeGreaterThanOrEqual(0);
    expect(summary.perf.fellBackToBatch).toBe(false);
    expect(summary.perf.progressiveCount).toBe(1);
    expect(summary.perf.batchedCount).toBe(0);
  });

  test('perf.firstCardLatencyMs is null when no cards emitted', async () => {
    const { writer } = createMockWriter();
    const queryFn = createMockQueryFn({});

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');
    await emitter.emit('campaign-summary' as AgentCardType, ID_MISSING);

    const summary = emitter.getSummary();
    expect(summary.perf.firstCardLatencyMs).toBeNull();
  });

  // --- Batch fallback ---

  test('falls back to batch mode when first emission exceeds threshold', async () => {
    const { writer } = createMockWriter();
    // Simulate slow query — delay exceeds threshold
    const slowQueryFn = async (_type: AgentCardType, recordId: string, _tenantId: string) => {
      await new Promise((r) => setTimeout(r, 50));
      const records: Record<string, unknown> = {
        [ID_1]: { id: ID_1, name: 'Campaign 1' },
        [ID_2]: { id: ID_2, name: 'Campaign 2' },
      };
      return records[recordId] ?? null;
    };

    // Set very low threshold to trigger fallback
    const emitter = createProgressiveEmitter(writer, slowQueryFn, 'tenant-1', undefined, {
      latencyThresholdMs: 10,
    });

    // First emit — slow but still emitted progressively
    await emitter.emit('campaign-summary' as AgentCardType, ID_1);
    // Second emit — should be queued in batch mode
    await emitter.emit('campaign-summary' as AgentCardType, ID_2);

    // First card emitted progressively (1 call), second queued
    expect(writer.cards).toHaveBeenCalledTimes(1);

    // Flush batch
    await emitter.flushBatch();

    // Now the batch was flushed with 'immediate' mode
    expect(writer.cards).toHaveBeenCalledTimes(2);
    expect(writer.cards).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: ID_2 }),
      ]),
      'immediate',
    );

    const summary = emitter.getSummary();
    expect(summary.perf.fellBackToBatch).toBe(true);
    expect(summary.perf.progressiveCount).toBe(1);
    expect(summary.perf.batchedCount).toBe(1);
  });

  test('flushBatch() is a no-op when no cards are queued', async () => {
    const { writer } = createMockWriter();
    const queryFn = createMockQueryFn({
      [ID_1]: { id: ID_1, name: 'Campaign 1' },
    });

    const emitter = createProgressiveEmitter(writer, queryFn, 'tenant-1');
    await emitter.emit('campaign-summary' as AgentCardType, ID_1);

    // No batch fallback occurred
    await emitter.flushBatch();

    // Only the original progressive emission
    expect(writer.cards).toHaveBeenCalledTimes(1);
  });
});
