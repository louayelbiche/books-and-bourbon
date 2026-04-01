import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ChunkStore } from '../../src/store/chunk-store.js';
import { Retriever } from '../../src/retrieve/retriever.js';
import { cosineSimilarity } from '../../src/retrieve/cosine.js';
import type { EmbeddingProvider, LiveDataAdapter, LiveDataResult } from '../../src/types/providers.js';

/**
 * Mock embedding provider with keyword-based vectors.
 * Chunks about "expenses" get vectors pointing in one direction;
 * chunks about "interest" get vectors pointing in another.
 */
function createKeywordEmbeddingProvider(): EmbeddingProvider {
  const dims = 4;

  function embedText(text: string): number[] {
    const lower = text.toLowerCase();
    const vec = [0, 0, 0, 0];

    if (lower.includes('expense') || lower.includes('deduction')) {
      vec[0] = 1.0;
      vec[1] = 0.5;
    }
    if (lower.includes('interest') || lower.includes('loan')) {
      vec[2] = 1.0;
      vec[3] = 0.5;
    }
    if (lower.includes('tax')) {
      vec[0] += 0.3;
      vec[2] += 0.3;
    }

    // Normalize
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return mag > 0 ? vec.map((v) => v / mag) : [0.25, 0.25, 0.25, 0.25];
  }

  return {
    dimensions: dims,
    async embed(text: string) { return embedText(text); },
    async embedBatch(texts: string[]) { return texts.map(embedText); },
  };
}

function createMockLiveDataAdapter(name: string, data: Record<string, unknown>): LiveDataAdapter {
  return {
    name,
    description: `Live data for ${name}`,
    async query(_params: Record<string, unknown>): Promise<LiveDataResult> {
      return {
        source: name,
        data,
        summary: `${name}: ${JSON.stringify(data)}`,
        fetchedAt: new Date(),
      };
    },
  };
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('throws on dimension mismatch', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow('dimension mismatch');
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });
});

