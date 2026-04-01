import type Database from 'better-sqlite3';
import type {
  StoredChunk,
  CreateChunkInput,
  StoreEmbeddingInput,
  ChunkWithEmbedding,
} from '../types/store.js';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS rag_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    section TEXT,
    title TEXT,
    full_path TEXT,
    token_count INTEGER,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rag_embeddings (
    chunk_id INTEGER PRIMARY KEY REFERENCES rag_chunks(id) ON DELETE CASCADE,
    vector BLOB NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rag_chunks_tenant ON rag_chunks(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks(tenant_id, source);
  CREATE INDEX IF NOT EXISTS idx_rag_chunks_section ON rag_chunks(tenant_id, section);
`;

const FTS_SCHEMA = `
  CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
    content,
    section,
    title,
    content='rag_chunks',
    content_rowid='id'
  );
`;

// FTS triggers keep the FTS index in sync with the main table.
const FTS_TRIGGERS = `
  CREATE TRIGGER IF NOT EXISTS rag_chunks_ai AFTER INSERT ON rag_chunks BEGIN
    INSERT INTO rag_chunks_fts(rowid, content, section, title)
    VALUES (new.id, new.content, new.section, new.title);
  END;

  CREATE TRIGGER IF NOT EXISTS rag_chunks_ad AFTER DELETE ON rag_chunks BEGIN
    INSERT INTO rag_chunks_fts(rag_chunks_fts, rowid, content, section, title)
    VALUES ('delete', old.id, old.content, old.section, old.title);
  END;

  CREATE TRIGGER IF NOT EXISTS rag_chunks_au AFTER UPDATE ON rag_chunks BEGIN
    INSERT INTO rag_chunks_fts(rag_chunks_fts, rowid, content, section, title)
    VALUES ('delete', old.id, old.content, old.section, old.title);
    INSERT INTO rag_chunks_fts(rowid, content, section, title)
    VALUES (new.id, new.content, new.section, new.title);
  END;
`;

/**
 * ChunkStore manages the SQLite storage of chunks and embeddings.
 * All operations are tenant-scoped.
 */
export class ChunkStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initialize();
  }

  private initialize(): void {
    // Skip DDL and WAL pragma if database is opened readonly
    if (this.db.readonly) {
      this.db.pragma('foreign_keys = ON');
      return;
    }
    this.db.exec(SCHEMA);
    this.db.exec(FTS_SCHEMA);
    this.db.exec(FTS_TRIGGERS);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Insert a chunk and return its ID.
   */
  createChunk(input: CreateChunkInput): number {
    const stmt = this.db.prepare(`
      INSERT INTO rag_chunks (tenant_id, content, source, section, title, full_path, token_count, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.tenantId,
      input.content,
      input.source,
      input.section ?? null,
      input.title ?? null,
      input.fullPath ?? null,
      input.tokenCount ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    return Number(result.lastInsertRowid);
  }

  /**
   * Insert multiple chunks in a transaction. Returns their IDs.
   */
  createChunks(inputs: CreateChunkInput[]): number[] {
    const ids: number[] = [];
    const transaction = this.db.transaction(() => {
      for (const input of inputs) {
        ids.push(this.createChunk(input));
      }
    });
    transaction();
    return ids;
  }

  /**
   * Store an embedding vector for a chunk.
   * Vector is stored as a Float32Array BLOB for compact storage.
   */
  storeEmbedding(input: StoreEmbeddingInput): void {
    const blob = Buffer.from(new Float32Array(input.vector).buffer);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO rag_embeddings (chunk_id, vector) VALUES (?, ?)
    `);
    stmt.run(input.chunkId, blob);
  }

  /**
   * Store multiple embeddings in a transaction.
   */
  storeEmbeddings(inputs: StoreEmbeddingInput[]): void {
    const transaction = this.db.transaction(() => {
      for (const input of inputs) {
        this.storeEmbedding(input);
      }
    });
    transaction();
  }

  /**
   * Get a chunk by ID.
   */
  getChunk(id: number): StoredChunk | null {
    const row = this.db.prepare('SELECT * FROM rag_chunks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToChunk(row) : null;
  }

  /**
   * Get all chunks for a tenant.
   */
  getChunksByTenant(tenantId: string, source?: string): StoredChunk[] {
    let sql = 'SELECT * FROM rag_chunks WHERE tenant_id = ?';
    const params: unknown[] = [tenantId];

    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }

    sql += ' ORDER BY id ASC';

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.rowToChunk(r));
  }

  /**
   * Get all chunks with their embeddings for a tenant (used by vector search).
   */
  getChunksWithEmbeddings(tenantId: string, source?: string): ChunkWithEmbedding[] {
    let sql = `
      SELECT c.*, e.vector
      FROM rag_chunks c
      INNER JOIN rag_embeddings e ON e.chunk_id = c.id
      WHERE c.tenant_id = ?
    `;
    const params: unknown[] = [tenantId];

    if (source) {
      sql += ' AND c.source = ?';
      params.push(source);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];

    return rows.map((row) => ({
      chunk: this.rowToChunk(row),
      vector: this.blobToVector(row.vector as Buffer),
    }));
  }

  /**
   * Full-text search over chunk content, section, and title.
   * Returns matching chunks ranked by relevance.
   */
  ftsSearch(tenantId: string, query: string, limit: number = 10): StoredChunk[] {
    const rows = this.db.prepare(`
      SELECT c.*
      FROM rag_chunks_fts fts
      INNER JOIN rag_chunks c ON c.id = fts.rowid
      WHERE rag_chunks_fts MATCH ?
        AND c.tenant_id = ?
      ORDER BY rank
      LIMIT ?
    `).all(query, tenantId, limit) as Record<string, unknown>[];

    return rows.map((r) => this.rowToChunk(r));
  }

  /**
   * Count chunks for a tenant.
   */
  countChunks(tenantId: string, source?: string): number {
    let sql = 'SELECT COUNT(*) as count FROM rag_chunks WHERE tenant_id = ?';
    const params: unknown[] = [tenantId];

    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }

    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }

  /**
   * Delete all chunks (and their embeddings via CASCADE) for a tenant.
   */
  deleteByTenant(tenantId: string): number {
    const result = this.db.prepare('DELETE FROM rag_chunks WHERE tenant_id = ?').run(tenantId);
    return result.changes;
  }

  /**
   * Delete all chunks for a tenant + source combination.
   */
  deleteBySource(tenantId: string, source: string): number {
    const result = this.db.prepare(
      'DELETE FROM rag_chunks WHERE tenant_id = ? AND source = ?'
    ).run(tenantId, source);
    return result.changes;
  }

  /**
   * Convert a BLOB to a Float32Array vector.
   */
  private blobToVector(blob: Buffer): number[] {
    const float32 = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
    return Array.from(float32);
  }

  /**
   * Convert a database row to a StoredChunk.
   */
  private rowToChunk(row: Record<string, unknown>): StoredChunk {
    return {
      id: row.id as number,
      tenantId: row.tenant_id as string,
      content: row.content as string,
      source: row.source as string,
      section: (row.section as string) ?? null,
      title: (row.title as string) ?? null,
      fullPath: (row.full_path as string) ?? null,
      tokenCount: (row.token_count as number) ?? null,
      metadata: row.metadata_json
        ? (JSON.parse(row.metadata_json as string) as Record<string, unknown>)
        : null,
      createdAt: row.created_at as string,
    };
  }
}
