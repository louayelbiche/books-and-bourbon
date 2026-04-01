import type { LiveDataResult } from './providers.js';

/**
 * Source material to be ingested into the knowledge base.
 */
export interface IngestSource {
  /** Tenant this content belongs to. */
  tenantId: string;

  /** Raw file content (text, PDF, image). */
  content: Buffer | string;

  /** MIME type of the content. */
  mimeType: string;

  /** Original file name (for metadata). */
  fileName: string;

  /** Source identifier (e.g., "irc", "menu", "sop"). */
  source: string;

  /** Optional metadata attached to all chunks from this source. */
  metadata?: Record<string, unknown>;
}

/**
 * Result of an ingestion operation.
 */
export interface IngestResult {
  /** Number of chunks created. */
  chunksCreated: number;

  /** Number of embeddings stored. */
  embeddingsStored: number;

  /** Source identifier. */
  source: string;

  /** Tenant ID. */
  tenantId: string;
}

/**
 * Options for retrieval queries.
 */
export interface RetrieveOptions {
  /** Tenant to search within. Required. */
  tenantId: string;

  /** Maximum number of results to return. Default: 8. */
  topK?: number;

  /** Minimum cosine similarity threshold. Default: 0.75. */
  threshold?: number;

  /** Source filter (e.g., only search "irc" or "menu"). */
  sourceFilter?: string;

  /** Whether to include live data adapter results. Default: true. */
  includeLiveData?: boolean;
}

/**
 * A single retrieval result (one chunk or live data item).
 */
export interface RetrievalResult {
  /** Chunk database ID (null for live data). */
  chunkId: number | null;

  /** The text content of this result. */
  content: string;

  /** Cosine similarity score (0 to 1). Null for live data and FTS results. */
  similarity: number | null;

  /** Source identifier (e.g., "irc", "menu", "live"). */
  source: string;

  /** Section reference if available (e.g., "162(a)"). */
  section: string | null;

  /** Section title if available. */
  title: string | null;

  /** Full breadcrumb path. */
  fullPath: string | null;

  /** Whether this came from a live data adapter. */
  isLiveData: boolean;

  /** Reciprocal Rank Fusion score (set during merge). */
  score?: number;

  /** Live data payload (only for live data results). */
  liveData?: LiveDataResult;
}

/**
 * Grounded context returned by the engine after retrieval + confidence gate.
 * This is what the consumer passes to their LLM as context.
 */
export interface GroundedContext {
  /** Whether the retrieval found confident results. */
  confident: boolean;

  /** Chunks that passed the confidence threshold. */
  chunks: RetrievalResult[];

  /** All section references found in the chunks (for citation checking). */
  availableSections: string[];

  /** Formatted context string ready for LLM injection. */
  contextText: string;

  /** Live data results (if any). */
  liveData: LiveDataResult[];
}

/**
 * Result of verifying citations in an LLM response.
 */
export interface CitationCheckResult {
  /** Citations that match retrieved sections. */
  valid: string[];

  /** Citations that do NOT match any retrieved section (hallucinated). */
  hallucinated: string[];

  /** Citations that could not be verified (ambiguous format). */
  unverifiable: string[];

  /** Whether all citations are valid. */
  allValid: boolean;
}
