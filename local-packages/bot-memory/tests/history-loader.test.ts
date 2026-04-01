import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryLoader } from '../src/conversation/history.js';

function createMockPool() {
  return {
    query: vi.fn(),
  };
}

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    role: 'user',
    content: 'Hello',
    tool_calls: null,
    response_latency_ms: null,
    token_estimate: 2,
    created_at: new Date('2026-03-17T10:00:00Z'),
    ...overrides,
  };
}

describe('HistoryLoader', () => {
  let pool: ReturnType<typeof createMockPool>;
  let loader: HistoryLoader;

  beforeEach(() => {
    pool = createMockPool();
    loader = new HistoryLoader(pool as never);
  });

  describe('getHistory', () => {
    it('returns messages with default limit', async () => {
      const rows = Array.from({ length: 5 }, (_, i) =>
        makeMessageRow({ id: `msg-${i}`, created_at: new Date(`2026-03-17T10:0${i}:00Z`) })
      );
      pool.query.mockResolvedValueOnce({ rows });

      const page = await loader.getHistory('visitor-1');

      expect(page.messages).toHaveLength(5);
      expect(page.hasMore).toBe(false);
      // limit+1 = 21 fetched
      expect(pool.query.mock.calls[0][0]).toContain('LIMIT');
    });

    it('detects hasMore when limit+1 rows returned', async () => {
      const rows = Array.from({ length: 4 }, (_, i) =>
        makeMessageRow({ id: `msg-${i}` })
      );
      pool.query.mockResolvedValueOnce({ rows });

      const page = await loader.getHistory('visitor-1', { limit: 3 });

      expect(page.messages).toHaveLength(3);
      expect(page.hasMore).toBe(true);
    });

    it('returns hasMore=false when fewer than limit+1 rows', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [makeMessageRow(), makeMessageRow({ id: 'msg-2' })],
      });

      const page = await loader.getHistory('visitor-1', { limit: 5 });

      expect(page.messages).toHaveLength(2);
      expect(page.hasMore).toBe(false);
    });

    it('passes before parameter for pagination', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await loader.getHistory('visitor-1', { before: '2026-03-16T00:00:00Z' });

      expect(pool.query.mock.calls[0][0]).toContain('m.created_at < $2::timestamptz');
      expect(pool.query.mock.calls[0][1]).toContain('2026-03-16T00:00:00Z');
    });

    it('filters by sourceApp when provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await loader.getHistory('visitor-1', { sourceApp: 'shopimate-sales' });

      expect(pool.query.mock.calls[0][0]).toContain('c.source_app = $2');
      expect(pool.query.mock.calls[0][1]).toContain('shopimate-sales');
    });

    it('handles both before and sourceApp', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await loader.getHistory('visitor-1', {
        before: '2026-03-16T00:00:00Z',
        sourceApp: 'bib',
      });

      const sql = pool.query.mock.calls[0][0];
      expect(sql).toContain('m.created_at < $2::timestamptz');
      expect(sql).toContain('c.source_app = $3');
    });

    it('returns empty page when no messages', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const page = await loader.getHistory('visitor-1');

      expect(page.messages).toHaveLength(0);
      expect(page.hasMore).toBe(false);
      expect(page.oldestTimestamp).toBeNull();
    });

    it('sets oldestTimestamp from last message', async () => {
      const rows = [
        makeMessageRow({ id: 'msg-1', created_at: new Date('2026-03-17T10:00:00Z') }),
        makeMessageRow({ id: 'msg-2', created_at: new Date('2026-03-16T10:00:00Z') }),
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const page = await loader.getHistory('visitor-1');

      expect(page.oldestTimestamp).toBe('2026-03-16T10:00:00.000Z');
    });
  });
});
