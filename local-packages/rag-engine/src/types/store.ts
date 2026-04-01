/**
 * Types for the chunk store layer.
 */

/**
 * A chunk stored in the database.
 */
export interface StoredChunk {
  id: number;
  tenantId: string;
  content: string;
  source: string;
  section: string | null;
  title: string | null;
  fullPath: string | null;
  tokenCount: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Input for creating a new chunk.
 */
export interface CreateChunkInput {
  tenantId: string;
  content: string;
  source: string;
  section?: string;
  title?: string;
  fullPath?: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Input for storing an embedding vector.
 */
export interface StoreEmbeddingInput {
  chunkId: number;
  vector: number[];
}

/**
 * A chunk with its embedding vector (for search).
 */
export interface ChunkWithEmbedding {
  chunk: StoredChunk;
  vector: number[];
}
