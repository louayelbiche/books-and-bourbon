import type { EmbeddingProvider } from '../types/providers.js';

/**
 * Configuration for the Gemini embedding provider.
 */
export interface GeminiEmbeddingConfig {
  /** Google AI API key. */
  apiKey: string;

  /** Model to use. Defaults to 'gemini-embedding-001'. */
  model?: string;

  /** Vector dimensionality. Defaults to 3072 (gemini-embedding-001). */
  dimensions?: number;

  /** Maximum texts per batch request. Defaults to 100 (Gemini's limit). */
  batchSize?: number;

  /** Maximum retries on rate limit (429) or server errors. Defaults to 3. */
  maxRetries?: number;
}

/**
 * EmbeddingProvider implementation using Google Gemini's embedding API.
 *
 * Requires `@google/generative-ai` as a peer dependency.
 * Install it in your project: `pnpm add @google/generative-ai`
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  // Lazy-loaded SDK instance
  private genAI: unknown = null;

  constructor(config: GeminiEmbeddingConfig) {
    if (!config.apiKey) {
      throw new Error('GeminiEmbeddingProvider: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gemini-embedding-001';
    this.dimensions = config.dimensions ?? 3072;
    this.batchSize = config.batchSize ?? 100;
    this.maxRetries = config.maxRetries ?? 3;
  }

  async embed(text: string): Promise<number[]> {
    const model = await this.getModel();
    const request = this.dimensions !== 3072
      ? { content: { role: 'user' as const, parts: [{ text }] }, outputDimensionality: this.dimensions }
      : text;
    const result = await this.withRetry(() =>
      typeof request === 'string' ? model.embedContent(request) : model.embedContent(request)
    );
    return result.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const model = await this.getModel();
    const allEmbeddings: number[][] = [];

    // Process in chunks respecting Gemini's batch size limit
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const requests = batch.map((text) => ({
        content: { role: 'user' as const, parts: [{ text }] },
        ...(this.dimensions !== 3072 && { outputDimensionality: this.dimensions }),
      }));

      const result = await this.withRetry(() =>
        model.batchEmbedContents({ requests })
      );

      for (const embedding of result.embeddings) {
        allEmbeddings.push(embedding.values);
      }
    }

    return allEmbeddings;
  }

  /**
   * Lazy-load the Gemini SDK and return the embedding model.
   * Throws a clear error if @google/generative-ai is not installed.
   */
  private async getModel(): Promise<GeminiEmbeddingModel> {
    if (this.genAI) {
      return (this.genAI as GeminiGenAI).getGenerativeModel({
        model: this.model,
      }) as unknown as GeminiEmbeddingModel;
    }

    try {
      const sdk = await import('@google/generative-ai');
      const GoogleGenerativeAI =
        sdk.GoogleGenerativeAI ?? (sdk as unknown as { default: { GoogleGenerativeAI: GoogleGenerativeAIConstructor } }).default?.GoogleGenerativeAI;

      if (!GoogleGenerativeAI) {
        throw new Error('Could not find GoogleGenerativeAI export');
      }

      this.genAI = new GoogleGenerativeAI(this.apiKey);
      return (this.genAI as GeminiGenAI).getGenerativeModel({
        model: this.model,
      }) as unknown as GeminiEmbeddingModel;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes('Cannot find module') ||
          err.message.includes('MODULE_NOT_FOUND') ||
          err.message.includes('ERR_MODULE_NOT_FOUND'))
      ) {
        throw new Error(
          'GeminiEmbeddingProvider requires @google/generative-ai. ' +
            'Install it: pnpm add @google/generative-ai'
        );
      }
      throw err;
    }
  }

  /**
   * Retry with exponential backoff on rate limit (429) and server errors (5xx).
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;

        const status = (err as { status?: number }).status;
        const isRetryable =
          status === 429 || (status !== undefined && status >= 500);

        if (!isRetryable || attempt === this.maxRetries) {
          throw this.enhanceError(err);
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Add context to common API errors.
   */
  private enhanceError(err: unknown): Error {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : String(err);

    if (status === 401 || status === 403) {
      return new Error(
        `Gemini embedding auth failed (${status}): check your API key. ${message}`
      );
    }
    if (status === 429) {
      return new Error(
        `Gemini embedding rate limited (429): quota exceeded. ${message}`
      );
    }
    if (status !== undefined && status >= 500) {
      return new Error(
        `Gemini embedding server error (${status}): ${message}`
      );
    }

    return err instanceof Error ? err : new Error(message);
  }
}

// Minimal type definitions for the Gemini SDK to avoid importing types at compile time.
// The actual SDK is loaded dynamically at runtime.

interface GoogleGenerativeAIConstructor {
  new (apiKey: string): GeminiGenAI;
}

interface GeminiGenAI {
  getGenerativeModel(config: { model: string }): unknown;
}

interface GeminiEmbeddingModel {
  embedContent(textOrRequest: string | {
    content: { role: string; parts: Array<{ text: string }> };
    outputDimensionality?: number;
  }): Promise<{
    embedding: { values: number[] };
  }>;
  batchEmbedContents(params: {
    requests: Array<{
      content: { role: string; parts: Array<{ text: string }> };
      outputDimensionality?: number;
    }>;
  }): Promise<{
    embeddings: Array<{ values: number[] }>;
  }>;
}
