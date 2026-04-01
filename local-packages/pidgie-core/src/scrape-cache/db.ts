import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface StoredWebsite {
  id: number;
  url: string;
  domain: string;
  business_name: string | null;
  combined_content: string | null;
  pages: string; // JSON string of ScrapedPage[]
  products: string | null; // JSON string (consumer-defined product type)
  content_hash: string;
  homepage_hash: string | null;
  etag: string | null;
  last_modified: string | null;
  first_scraped_at: string;
  last_scraped_at: string;
  last_checked_at: string;
  pages_count: number | null;
  scrape_duration_ms: number | null;
  signals: string | null; // JSON string of BusinessSignals
}

export interface WebsiteInsert {
  url: string;
  domain: string;
  business_name: string;
  combined_content: string;
  pages: string; // JSON string
  products?: string | null; // JSON string (optional, Shopimate uses this)
  content_hash: string;
  homepage_hash?: string | null;
  etag?: string | null;
  last_modified?: string | null;
  pages_count: number;
  scrape_duration_ms: number;
  signals?: string | null; // JSON string of BusinessSignals
}

// Extend global type for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var __scrapeCacheDb: DatabaseType | undefined;
  // eslint-disable-next-line no-var
  var __scrapeCacheDbPath: string | undefined;
}

function getDatabase(): DatabaseType {
  if (global.__scrapeCacheDb) {
    return global.__scrapeCacheDb;
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "cache.db");
  global.__scrapeCacheDbPath = dbPath;

  const db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma("journal_mode = WAL");

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraped_websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      domain TEXT NOT NULL,
      business_name TEXT,
      combined_content TEXT,
      pages TEXT NOT NULL,
      products TEXT,
      content_hash TEXT NOT NULL,
      homepage_hash TEXT,
      etag TEXT,
      last_modified TEXT,
      first_scraped_at TEXT DEFAULT (datetime('now')),
      last_scraped_at TEXT DEFAULT (datetime('now')),
      last_checked_at TEXT DEFAULT (datetime('now')),
      pages_count INTEGER,
      scrape_duration_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_websites_url ON scraped_websites(url);
    CREATE INDEX IF NOT EXISTS idx_websites_domain ON scraped_websites(domain);
    CREATE INDEX IF NOT EXISTS idx_websites_last_checked ON scraped_websites(last_checked_at);
  `);

  // Migration: add signals column (backward-compatible)
  try {
    db.exec(`ALTER TABLE scraped_websites ADD COLUMN signals TEXT`);
  } catch {
    // Column already exists
  }

  // Store in global to reuse connection (prevents leak in production,
  // handles hot reloads in dev)
  global.__scrapeCacheDb = db;

  return db;
}

export const websiteDb = {
  getByUrl(url: string): StoredWebsite | undefined {
    const db = getDatabase();
    const stmt = db.prepare("SELECT * FROM scraped_websites WHERE url = ?");
    return stmt.get(url) as StoredWebsite | undefined;
  },

  upsert(data: WebsiteInsert): void {
    const db = getDatabase();
    const existing = this.getByUrl(data.url);
    const params = {
      ...data,
      products: data.products ?? null,
      homepage_hash: data.homepage_hash ?? null,
      etag: data.etag ?? null,
      last_modified: data.last_modified ?? null,
      signals: data.signals ?? null,
    };

    if (existing) {
      const stmt = db.prepare(`
        UPDATE scraped_websites SET
          business_name = @business_name,
          combined_content = @combined_content,
          pages = @pages,
          products = @products,
          signals = @signals,
          content_hash = @content_hash,
          homepage_hash = @homepage_hash,
          etag = @etag,
          last_modified = @last_modified,
          last_scraped_at = datetime('now'),
          last_checked_at = datetime('now'),
          pages_count = @pages_count,
          scrape_duration_ms = @scrape_duration_ms
        WHERE url = @url
      `);
      stmt.run(params);
    } else {
      const stmt = db.prepare(`
        INSERT INTO scraped_websites (
          url, domain, business_name, combined_content, pages, products,
          signals, content_hash, homepage_hash, etag, last_modified,
          pages_count, scrape_duration_ms
        ) VALUES (
          @url, @domain, @business_name, @combined_content, @pages, @products,
          @signals, @content_hash, @homepage_hash, @etag, @last_modified,
          @pages_count, @scrape_duration_ms
        )
      `);
      stmt.run(params);
    }
  },

  updateLastChecked(id: number): void {
    const db = getDatabase();
    const stmt = db.prepare(
      "UPDATE scraped_websites SET last_checked_at = datetime('now') WHERE id = ?"
    );
    stmt.run(id);
  },

  updateMetadata(
    id: number,
    data: { etag?: string | null; last_modified?: string | null }
  ): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE scraped_websites SET
        etag = @etag,
        last_modified = @last_modified,
        last_checked_at = datetime('now')
      WHERE id = @id
    `);
    stmt.run({
      id,
      etag: data.etag ?? null,
      last_modified: data.last_modified ?? null,
    });
  },

  count(): number {
    const db = getDatabase();
    const stmt = db.prepare("SELECT COUNT(*) as count FROM scraped_websites");
    return (stmt.get() as { count: number }).count;
  },

  getStats(): {
    totalCached: number;
    checkedLast24h: number;
    dbSizeBytes: number;
  } {
    const db = getDatabase();
    const total = this.count();
    const recent = db
      .prepare(
        "SELECT COUNT(*) as count FROM scraped_websites WHERE last_checked_at > datetime('now', '-24 hours')"
      )
      .get() as { count: number };
    const dbPath =
      global.__scrapeCacheDbPath || path.join(process.cwd(), "data", "cache.db");
    let dbSizeBytes = 0;
    try {
      dbSizeBytes = fs.statSync(dbPath).size;
    } catch {
      // DB file may not exist yet
    }

    return {
      totalCached: total,
      checkedLast24h: recent.count,
      dbSizeBytes,
    };
  },

  cleanupStale(olderThanDays: number = 30): number {
    const db = getDatabase();
    const result = db
      .prepare(
        `DELETE FROM scraped_websites WHERE last_checked_at < datetime('now', '-' || ? || ' days')`
      )
      .run(olderThanDays);
    return result.changes;
  },
};

export default websiteDb;
