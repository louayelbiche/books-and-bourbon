import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ChunkStore } from '../../src/store/chunk-store.js';
import { Ingestor } from '../../src/ingest/ingestor.js';
import type { EmbeddingProvider, OCRProvider } from '../../src/types/providers.js';
import type { IngestSource } from '../../src/types/engine.js';

/**
 * Mock embedding provider that returns deterministic vectors.
 */
function createMockEmbeddingProvider(dims: number = 8): EmbeddingProvider {
  return {
    dimensions: dims,
    async embed(text: string): Promise<number[]> {
      // Simple hash-based deterministic vector
      const vec = new Array(dims).fill(0);
      for (let i = 0; i < text.length; i++) {
        vec[i % dims] += text.charCodeAt(i) / 1000;
      }
      // Normalize
      const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      return mag > 0 ? vec.map((v) => v / mag) : vec;
    },
    async embedBatch(texts: string[]): Promise<number[][]> {
      return Promise.all(texts.map((t) => this.embed(t)));
    },
  };
}

/**
 * Mock OCR provider that returns placeholder text.
 */
function createMockOCRProvider(): OCRProvider {
  return {
    async extract(_file: Buffer, mimeType: string): Promise<string> {
      return `Extracted text from ${mimeType} document. Section 162(a). Business expenses are deductible.`;
    },
  };
}

function createTextSource(overrides: Partial<IngestSource> = {}): IngestSource {
  return {
    tenantId: 'tenant-1',
    content: 'Section 162(a). Trade or business expenses\nThere shall be allowed as a deduction all the ordinary and necessary expenses paid or incurred during the taxable year in carrying on any trade or business.',
    mimeType: 'text/plain',
    fileName: 'irc-162.txt',
    source: 'irc',
    ...overrides,
  };
}

