/**
 * Progressive Card Emitter
 *
 * Emits validated cards one-by-one during tool execution rather than
 * batching them all at the end. This enables progressive rendering
 * where cards appear in the UI as soon as each tool completes.
 *
 * Usage in route handlers:
 * ```typescript
 * const emitter = createProgressiveEmitter(writer, queryFn, tenantId);
 * // During or after each tool call:
 * await emitter.emit('campaign-summary', recordId);
 * // At the end:
 * const summary = emitter.getSummary();
 * ```
 */

import { buildCardFromDB } from './build-card.js';
import type { CardQueryFn, CardValidationLogger } from './build-card.js';
import type { AgentCardType, ValidatedCard } from './types.js';

/**
 * Writer interface — minimal SSE card writer.
 */
export interface ProgressiveWriter {
  cards: (
    cards: Array<{
      type: string;
      id: string;
      data: Record<string, unknown>;
      source: {
        table: string;
        recordId: string;
        tenantId: string;
        validatedAt: number;
      };
    }>,
    renderMode?: 'immediate' | 'progressive',
  ) => Promise<void>;
}

/**
 * Summary of progressive emission results.
 */
export interface EmissionSummary {
  emitted: number;
  dropped: number;
  cardTypes: AgentCardType[];
  /** Performance metrics for this emission session */
  perf: EmissionPerf;
}

/**
 * Performance metrics for progressive emission.
 */
export interface EmissionPerf {
  /** Time from emitter creation to first card emission (ms) */
  firstCardLatencyMs: number | null;
  /** Total wall time from creation to getSummary() call (ms) */
  totalMs: number;
  /** Whether the emitter fell back to batched mode due to latency */
  fellBackToBatch: boolean;
  /** Number of cards emitted in progressive mode */
  progressiveCount: number;
  /** Number of cards emitted in batch mode (fallback) */
  batchedCount: number;
}

/**
 * Progressive card emitter. Build and emit cards one at a time.
 */
export interface ProgressiveCardEmitter {
  /**
   * Build a card from DB and emit it immediately via SSE.
   * Returns true if the card was emitted, false if it was dropped.
   * If first emission exceeds latency threshold, remaining cards queue for batch.
   */
  emit: (type: AgentCardType, recordId: string) => Promise<boolean>;

  /**
   * Emit a card from in-memory data (e.g., scraped website analysis).
   * Bypasses DB query — data is already available.
   */
  emitDirect: (card: ValidatedCard) => Promise<void>;

  /**
   * Flush any cards queued during batch fallback mode.
   * Call this before getSummary() when the tool execution is complete.
   */
  flushBatch: () => Promise<void>;

  /**
   * Get a summary of what was emitted during this session.
   * Includes performance metrics (latency, fallback status).
   */
  getSummary: () => EmissionSummary;
}

/** Default latency threshold before falling back to batched mode (ms) */
const DEFAULT_LATENCY_THRESHOLD_MS = 1500;

export interface ProgressiveEmitterOptions {
  /** Latency threshold in ms. If first card takes longer, remaining use batch mode. */
  latencyThresholdMs?: number;
}

/**
 * Create a progressive card emitter.
 *
 * @param writer - SSE writer to emit cards through
 * @param queryFn - DB query function
 * @param tenantId - Tenant ID for scoping
 * @param logger - Optional validation logger
 * @param options - Performance tuning options
 */
export function createProgressiveEmitter(
  writer: ProgressiveWriter,
  queryFn: CardQueryFn,
  tenantId: string,
  logger?: CardValidationLogger,
  options?: ProgressiveEmitterOptions,
): ProgressiveCardEmitter {
  const threshold = options?.latencyThresholdMs ?? DEFAULT_LATENCY_THRESHOLD_MS;
  const emitted: AgentCardType[] = [];
  let dropped = 0;
  const startTime = Date.now();
  let firstCardTime: number | null = null;
  let fellBackToBatch = false;
  let progressiveCount = 0;
  let batchedCount = 0;
  const batchQueue: Array<{
    type: string;
    id: string;
    data: Record<string, unknown>;
    source: { table: string; recordId: string; tenantId: string; validatedAt: number };
  }> = [];

  async function emitCard(
    card: { type: string; id: string; data: Record<string, unknown>; source: { table: string; recordId: string; tenantId: string; validatedAt: number } },
  ): Promise<void> {
    if (fellBackToBatch) {
      batchQueue.push(card);
      batchedCount++;
      return;
    }

    await writer.cards([card], 'progressive');
    progressiveCount++;

    // Check latency after first card
    if (firstCardTime === null) {
      firstCardTime = Date.now();
      const latency = firstCardTime - startTime;
      if (latency > threshold) {
        fellBackToBatch = true;
      }
    }
  }

  return {
    async emit(type: AgentCardType, recordId: string): Promise<boolean> {
      const result = await buildCardFromDB(type, recordId, tenantId, queryFn, logger);

      if (!result.success) {
        dropped++;
        return false;
      }

      const card = result.card;
      await emitCard({
        type: card.type,
        id: card.id,
        data: card.data,
        source: card.source,
      });

      emitted.push(type);
      return true;
    },

    async emitDirect(card: ValidatedCard): Promise<void> {
      await emitCard({
        type: card.type,
        id: card.id,
        data: card.data,
        source: card.source,
      });
      emitted.push(card.type as AgentCardType);
    },

    getSummary(): EmissionSummary {
      const now = Date.now();

      // Flush batch queue if any cards were queued
      if (batchQueue.length > 0) {
        // Return summary — caller should call flushBatch() before getSummary()
        // But we include the queued cards in the count
      }

      return {
        emitted: emitted.length,
        dropped,
        cardTypes: [...emitted],
        perf: {
          firstCardLatencyMs: firstCardTime !== null ? firstCardTime - startTime : null,
          totalMs: now - startTime,
          fellBackToBatch,
          progressiveCount,
          batchedCount,
        },
      };
    },

    async flushBatch(): Promise<void> {
      if (batchQueue.length === 0) return;
      await writer.cards([...batchQueue], 'immediate');
      batchQueue.length = 0;
    },
  };
}