describe('Retriever', () => {
  let store: ChunkStore;
  let provider: EmbeddingProvider;

  beforeEach(async () => {
    const db = new Database(':memory:');
    store = new ChunkStore(db);
    provider = createKeywordEmbeddingProvider();

    // Seed some chunks with embeddings
    const chunks = [
      { content: 'Section 162(a). Trade or business expenses are deductible.', section: '162(a)', title: 'Business expenses' },
      { content: 'Section 163. Interest on indebtedness is deductible for loans.', section: '163', title: 'Interest deduction' },
      { content: 'Section 164. Tax deductions for state and local taxes paid.', section: '164', title: 'Tax deductions' },
      { content: 'Section 501(c)(3). Tax-exempt organizations do not pay tax.', section: '501(c)(3)', title: 'Tax-exempt' },
    ];

    for (const c of chunks) {
      const id = store.createChunk({
        tenantId: 'tenant-1',
        content: c.content,
        source: 'irc',
        section: c.section,
        title: c.title,
      });
      const vec = await provider.embed(c.content);
      store.storeEmbedding({ chunkId: id, vector: vec });
    }

    // Add a chunk for tenant-2 (isolation test)
    const t2Id = store.createChunk({
      tenantId: 'tenant-2',
      content: 'Secret tenant-2 data about expenses.',
      source: 'private',
      section: 'secret',
    });
    const t2Vec = await provider.embed('Secret tenant-2 data about expenses.');
    store.storeEmbedding({ chunkId: t2Id, vector: t2Vec });
  });

  describe('vector search', () => {
    it('finds relevant chunks for an expense query', async () => {
      const retriever = new Retriever({ store, embeddingProvider: provider });
      const results = await retriever.retrieve('business expense deductions', {
        tenantId: 'tenant-1',
        threshold: 0,
      });

      expect(results.length).toBeGreaterThan(0);
      // The expense-related chunk should rank higher than interest
      const expenseIdx = results.findIndex((r) => r.section === '162(a)');
      const interestIdx = results.findIndex((r) => r.section === '163');
      if (expenseIdx >= 0 && interestIdx >= 0) {
        expect(expenseIdx).toBeLessThan(interestIdx);
      }
    });

    it('finds relevant chunks for an interest query', async () => {
      const retriever = new Retriever({ store, embeddingProvider: provider });
      const results = await retriever.retrieve('interest on loans', {
        tenantId: 'tenant-1',
        threshold: 0,
      });

      expect(results.length).toBeGreaterThan(0);
      const interestIdx = results.findIndex((r) => r.section === '163');
      expect(interestIdx).toBeGreaterThanOrEqual(0);
    });
  });

  describe('threshold filtering', () => {
    it('filters out low-similarity results', async () => {
      const retriever = new Retriever({ store, embeddingProvider: provider });
      const lowThreshold = await retriever.retrieve('expenses', {
        tenantId: 'tenant-1',
        threshold: 0,
      });
      const highThreshold = await retriever.retrieve('expenses', {
        tenantId: 'tenant-1',
        threshold: 0.99,
      });

      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });
  });

  describe('FTS search', () => {
    it('finds chunks by section number', async () => {
      const retriever = new Retriever({ store, embeddingProvider: provider });
      const results = await retriever.retrieve('section 501', {
        tenantId: 'tenant-1',
        threshold: 0,
      });

      const found = results.find((r) => r.section === '501(c)(3)');
      expect(found).toBeDefined();
    });
  });

  describe('hybrid merge', () => {
    it('deduplicates results from vector and FTS', async () => {
      const retriever = new Retriever({ store, embeddingProvider: provider });
      const results = await retriever.retrieve('business expenses deduction', {
        tenantId: 'tenant-1',
        threshold: 0,
      });

      // Check no duplicate chunk IDs
      const ids = results.filter((r) => r.chunkId !== null).map((r) => r.chunkId);
      const unique = new Set(ids);
      expect(ids.length).toBe(unique.size);
    });
  });

  describe('tenant isolation', () => {
    it('never returns chunks from other tenants', async () => {
      const retriever = new Retriever({ store, embeddingProvider: provider });
      const results = await retriever.retrieve('expenses', {
        tenantId: 'tenant-1',
        threshold: 0,
      });

      for (const r of results) {
        if (r.chunkId !== null) {
          const chunk = store.getChunk(r.chunkId);
          expect(chunk?.tenantId).toBe('tenant-1');
        }
      }
    });
  });

  describe('live data adapters', () => {
    it('merges live data results with static results', async () => {
      const adapter = createMockLiveDataAdapter('availability', {
        tables: 5,
        nextSlot: '7:00 PM',
      });
      const retriever = new Retriever({
        store,
        embeddingProvider: provider,
        liveDataAdapters: [adapter],
      });

      const results = await retriever.retrieve('table availability', {
        tenantId: 'tenant-1',
        threshold: 0,
        includeLiveData: true,
      });

      const liveResult = results.find((r) => r.isLiveData);
      expect(liveResult).toBeDefined();
      expect(liveResult!.source).toBe('live');
      expect(liveResult!.liveData?.data).toHaveProperty('tables');
    });

    it('excludes live data when includeLiveData is false', async () => {
      const adapter = createMockLiveDataAdapter('stock', { inStock: 42 });
      const retriever = new Retriever({
        store,
        embeddingProvider: provider,
        liveDataAdapters: [adapter],
      });

      const results = await retriever.retrieve('inventory', {
        tenantId: 'tenant-1',
        threshold: 0,
        includeLiveData: false,
      });

      expect(results.every((r) => !r.isLiveData)).toBe(true);
    });

    it('handles adapter failures gracefully', async () => {
      const failingAdapter: LiveDataAdapter = {
        name: 'broken',
        description: 'Always fails',
        async query() { throw new Error('Connection refused'); },
      };
      const retriever = new Retriever({
        store,
        embeddingProvider: provider,
        liveDataAdapters: [failingAdapter],
      });

      // Should not throw; just skip the failing adapter
      const results = await retriever.retrieve('anything', {
        tenantId: 'tenant-1',
        threshold: 0,
      });
      expect(results.every((r) => !r.isLiveData)).toBe(true);
    });
  });
});
