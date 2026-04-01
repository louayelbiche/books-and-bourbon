import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationStore } from '../src/conversation/store.js';

function createMockPool() {
  return {
    query: vi.fn(),
  };
}

function makeConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-uuid-1',
    visitor_id: 'visitor-uuid-1',
    session_id: 'session-abc',
    source_app: 'shopimate-sales',
    metadata: {},
    message_count: 0,
    started_at: new Date('2026-03-17T10:00:00Z'),
    last_message_at: new Date('2026-03-17T10:00:00Z'),
    ...overrides,
  };
}

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-uuid-1',
    conversation_id: 'conv-uuid-1',
    role: 'user',
    content: 'Hello',
    tool_calls: null,
    response_latency_ms: null,
    token_estimate: 2,
    created_at: new Date('2026-03-17T10:00:00Z'),
    ...overrides,
  };
}

describe('ConversationStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: ConversationStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new ConversationStore(pool as never);
  });

  describe('create', () => {
    it('inserts a new conversation and returns id', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const id = await store.create('visitor-uuid-1', 'session-abc', 'shopimate-sales', { locale: 'en' });

      expect(typeof id).toBe('string');
      expect(id).toHaveLength(36); // UUID
      expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO bot_conversations');
      expect(pool.query.mock.calls[0][1][1]).toBe('visitor-uuid-1');
      expect(pool.query.mock.calls[0][1][2]).toBe('session-abc');
    });
  });

  describe('addMessage', () => {
    it('inserts message and updates conversation counts', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const msgId = await store.addMessage('conv-uuid-1', 'user', 'What are your running shoes?');

      expect(typeof msgId).toBe('string');
      // First call: insert message
      expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO bot_messages');
      // Second call: update conversation
      expect(pool.query.mock.calls[1][0]).toContain('message_count = message_count + 1');
    });

    it('passes tool calls and latency when provided', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await store.addMessage('conv-uuid-1', 'assistant', 'Here are our shoes', {
        toolCalls: [{ name: 'search_products' }],
        responseLatencyMs: 450,
      });

      const params = pool.query.mock.calls[0][1];
      expect(JSON.parse(params[4] as string)).toEqual([{ name: 'search_products' }]);
      expect(params[5]).toBe(450);
    });

    it('calculates token estimate', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await store.addMessage('conv-uuid-1', 'user', 'a'.repeat(100));

      const params = pool.query.mock.calls[0][1];
      expect(params[6]).toBe(25); // 100 / 4
    });
  });

  describe('getBySessionId', () => {
    it('returns conversation when found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [makeConversationRow()] });

      const conv = await store.getBySessionId('session-abc');
      expect(conv).not.toBeNull();
      expect(conv!.sessionId).toBe('session-abc');
    });

    it('returns null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const conv = await store.getBySessionId('nonexistent');
      expect(conv).toBeNull();
    });
  });

  describe('listByVisitor', () => {
    it('returns conversations in reverse chronological order', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          makeConversationRow({ id: 'conv-2', started_at: new Date('2026-03-17') }),
          makeConversationRow({ id: 'conv-1', started_at: new Date('2026-03-16') }),
        ],
      });

      const convs = await store.listByVisitor('visitor-uuid-1');

      expect(convs).toHaveLength(2);
      expect(pool.query.mock.calls[0][0]).toContain('ORDER BY started_at DESC');
    });

    it('respects limit and offset', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await store.listByVisitor('visitor-uuid-1', 10, 5);

      const params = pool.query.mock.calls[0][1];
      expect(params[1]).toBe(10); // limit
      expect(params[2]).toBe(5);  // offset
    });
  });

  describe('getMessages', () => {
    it('returns messages in chronological order', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          makeMessageRow({ id: 'msg-1', role: 'user', content: 'Hi' }),
          makeMessageRow({ id: 'msg-2', role: 'assistant', content: 'Hello!' }),
        ],
      });

      const messages = await store.getMessages('conv-uuid-1');

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(pool.query.mock.calls[0][0]).toContain('ORDER BY created_at ASC');
    });
  });

  describe('getWithMessages', () => {
    it('returns conversation with its messages', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [makeConversationRow()] })
        .mockResolvedValueOnce({
          rows: [makeMessageRow({ role: 'user', content: 'Test' })],
        });

      const result = await store.getWithMessages('conv-uuid-1');

      expect(result).not.toBeNull();
      expect(result!.conversation.id).toBe('conv-uuid-1');
      expect(result!.messages).toHaveLength(1);
    });

    it('returns null for nonexistent conversation', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await store.getWithMessages('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateMetadata', () => {
    it('merges metadata using JSONB concatenation', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await store.updateMetadata('conv-uuid-1', { locale: 'fr', domain: 'example.com' });

      expect(pool.query.mock.calls[0][0]).toContain('metadata || $1::jsonb');
    });
  });

  describe('deleteOlderThan', () => {
    it('deletes conversations older than N days', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 5 });

      const count = await store.deleteOlderThan(90);

      expect(count).toBe(5);
      expect(pool.query.mock.calls[0][0]).toContain('make_interval');
    });

    it('filters by geoRegion when provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 2 });

      await store.deleteOlderThan(90, 'EU');

      expect(pool.query.mock.calls[0][0]).toContain('geo_region = $2');
      expect(pool.query.mock.calls[0][1]).toContain('EU');
    });
  });

  describe('metadata deserialization', () => {
    it('handles string metadata', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [makeConversationRow({ metadata: JSON.stringify({ locale: 'en' }) })],
      });

      const conv = await store.getBySessionId('session-abc');
      expect(conv!.metadata).toEqual({ locale: 'en' });
    });

    it('handles object metadata', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [makeConversationRow({ metadata: { locale: 'fr' } })],
      });

      const conv = await store.getBySessionId('session-abc');
      expect(conv!.metadata).toEqual({ locale: 'fr' });
    });
  });
});
