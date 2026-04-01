import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ChunkStore } from '../../src/store/chunk-store.js';
import type { CreateChunkInput } from '../../src/types/store.js';

function createTestDb(): Database.Database {
  return new Database(':memory:');
}

function createTestChunk(overrides: Partial<CreateChunkInput> = {}): CreateChunkInput {
  return {
    tenantId: 'tenant-1',
    content: 'This is a test chunk about tax deductions under IRC Section 162.',
    source: 'irc',
    section: '162(a)',
    title: 'Trade or business expenses',
    fullPath: 'Subtitle A / Chapter 1 / Subchapter B / Part VI / Section 162(a)',
    tokenCount: 42,
    metadata: { hierarchy: ['Subtitle A', 'Chapter 1'] },
    ...overrides,
  };
}

describe('ChunkStore', () => {
  let store: ChunkStore;

  beforeEach(() => {
    const db = createTestDb();
    store = new ChunkStore(db);
  });

  describe('createChunk', () => {
    it('creates a chunk and returns its ID', () => {
      const id = store.createChunk(createTestChunk());
      expect(id).toBe(1);
    });

    it('auto-increments IDs', () => {
      const id1 = store.createChunk(createTestChunk());
      const id2 = store.createChunk(createTestChunk({ section: '163(a)' }));
      expect(id2).toBe(id1 + 1);
    });

    it('stores optional fields as null when omitted', () => {
      const id = store.createChunk({
        tenantId: 'tenant-1',
        content: 'Minimal chunk',
        source: 'test',
      });
      const chunk = store.getChunk(id);
      expect(chunk).not.toBeNull();
      expect(chunk!.section).toBeNull();
      expect(chunk!.title).toBeNull();
      expect(chunk!.fullPath).toBeNull();
      expect(chunk!.tokenCount).toBeNull();
      expect(chunk!.metadata).toBeNull();
    });
  });

  describe('createChunks (batch)', () => {
    it('creates multiple chunks in a transaction', () => {
      const inputs = [
        createTestChunk({ section: '162(a)' }),
        createTestChunk({ section: '162(b)' }),
        createTestChunk({ section: '163(a)' }),
      ];
      const ids = store.createChunks(inputs);
      expect(ids).toHaveLength(3);
      expect(ids).toEqual([1, 2, 3]);
    });
  });

  describe('getChunk', () => {
    it('returns null for non-existent chunk', () => {
      expect(store.getChunk(999)).toBeNull();
    });

    it('returns the chunk with parsed metadata', () => {
      const id = store.createChunk(createTestChunk());
      const chunk = store.getChunk(id);
      expect(chunk).not.toBeNull();
      expect(chunk!.tenantId).toBe('tenant-1');
      expect(chunk!.content).toContain('tax deductions');
      expect(chunk!.source).toBe('irc');
      expect(chunk!.section).toBe('162(a)');
      expect(chunk!.metadata).toEqual({ hierarchy: ['Subtitle A', 'Chapter 1'] });
    });
  });

  describe('getChunksByTenant', () => {
    it('returns only chunks for the specified tenant', () => {
      store.createChunk(createTestChunk({ tenantId: 'tenant-1' }));
      store.createChunk(createTestChunk({ tenantId: 'tenant-1' }));
      store.createChunk(createTestChunk({ tenantId: 'tenant-2' }));

      const t1 = store.getChunksByTenant('tenant-1');
      const t2 = store.getChunksByTenant('tenant-2');
      expect(t1).toHaveLength(2);
      expect(t2).toHaveLength(1);
    });

    it('filters by source when provided', () => {
      store.createChunk(createTestChunk({ source: 'irc' }));
      store.createChunk(createTestChunk({ source: 'irc' }));
      store.createChunk(createTestChunk({ source: 'menu' }));

      const irc = store.getChunksByTenant('tenant-1', 'irc');
      const menu = store.getChunksByTenant('tenant-1', 'menu');
      expect(irc).toHaveLength(2);
      expect(menu).toHaveLength(1);
    });
  });

  describe('storeEmbedding / getChunksWithEmbeddings', () => {
    it('stores and retrieves embedding vectors', () => {
      const id = store.createChunk(createTestChunk());
      const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
      store.storeEmbedding({ chunkId: id, vector });

      const results = store.getChunksWithEmbeddings('tenant-1');
      expect(results).toHaveLength(1);
      expect(results[0].chunk.id).toBe(id);

      // Float32 precision: compare with tolerance
      for (let i = 0; i < vector.length; i++) {
        expect(results[0].vector[i]).toBeCloseTo(vector[i], 5);
      }
    });

    it('stores batch embeddings', () => {
      const ids = store.createChunks([
        createTestChunk({ section: 'a' }),
        createTestChunk({ section: 'b' }),
      ]);
      store.storeEmbeddings([
        { chunkId: ids[0], vector: [0.1, 0.2] },
        { chunkId: ids[1], vector: [0.3, 0.4] },
      ]);

      const results = store.getChunksWithEmbeddings('tenant-1');
      expect(results).toHaveLength(2);
    });

    it('only returns chunks that have embeddings', () => {
      store.createChunk(createTestChunk({ section: 'a' }));
      const id2 = store.createChunk(createTestChunk({ section: 'b' }));
      store.storeEmbedding({ chunkId: id2, vector: [0.1, 0.2] });

      const results = store.getChunksWithEmbeddings('tenant-1');
      expect(results).toHaveLength(1);
      expect(results[0].chunk.section).toBe('b');
    });
  });

  describe('ftsSearch', () => {
    it('finds chunks by content match', () => {
      store.createChunk(createTestChunk({
        content: 'Business expenses are deductible under certain conditions.',
        section: '162(a)',
      }));
      store.createChunk(createTestChunk({
        content: 'Capital gains tax applies to asset sales.',
        section: '1001',
      }));

      const results = store.ftsSearch('tenant-1', 'business expenses');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].section).toBe('162(a)');
    });

    it('finds chunks by section match', () => {
      store.createChunk(createTestChunk({ section: '162(a)' }));
      store.createChunk(createTestChunk({ section: '501(c)(3)' }));

      const results = store.ftsSearch('tenant-1', '501');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].section).toBe('501(c)(3)');
    });

    it('respects tenant isolation in FTS', () => {
      store.createChunk(createTestChunk({ tenantId: 'tenant-1', content: 'alpha bravo' }));
      store.createChunk(createTestChunk({ tenantId: 'tenant-2', content: 'alpha charlie' }));

      const t1 = store.ftsSearch('tenant-1', 'alpha');
      const t2 = store.ftsSearch('tenant-2', 'alpha');
      expect(t1).toHaveLength(1);
      expect(t2).toHaveLength(1);
      expect(t1[0].tenantId).toBe('tenant-1');
      expect(t2[0].tenantId).toBe('tenant-2');
    });
  });

  describe('countChunks', () => {
    it('counts chunks for a tenant', () => {
      store.createChunks([
        createTestChunk(),
        createTestChunk(),
        createTestChunk({ tenantId: 'tenant-2' }),
      ]);
      expect(store.countChunks('tenant-1')).toBe(2);
      expect(store.countChunks('tenant-2')).toBe(1);
      expect(store.countChunks('tenant-3')).toBe(0);
    });

    it('counts by source', () => {
      store.createChunks([
        createTestChunk({ source: 'irc' }),
        createTestChunk({ source: 'irc' }),
        createTestChunk({ source: 'menu' }),
      ]);
      expect(store.countChunks('tenant-1', 'irc')).toBe(2);
      expect(store.countChunks('tenant-1', 'menu')).toBe(1);
    });
  });

  describe('deleteByTenant', () => {
    it('deletes all chunks for a tenant', () => {
      store.createChunks([
        createTestChunk({ tenantId: 'tenant-1' }),
        createTestChunk({ tenantId: 'tenant-1' }),
        createTestChunk({ tenantId: 'tenant-2' }),
      ]);

      const deleted = store.deleteByTenant('tenant-1');
      expect(deleted).toBe(2);
      expect(store.countChunks('tenant-1')).toBe(0);
      expect(store.countChunks('tenant-2')).toBe(1);
    });

    it('cascades to embeddings', () => {
      const id = store.createChunk(createTestChunk());
      store.storeEmbedding({ chunkId: id, vector: [0.1, 0.2] });

      store.deleteByTenant('tenant-1');
      const results = store.getChunksWithEmbeddings('tenant-1');
      expect(results).toHaveLength(0);
    });
  });

  describe('deleteBySource', () => {
    it('deletes chunks for a specific source', () => {
      store.createChunks([
        createTestChunk({ source: 'irc' }),
        createTestChunk({ source: 'irc' }),
        createTestChunk({ source: 'menu' }),
      ]);

      const deleted = store.deleteBySource('tenant-1', 'irc');
      expect(deleted).toBe(2);
      expect(store.countChunks('tenant-1')).toBe(1);
    });
  });

  describe('tenant isolation', () => {
    it('never leaks data between tenants', () => {
      store.createChunk(createTestChunk({
        tenantId: 'tenant-a',
        content: 'Secret A data',
        section: 'sec-a',
      }));
      store.createChunk(createTestChunk({
        tenantId: 'tenant-b',
        content: 'Secret B data',
        section: 'sec-b',
      }));

      // Direct lookup
      const a = store.getChunksByTenant('tenant-a');
      const b = store.getChunksByTenant('tenant-b');
      expect(a.every((c) => c.tenantId === 'tenant-a')).toBe(true);
      expect(b.every((c) => c.tenantId === 'tenant-b')).toBe(true);

      // FTS isolation
      const ftsA = store.ftsSearch('tenant-a', 'Secret');
      const ftsB = store.ftsSearch('tenant-b', 'Secret');
      expect(ftsA.every((c) => c.tenantId === 'tenant-a')).toBe(true);
      expect(ftsB.every((c) => c.tenantId === 'tenant-b')).toBe(true);
    });
  });
});