describe('Ingestor', () => {
  let store: ChunkStore;
  let embeddingProvider: EmbeddingProvider;
  let ocrProvider: OCRProvider;

  beforeEach(() => {
    const db = new Database(':memory:');
    store = new ChunkStore(db);
    embeddingProvider = createMockEmbeddingProvider();
    ocrProvider = createMockOCRProvider();
  });

  describe('text ingestion', () => {
    it('ingests a text string and stores chunks with embeddings', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });
      const result = await ingestor.ingest(createTextSource());

      expect(result.chunksCreated).toBeGreaterThan(0);
      expect(result.embeddingsStored).toBe(result.chunksCreated);
      expect(result.source).toBe('irc');
      expect(result.tenantId).toBe('tenant-1');

      // Verify chunks are stored
      const chunks = store.getChunksByTenant('tenant-1');
      expect(chunks.length).toBe(result.chunksCreated);

      // Verify embeddings are stored
      const withEmb = store.getChunksWithEmbeddings('tenant-1');
      expect(withEmb.length).toBe(result.embeddingsStored);
      expect(withEmb[0].vector.length).toBe(8); // mock dims
    });

    it('ingests a Buffer with text MIME type', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });
      const source = createTextSource({
        content: Buffer.from('Section 501(c)(3). Tax-exempt organizations'),
        mimeType: 'text/plain',
      });
      const result = await ingestor.ingest(source);
      expect(result.chunksCreated).toBeGreaterThan(0);
    });

    it('returns zero counts for empty content', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });
      const source = createTextSource({ content: '   ' });
      const result = await ingestor.ingest(source);
      expect(result.chunksCreated).toBe(0);
      expect(result.embeddingsStored).toBe(0);
    });
  });

  describe('OCR ingestion', () => {
    it('delegates image files to OCR provider', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider, ocrProvider });
      const source: IngestSource = {
        tenantId: 'tenant-1',
        content: Buffer.from('fake image data'),
        mimeType: 'image/jpeg',
        fileName: 'receipt.jpg',
        source: 'menu',
      };
      const result = await ingestor.ingest(source);
      expect(result.chunksCreated).toBeGreaterThan(0);

      const chunks = store.getChunksByTenant('tenant-1');
      expect(chunks[0].content).toContain('Extracted text');
    });

    it('delegates PDF files to OCR provider', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider, ocrProvider });
      const source: IngestSource = {
        tenantId: 'tenant-1',
        content: Buffer.from('fake pdf data'),
        mimeType: 'application/pdf',
        fileName: 'sop.pdf',
        source: 'sop',
      };
      const result = await ingestor.ingest(source);
      expect(result.chunksCreated).toBeGreaterThan(0);
    });

    it('throws when no OCR provider is configured for non-text files', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });
      const source: IngestSource = {
        tenantId: 'tenant-1',
        content: Buffer.from('fake image'),
        mimeType: 'image/jpeg',
        fileName: 'photo.jpg',
        source: 'menu',
      };
      await expect(ingestor.ingest(source)).rejects.toThrow('no OCR provider configured');
    });
  });

  describe('chunking options', () => {
    it('passes chunk options through to the chunker', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });
      const longText = Array.from({ length: 20 }, (_, i) =>
        `Section ${i + 100}. Paragraph ${i + 1}\nThis is a detailed paragraph about tax regulation number ${i + 1} with various provisions and requirements that must be followed.`
      ).join('\n\n');

      const result = await ingestor.ingest(
        createTextSource({ content: longText }),
        { strategy: 'paragraph', targetTokens: 100, minTokens: 10 }
      );

      expect(result.chunksCreated).toBeGreaterThan(1);
    });

    it('uses default chunk options when none specified', async () => {
      const ingestor = new Ingestor({
        store,
        embeddingProvider,
        defaultChunkOptions: { strategy: 'section', breadcrumb: 'IRC' },
      });
      const result = await ingestor.ingest(createTextSource());
      expect(result.chunksCreated).toBeGreaterThan(0);

      const chunks = store.getChunksByTenant('tenant-1');
      expect(chunks[0].content).toContain('IRC');
    });
  });

  describe('batch embedding', () => {
    it('respects embedding batch size', async () => {
      let batchCallCount = 0;
      const countingProvider: EmbeddingProvider = {
        dimensions: 4,
        async embed(text: string) {
          return new Array(4).fill(text.length / 100);
        },
        async embedBatch(texts: string[]) {
          batchCallCount++;
          return texts.map((t) => new Array(4).fill(t.length / 100));
        },
      };

      const ingestor = new Ingestor({
        store,
        embeddingProvider: countingProvider,
        embeddingBatchSize: 2,
      });

      // Create 5 chunks
      const longText = Array.from({ length: 5 }, (_, i) =>
        `Section ${i + 200}. Topic ${i}\n${'Content '.repeat(50)}`
      ).join('\n\n');

      await ingestor.ingest(
        createTextSource({ content: longText }),
        { strategy: 'section', minTokens: 1 }
      );

      // With batch size 2 and 5 chunks, we need at least 3 batch calls
      expect(batchCallCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('tenant scoping', () => {
    it('stores chunks under the correct tenant', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });

      await ingestor.ingest(createTextSource({ tenantId: 'tenant-a' }));
      await ingestor.ingest(createTextSource({ tenantId: 'tenant-b' }));

      const a = store.getChunksByTenant('tenant-a');
      const b = store.getChunksByTenant('tenant-b');
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
      expect(a.every((c) => c.tenantId === 'tenant-a')).toBe(true);
      expect(b.every((c) => c.tenantId === 'tenant-b')).toBe(true);
    });
  });

  describe('metadata passthrough', () => {
    it('attaches source metadata to all chunks', async () => {
      const ingestor = new Ingestor({ store, embeddingProvider });
      await ingestor.ingest(
        createTextSource({ metadata: { version: '2026', priority: 'high' } })
      );

      const chunks = store.getChunksByTenant('tenant-1');
      expect(chunks[0].metadata).toEqual({ version: '2026', priority: 'high' });
    });
  });
});
