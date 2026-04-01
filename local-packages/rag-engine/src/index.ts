// Types: engine
export type {
  IngestSource,
  IngestResult,
  RetrieveOptions,
  RetrievalResult,
  GroundedContext,
  CitationCheckResult,
} from './types/engine.js';

// Types: providers
export type {
  EmbeddingProvider,
  OCRProvider,
  LiveDataAdapter,
  LiveDataResult,
} from './types/providers.js';

// Types: store
export type {
  StoredChunk,
  CreateChunkInput,
  StoreEmbeddingInput,
  ChunkWithEmbedding,
} from './types/store.js';

// Store
export { ChunkStore } from './store/chunk-store.js';

// Chunk
export { chunk, estimateTokens } from './chunk/chunker.js';
export type { ChunkStrategy, ChunkOptions, Chunk } from './chunk/chunker.js';

// Ingest
export { Ingestor } from './ingest/ingestor.js';
export type { IngestorConfig } from './ingest/ingestor.js';

// Retrieve
export { Retriever, cosineSimilarity } from './retrieve/index.js';
export type { RetrieverConfig } from './retrieve/index.js';

// Ground (anti-hallucination)
export { applyConfidenceGate, verifyCitations } from './ground/index.js';
export type { ConfidenceGateOptions } from './ground/index.js';

// Providers (concrete implementations)
export { GeminiEmbeddingProvider } from './providers/gemini-embedding.js';
export type { GeminiEmbeddingConfig } from './providers/gemini-embedding.js';
export { PdfExtractor, createPdfExtractor } from './providers/pdf-extractor.js';
