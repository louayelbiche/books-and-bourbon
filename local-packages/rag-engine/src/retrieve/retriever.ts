import type { EmbeddingProvider, LiveDataAdapter } from '../types/providers.js';
import type { RetrieveOptions, RetrievalResult } from '../types/engine.js';
import type { ChunkWithEmbedding } from '../types/store.js';
import { ChunkStore } from '../store/chunk-store.js';
import { cosineSimilarity } from './cosine.js';

export interface RetrieverConfig {
  store: ChunkStore;
  embeddingProvider: EmbeddingProvider;
  liveDataAdapters?: LiveDataAdapter[];
}

/**
 * Retriever combines vector search, full-text search, and live data
 * to find the most relevant content for a query.
 */
export class Retriever {
  private store: ChunkStore;
  private embeddingProvider: EmbeddingProvider;
  private liveDataAdapters: LiveDataAdapter[];

  constructor(config: RetrieverConfig) {
    this.store = config.store;
    this.embeddingProvider = config.embeddingProvider;
    this.liveDataAdapters = config.liveDataAdapters ?? [];
  }

  /**
   * Retrieve relevant content for a query.
   */
  async retrieve(query: string, options: RetrieveOptions): Promise<RetrievalResult[]> {
    const {
      tenantId,
      topK = 8,
      threshold = 0.75,
      sourceFilter,
      includeLiveData = true,
    } = options;

    // Handle empty query gracefully
    if (!query || !query.trim()) {
      return [];
    }

    // Run vector search and FTS in parallel
    const [vectorResults, ftsResults] = await Promise.all([
      this.vectorSearch(query, tenantId, topK * 2, sourceFilter),
      this.ftsSearch(query, tenantId, topK, sourceFilter),
    ]);

    // Merge and deduplicate
    let merged = this.mergeResults(vectorResults, ftsResults);

    // Apply threshold filter (only to results with similarity scores)
    merged = merged.filter((r) => {
      if (r.similarity === null) return true; // FTS-only results pass through
      return r.similarity >= threshold;
    });

    // Fetch live data if requested
    let liveResults: RetrievalResult[] = [];
    if (includeLiveData && this.liveDataAdapters.length > 0) {
      liveResults = await this.queryLiveData(query);
    }

    // Combine static and live results, sort by RRF score then similarity
    const combined = [...merged, ...liveResults];
    combined.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.similarity ?? 0) - (a.similarity ?? 0));

    return combined.slice(0, topK);
  }

  /**
   * Vector search: embed the query and compare against stored embeddings.
   */
  private async vectorSearch(
    query: string,
    tenantId: string,
    topK: number,
    sourceFilter?: string
  ): Promise<RetrievalResult[]> {
    const queryVector = await this.embeddingProvider.embed(query);
    const chunksWithEmb = this.store.getChunksWithEmbeddings(tenantId, sourceFilter);

    if (chunksWithEmb.length === 0) return [];

    // Compute similarities
    const scored = chunksWithEmb.map((cwe: ChunkWithEmbedding) => ({
      chunk: cwe.chunk,
      similarity: cosineSimilarity(queryVector, cwe.vector),
    }));

    // Sort by similarity descending
    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK).map((s) => ({
      chunkId: s.chunk.id,
      content: s.chunk.content,
      similarity: s.similarity,
      source: s.chunk.source,
      section: s.chunk.section,
      title: s.chunk.title,
      fullPath: s.chunk.fullPath,
      isLiveData: false,
    }));
  }

  /**
   * Full-text search for exact section references and keyword matches.
   */
  private ftsSearch(
    query: string,
    tenantId: string,
    topK: number,
    _sourceFilter?: string
  ): Promise<RetrievalResult[]> {
    // Sanitize FTS5 query: escape special characters
    const sanitized = this.sanitizeFtsQuery(query);
    if (!sanitized) return Promise.resolve([]);

    try {
      const chunks = this.store.ftsSearch(tenantId, sanitized, topK);
      return Promise.resolve(
        chunks.map((c) => ({
          chunkId: c.id,
          content: c.content,
          similarity: null, // FTS does not produce similarity scores
          source: c.source,
          section: c.section,
          title: c.title,
          fullPath: c.fullPath,
          isLiveData: false,
        }))
      );
    } catch {
      // FTS query syntax errors are non-fatal
      return Promise.resolve([]);
    }
  }

  /**
   * Query all registered live data adapters in parallel.
   */
  private async queryLiveData(query: string): Promise<RetrievalResult[]> {
    const promises = this.liveDataAdapters.map(async (adapter): Promise<RetrievalResult | null> => {
      try {
        const result = await adapter.query({ query });
        return {
          chunkId: null,
          content: result.summary,
          similarity: null,
          source: 'live',
          section: null,
          title: adapter.name,
          fullPath: null,
          isLiveData: true,
          liveData: result,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is RetrievalResult => r !== null);
  }

  /**
   * Merge vector and FTS results using Reciprocal Rank Fusion (RRF).
   * Each result gets score = 1/(rank + k) from each list it appears in.
   * Results appearing in both lists get summed scores.
   */
  private mergeResults(
    vectorResults: RetrievalResult[],
    ftsResults: RetrievalResult[]
  ): RetrievalResult[] {
    const k = 60;
    const scoreMap = new Map<number | string, { result: RetrievalResult; score: number }>();

    const getKey = (r: RetrievalResult): number | string =>
      r.chunkId !== null ? r.chunkId : `live:${r.content.slice(0, 50)}`;

    // Score vector results by rank
    for (let i = 0; i < vectorResults.length; i++) {
      const key = getKey(vectorResults[i]);
      const rrfScore = 1 / (i + 1 + k);
      scoreMap.set(key, { result: vectorResults[i], score: rrfScore });
    }

    // Score FTS results by rank, summing if already seen
    for (let i = 0; i < ftsResults.length; i++) {
      const key = getKey(ftsResults[i]);
      const rrfScore = 1 / (i + 1 + k);
      const existing = scoreMap.get(key);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scoreMap.set(key, { result: ftsResults[i], score: rrfScore });
      }
    }

    // Sort by RRF score descending
    const entries = Array.from(scoreMap.values());
    entries.sort((a, b) => b.score - a.score);

    return entries.map((e) => ({ ...e.result, score: e.score }));
  }

  /**
   * Sanitize a query string for FTS5.
   * Wraps terms in quotes to avoid syntax errors from special characters.
   */
  private sanitizeFtsQuery(query: string): string {
    // Extract meaningful words, skip FTS operators and short words
    const words = query
      .replace(/[^\w\s()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .filter((w) => !['AND', 'OR', 'NOT', 'NEAR'].includes(w.toUpperCase()));

    if (words.length === 0) return '';

    // Join with OR for broader matching
    return words.map((w) => `"${w}"`).join(' OR ');
  }
}
