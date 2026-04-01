/**
 * Type stub for @runwell/rag-engine.
 *
 * This package is an optional workspace dependency that may not be installed
 * in every consumer. The stub lets the DTS generator resolve the module
 * without requiring the actual package in node_modules.
 */
declare module '@runwell/rag-engine' {
  export interface RetrievalResult {
    chunkId: number | null;
    content: string;
    similarity: number | null;
    source: string;
    section: string | null;
    title: string | null;
    fullPath: string | null;
    isLiveData: boolean;
    score?: number;
    liveData?: unknown;
  }

  export interface GroundedContext {
    confident: boolean;
    chunks: RetrievalResult[];
    availableSections: string[];
    contextText: string;
    liveData: unknown[];
  }

  export interface ConfidenceGateOptions {
    threshold?: number;
  }

  export function applyConfidenceGate(
    results: RetrievalResult[],
    options?: ConfidenceGateOptions
  ): GroundedContext;

  export function cosineSimilarity(a: number[], b: number[]): number;

  export interface StoredChunk {
    id: number;
    content: string;
    source: string;
    section: string | null;
    title: string | null;
    fullPath: string | null;
    tenantId: string;
  }

  export interface ChunkWithEmbedding {
    chunk: StoredChunk;
    vector: number[];
  }

  export class ChunkStore {
    constructor(db: unknown);
    getChunksByTenant(tenantId: string, source?: string): StoredChunk[];
    getChunksWithEmbeddings(tenantId: string): ChunkWithEmbedding[];
    [key: string]: unknown;
  }

  export interface GeminiEmbeddingConfig {
    apiKey: string;
    model?: string;
    dimensions?: number;
    batchSize?: number;
  }

  export class GeminiEmbeddingProvider {
    readonly dimensions: number;
    constructor(config: GeminiEmbeddingConfig);
    embed(text: string): Promise<number[]>;
  }
}
