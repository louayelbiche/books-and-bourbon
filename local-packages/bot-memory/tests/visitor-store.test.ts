import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisitorStore } from '../src/visitor/visitor-store.js';
import type { CreateVisitorInput } from '../src/visitor/types.js';

function createMockPool() {
  return {
    query: vi.fn(),
  };
}

function makeProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'visitor-uuid-1',
    visitor_key: 'cookie-abc',
    visitor_type: 'cookie',
    source_app: 'shopimate-sales',
    tenant_id: null,
    profile_json: { facts: [], last_conversation_summary: '' },
    visit_count: 1,
    total_messages: 0,
    geo_region: null,
    first_seen_at: new Date('2026-03-17T00:00:00Z'),
    last_seen_at: new Date('2026-03-17T00:00:00Z'),
    ...overrides,
  };
}

describe('VisitorStore', () => {
  let pool: ReturnType<typeof createMockPool>;
  let store: VisitorStore;

  beforeEach(() => {
    pool = createMockPool();
    store = new VisitorStore(pool as never);
  });

  describe('getOrCreate', () => {
    it('creates a new visitor and returns profile', async () => {
      const row = makeProfileRow();
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const input: CreateVisitorInput = {
        identity: {
          visitorKey: 'cookie-abc',
          visitorType: 'cookie',
          sourceApp: 'shopimate-sales',
        },
      };

      const profile = await store.getOrCreate(input);

      expect(pool.query).toHaveBeenCalledOnce();
      expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO bot_visitor_profiles');
      expect(pool.query.mock.calls[0][0]).toContain('ON CONFLICT');
      expect(profile.visitorKey).toBe('cookie-abc');
      expect(profile.sourceApp).toBe('shopimate-sales');
      expect(profile.facts).toEqual([]);
      expect(profile.visitCount).toBe(1);
    });

    it('passes geoRegion when provided', async () => {
      const row = makeProfileRow({ geo_region: 'EU' });
      pool.query.mockResolvedValueOnce({ rows: [row] });

      await store.getOrCreate({
        identity: { visitorKey: 'key', visitorType: 'cookie', sourceApp: 'app' },
        geoRegion: 'EU',
      });

      expect(pool.query.mock.calls[0][1]).toContain('EU');
    });

    it('passes tenantId when provided', async () => {
      const row = makeProfileRow({ tenant_id: 'tenant-1' });
      pool.query.mockResolvedValueOnce({ rows: [row] });

      await store.getOrCreate({
        identity: {
          visitorKey: 'user-1',
          visitorType: 'authenticated',
          sourceApp: 'bib',
          tenantId: 'tenant-1',
        },
      });

      expect(pool.query.mock.calls[0][1]).toContain('tenant-1');
    });
  });

  describe('getByKey', () => {
    it('returns profile when found', async () => {
      const row = makeProfileRow();
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const result = await store.getByKey('cookie-abc', 'shopimate-sales');

      expect(result).not.toBeNull();
      expect(result!.visitorKey).toBe('cookie-abc');
    });

    it('returns null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await store.getByKey('nonexistent', 'app');
      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns profile when found', async () => {
      const row = makeProfileRow();
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const result = await store.getById('visitor-uuid-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('visitor-uuid-1');
    });

    it('returns null when not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await store.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('recordVisit', () => {
    it('increments visit count', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await store.recordVisit('visitor-uuid-1');

      expect(pool.query.mock.calls[0][0]).toContain('visit_count = visit_count + 1');
      expect(pool.query.mock.calls[0][1]).toEqual(['visitor-uuid-1']);
    });
  });

  describe('updateProfile', () => {
    it('writes facts and summary as JSONB', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const facts = [
        { category: 'preference' as const, key: 'shipping', value: 'free', confidence: 0.9 },
      ];
      await store.updateProfile('visitor-uuid-1', facts, 'Asked about shoes');

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('profile_json');
      const parsed = JSON.parse(params[0] as string);
      expect(parsed.facts).toHaveLength(1);
      expect(parsed.facts[0].key).toBe('shipping');
      expect(parsed.last_conversation_summary).toBe('Asked about shoes');
    });
  });

  describe('incrementMessages', () => {
    it('increments total_messages by count', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await store.incrementMessages('visitor-uuid-1', 5);

      expect(pool.query.mock.calls[0][0]).toContain('total_messages = total_messages + $1');
      expect(pool.query.mock.calls[0][1]).toEqual([5, 'visitor-uuid-1']);
    });
  });

  describe('delete', () => {
    it('deletes visitor by id', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await store.delete('visitor-uuid-1');

      expect(pool.query.mock.calls[0][0]).toContain('DELETE FROM bot_visitor_profiles');
      expect(pool.query.mock.calls[0][1]).toEqual(['visitor-uuid-1']);
    });
  });

  describe('deleteExpiredEU', () => {
    it('deletes EU visitors older than retention period', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{}, {}, {}], rowCount: 3 });

      const count = await store.deleteExpiredEU(90);

      expect(count).toBe(3);
      expect(pool.query.mock.calls[0][0]).toContain("geo_region = 'EU'");
      expect(pool.query.mock.calls[0][1]).toEqual([90]);
    });

    it('returns 0 when no rows deleted', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const count = await store.deleteExpiredEU(90);
      expect(count).toBe(0);
    });
  });

  describe('profile deserialization', () => {
    it('handles string profile_json', async () => {
      const row = makeProfileRow({
        profile_json: JSON.stringify({
          facts: [{ category: 'interest', key: 'shoes', value: 'running', confidence: 0.9 }],
          last_conversation_summary: 'Talked about shoes',
        }),
      });
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const profile = await store.getById('visitor-uuid-1');
      expect(profile!.facts).toHaveLength(1);
      expect(profile!.facts[0].key).toBe('shoes');
      expect(profile!.lastConversationSummary).toBe('Talked about shoes');
    });

    it('handles object profile_json', async () => {
      const row = makeProfileRow({
        profile_json: {
          facts: [{ category: 'context', key: 'size', value: 'US 10', confidence: 1.0 }],
          last_conversation_summary: '',
        },
      });
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const profile = await store.getById('visitor-uuid-1');
      expect(profile!.facts).toHaveLength(1);
      expect(profile!.facts[0].value).toBe('US 10');
    });
  });
});
