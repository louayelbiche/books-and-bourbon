import type { EmbeddingProvider, OCRProvider } from '../types/providers.js';
import type { IngestSource, IngestResult } from '../types/engine.js';
import type { ChunkOptions } from '../chunk/chunker.js';
import { chunk as chunkText } from '../chunk/chunker.js';
import { ChunkStore } from '../store/chunk-store.js';

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
]);

function isTextMimeType(mimeType: string): boolean {
  return TEXT_MIME_TYPES.has(mimeType) || mimeType.startsWith('text/');
}

export interface IngestorConfig {
  /** The chunk store to write to. */
  store: ChunkStore;

  /** Embedding provider for generating vectors. */
  embeddingProvider: EmbeddingProvider;

  /** OCR provider for extracting text from images and PDFs. Optional. */
  ocrProvider?: OCRProvider;

  /** Default chunking options (can be overridden per ingest call). */
  defaultChunkOptions?: ChunkOptions;

  /** Batch size for embedding calls. Default: 20. */
  embeddingBatchSize?: number;
}

/**
 * Ingestor handles the full ingestion pipeline:
 * 1. Extract text (directly or via OCR)
 * 2. Chunk the text
 * 3. Generate embeddings
 * 4. Store chunks and embeddings
 */
export class Ingestor {
  private store: ChunkStore;
  private embeddingProvider: EmbeddingProvider;
  private ocrProvider?: OCRProvider;
  private defaultChunkOptions: ChunkOptions;
  private embeddingBatchSize: number;

  constructor(config: IngestorConfig) {
    this.store = config.store;
    this.embeddingProvider = config.embeddingProvider;
    this.ocrProvider = config.ocrProvider;
    this.defaultChunkOptions = config.defaultChunkOptions ?? {};
    this.embeddingBatchSize = config.embeddingBatchSize ?? 20;
  }

  /**
   * Ingest a source document: extract text, chunk, embed, and store.
   */
  async ingest(source: IngestSource, chunkOptions?: ChunkOptions): Promise<IngestResult> {
    // Step 1: Extract text
    const text = await this.extractText(source);

    if (!text.trim()) {
      return {
        chunksCreated: 0,
        embeddingsStored: 0,
        source: source.source,
        tenantId: source.tenantId,
      };
    }

    // Step 2: Chunk the text
    const options: ChunkOptions = {
      ...this.defaultChunkOptions,
      ...chunkOptions,
      source: source.source,
    };
    const chunks = chunkText(text, options);

    if (chunks.length === 0) {
      return {
        chunksCreated: 0,
        embeddingsStored: 0,
        source: source.source,
        tenantId: source.tenantId,
      };
    }

    // Step 3: Store chunks
    const chunkIds = this.store.createChunks(
      chunks.map((c) => ({
        tenantId: source.tenantId,
        content: c.content,
        source: source.source,
        section: c.section ?? undefined,
        title: c.title ?? undefined,
        fullPath: c.fullPath ?? undefined,
        tokenCount: c.tokenCount,
        metadata: source.metadata,
      }))
    );

    // Step 4: Generate embeddings in batches
    let embeddingsStored = 0;
    for (let i = 0; i < chunks.length; i += this.embeddingBatchSize) {
      const batch = chunks.slice(i, i + this.embeddingBatchSize);
      const batchIds = chunkIds.slice(i, i + this.embeddingBatchSize);

      // Contextual embedding: prepend section + title to content before embedding.
      // This gives the embedding model context about what the chunk is about,
      // improving retrieval precision by 35-49% (Anthropic Contextual Retrieval).
      const vectors = await this.embeddingProvider.embedBatch(
        batch.map((c) => {
          const prefix = [c.section, c.title].filter(Boolean).join(' > ');
          return prefix ? `${prefix}\n\n${c.content}` : c.content;
        })
      );

      this.store.storeEmbeddings(
        vectors.map((vector, j) => ({
          chunkId: batchIds[j],
          vector,
        }))
      );

      embeddingsStored += vectors.length;
    }

    return {
      chunksCreated: chunkIds.length,
      embeddingsStored,
      source: source.source,
      tenantId: source.tenantId,
    };
  }

  /**
   * Extract text from the source, using OCR if needed.
   */
  private async extractText(source: IngestSource): Promise<string> {
    // If content is already a string, use it directly
    if (typeof source.content === 'string') {
      return source.content;
    }

    // If it's a text MIME type, decode the buffer
    if (isTextMimeType(source.mimeType)) {
      return source.content.toString('utf-8');
    }

    // Non-text content requires an OCR provider
    if (!this.ocrProvider) {
      throw new Error(
        `Cannot process ${source.mimeType} files: no OCR provider configured. ` +
        `Provide an OCRProvider to handle images and PDFs.`
      );
    }

    return this.ocrProvider.extract(source.content, source.mimeType);
  }
}
