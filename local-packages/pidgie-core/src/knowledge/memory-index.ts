import BetterSqlite3 from 'better-sqlite3';
import { ChunkStore, cosineSimilarity } from '@runwell/rag-engine';

/**
 * Knowledge search index.
 * Uses SQLite FTS5 for ranked full-text search (BM25) with optional
 * vector search for hybrid retrieval (BM25 + cosine similarity + RRF merge).
 * Keeps DB open for fast repeated queries. Falls back to
 * in-memory keyword search if FTS5 table is not available.
 */

export interface IndexedChunk {
  id: number;
  content: string;
  source: string;
  section: string | null;
  title: string | null;
  fullPath: string | null;
}

export class MemoryIndex {
  private db: BetterSqlite3.Database | null = null;
  private loaded = false;
  private dbPath: string;
  private tenantId: string;
  private hasFts = false;
  private hasEmbeddings = false;
  private chunkCount = 0;
  /** In-memory cache: chunk id -> chunk data. Used when FTS returns IDs. */
  private chunkMap = new Map<number, IndexedChunk>();
  /** In-memory cache: chunk id -> embedding vector. For vector search. */
  private embeddingMap = new Map<number, number[]>();

  constructor(dbPath: string, tenantId: string) {
    this.dbPath = dbPath;
    this.tenantId = tenantId;
  }

  /** Load chunk metadata and embeddings into memory and prepare FTS. */
  load(): void {
    if (this.loaded) return;
    const t0 = Date.now();
    this.db = new BetterSqlite3(this.dbPath, { readonly: true });
    this.db.pragma('foreign_keys = ON');

    // Load all chunks with embeddings in one pass if possible
    const store = new ChunkStore(this.db);

    // Try loading chunks with embeddings for hybrid search
    try {
      const withEmb = store.getChunksWithEmbeddings(this.tenantId);
      for (const cwe of withEmb) {
        const c = cwe.chunk;
        this.chunkMap.set(c.id, {
          id: c.id,
          content: c.content,
          source: c.source,
          section: c.section,
          title: c.title,
          fullPath: c.fullPath,
        });
        this.embeddingMap.set(c.id, cwe.vector);
      }
      this.hasEmbeddings = this.embeddingMap.size > 0;
    } catch {
      // Embeddings table may not exist; fall back to chunks only
      const raw = store.getChunksByTenant(this.tenantId);
      for (const c of raw) {
        this.chunkMap.set(c.id, {
          id: c.id,
          content: c.content,
          source: c.source,
          section: c.section,
          title: c.title,
          fullPath: c.fullPath,
        });
      }
    }
    this.chunkCount = this.chunkMap.size;

    // Check if FTS5 table exists
    const ftsCheck = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='rag_chunks_fts'",
    ).get() as { name: string } | undefined;
    this.hasFts = !!ftsCheck;

