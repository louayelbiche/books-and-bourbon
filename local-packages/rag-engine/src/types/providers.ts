/**
 * Provider interfaces for the RAG engine.
 * Consumers implement these; the engine never depends on a specific LLM.
 */

/**
 * EmbeddingProvider generates vector embeddings from text.
 * Consumers can implement this with Gemini, OpenAI, local models, etc.
 */
export interface EmbeddingProvider {
  /** Generate a single embedding vector for the given text. */
  embed(text: string): Promise<number[]>;

  /** Generate embeddings for multiple texts in batch. */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** The dimensionality of vectors produced by this provider. */
  readonly dimensions: number;
}

/**
 * OCRProvider extracts text from non-text files (images, PDFs).
 * Consumers can implement this with Gemini Vision, Tesseract, etc.
 */
export interface OCRProvider {
  /** Extract text content from a file buffer. */
  extract(file: Buffer, mimeType: string): Promise<string>;
}

/**
 * LiveDataAdapter provides real-time data at query time.
 * Examples: table availability, inventory levels, order status.
 */
export interface LiveDataAdapter {
  /** Unique identifier for this adapter. */
  readonly name: string;

  /** Human-readable description. Shown to retriever for relevance matching. */
  readonly description: string;

  /** Query the live data source. Returns structured results. */
  query(params: Record<string, unknown>): Promise<LiveDataResult>;
}

/**
 * Result from a LiveDataAdapter query.
 */
export interface LiveDataResult {
  /** The adapter that produced this result. */
  source: string;

  /** Structured data payload. */
  data: Record<string, unknown>;

  /** Human-readable summary for inclusion in LLM context. */
  summary: string;

  /** Timestamp of when this data was fetched. */
  fetchedAt: Date;
}