    this.loaded = true;
    const dims = this.hasEmbeddings ? this.embeddingMap.values().next().value?.length ?? 0 : 0;
    console.log(
      `[pidgie] Knowledge index loaded: ${this.chunkCount} chunks, FTS5=${this.hasFts}, embeddings=${this.hasEmbeddings} (${dims}d) in ${Date.now() - t0}ms`,
    );
  }

  /** Search using FTS5 with BM25 ranking. Returns top-K matching chunks. */
  search(query: string, topK = 8): IndexedChunk[] {
    if (!this.loaded || !this.db) return [];

    if (this.hasFts) {
      return this.ftsSearch(query, topK);
    }
    return this.keywordSearch(query, topK);
  }

  /**
   * Hybrid search: combine FTS5 (BM25) and vector search results using
   * Reciprocal Rank Fusion (RRF). Returns top-K chunks ranked by combined score.
   * Falls back to FTS-only if no query embedding is provided.
   */
  hybridSearch(query: string, queryEmbedding: number[] | null, topK = 8): IndexedChunk[] {
    if (!this.loaded || !this.db) return [];

    const ftsResults = this.hasFts ? this.ftsSearch(query, topK * 2) : this.keywordSearch(query, topK * 2);

    if (!queryEmbedding || !this.hasEmbeddings) {
      return ftsResults.slice(0, topK);
    }

    const vectorResults = this.vectorSearch(queryEmbedding, topK * 2);
    return this.rrfMerge(ftsResults, vectorResults, topK);
  }

  /** Vector search: compute cosine similarity against cached embeddings. */
  private vectorSearch(queryEmbedding: number[], topK: number): IndexedChunk[] {
    const scored: Array<{ id: number; similarity: number }> = [];

    for (const [id, vector] of this.embeddingMap) {
      const sim = cosineSimilarity(queryEmbedding, vector);
      scored.push({ id, similarity: sim });
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    const results: IndexedChunk[] = [];
    for (const s of scored.slice(0, topK)) {
      const chunk = this.chunkMap.get(s.id);
      if (chunk) results.push(chunk);
    }
    return results;
  }

  /**
   * Reciprocal Rank Fusion: merge two ranked lists.
   * score(doc) = sum(1 / (rank + k)) for each list containing doc.
   * k=60 is the standard constant.
   */
  private rrfMerge(listA: IndexedChunk[], listB: IndexedChunk[], topK: number): IndexedChunk[] {
    const k = 60;
    const scoreMap = new Map<number, { chunk: IndexedChunk; score: number }>();

    for (let i = 0; i < listA.length; i++) {
      const rrfScore = 1 / (i + 1 + k);
      scoreMap.set(listA[i].id, { chunk: listA[i], score: rrfScore });
    }

    for (let i = 0; i < listB.length; i++) {
      const rrfScore = 1 / (i + 1 + k);
      const existing = scoreMap.get(listB[i].id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scoreMap.set(listB[i].id, { chunk: listB[i], score: rrfScore });
      }
    }

    return [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.chunk);
  }

  /** Whether embeddings are loaded for hybrid search. */
  get supportsHybrid(): boolean {
    return this.hasEmbeddings;
  }

  /** Common stop words to exclude from FTS queries. */
  private static readonly STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'them',
    'than', 'its', 'over', 'such', 'that', 'this', 'with', 'will', 'each',
    'make', 'from', 'which', 'what', 'when', 'where', 'who', 'how', 'any',
    'may', 'also', 'about', 'into', 'more', 'other', 'would', 'there',
    'their', 'could', 'should', 'does', 'shall', 'being', 'under', 'after',
    'before', 'between', 'through', 'during', 'those', 'these', 'then',
  ]);

  /** FTS5 search with BM25 ranking. Progressive term dropping for recall. */
  private ftsSearch(query: string, topK: number): IndexedChunk[] {
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !MemoryIndex.STOP_WORDS.has(w));
    if (words.length === 0) return [];

    try {
      // Strategy: try AND with all terms, then progressively drop terms
      // until we get enough results. This handles queries where one term
      // doesn't appear in the corpus.
      let rows: Array<{ rowid: number; rank: number }> = [];

      // Try full AND first
      if (words.length > 1) {
        rows = this.runFts(words.join(' '), topK * 3);
      }

      // If not enough, try dropping each word one at a time.
      // Collect ALL results and merge by best rank per chunk.
      if (rows.length < topK && words.length > 2) {
        const allResults = new Map<number, number>(); // rowid -> best rank
        // Add existing results
        for (const r of rows) allResults.set(r.rowid, r.rank);

        for (let i = 0; i < words.length; i++) {
          const subset = words.filter((_, j) => j !== i);
          try {
            const subsetRows = this.runFts(subset.join(' '), topK * 3);
            for (const r of subsetRows) {
              const existing = allResults.get(r.rowid);
              if (existing === undefined || r.rank < existing) {
                allResults.set(r.rowid, r.rank);
              }
            }
          } catch { /* skip invalid queries */ }
        }

        // Also try all pairs for maximum recall
        for (let i = 0; i < words.length - 1; i++) {
          for (let j = i + 1; j < words.length; j++) {
            try {
              const pairRows = this.runFts(`${words[i]} ${words[j]}`, topK * 3);
              for (const r of pairRows) {
                const existing = allResults.get(r.rowid);
                if (existing === undefined || r.rank < existing) {
                  allResults.set(r.rowid, r.rank);
                }
              }
            } catch { /* skip */ }
          }
        }

        // Convert back to sorted array
        rows = [...allResults.entries()]
          .map(([rowid, rank]) => ({ rowid, rank }))
          .sort((a, b) => a.rank - b.rank);
      }

      // Last resort: OR
      if (rows.length < topK) {
        const orQuery = words.map((w) => `"${w}"`).join(' OR ');
        const orRows = this.runFts(orQuery, topK * 3);
        if (orRows.length > rows.length) {
          rows = orRows;
        }
      }

      // Map FTS rowids to cached chunks (tenant-filtered)
      const results: IndexedChunk[] = [];
      for (const row of rows) {
        const chunk = this.chunkMap.get(row.rowid);
        if (chunk) {
          results.push(chunk);
          if (results.length >= topK) break;
        }
      }
      return results;
    } catch (err) {
      console.error('[pidgie] FTS5 search failed, falling back to keyword:', err);
      return this.keywordSearch(query, topK);
    }
  }

  private runFts(ftsQuery: string, limit: number): Array<{ rowid: number; rank: number }> {
    // BM25 with column weights: content=1, section=5, title=10
    // Title matches are highly discriminating for section lookups
    return this.db!.prepare(`
      SELECT rowid, bm25(rag_chunks_fts, 1.0, 5.0, 10.0) as rank
      FROM rag_chunks_fts
      WHERE rag_chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit) as Array<{ rowid: number; rank: number }>;
  }

  /** Simple keyword overlap search as fallback. */
  private keywordSearch(query: string, topK: number): IndexedChunk[] {
    const queryWords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 3);
    if (queryWords.length === 0) return [];

    const scored: Array<{ chunk: IndexedChunk; score: number }> = [];
    for (const [, chunk] of this.chunkMap) {
      const text = `${chunk.content} ${chunk.section || ''} ${chunk.title || ''}`.toLowerCase();
      let score = 0;
      for (const w of queryWords) {
        if (text.includes(w)) score++;
      }
      if (score > 0) scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.chunk);
  }

  /** Number of indexed chunks. */
  get size(): number {
    return this.chunkCount;
  }

  /** Whether index is loaded. */
  get ready(): boolean {
    return this.loaded;
  }
}
