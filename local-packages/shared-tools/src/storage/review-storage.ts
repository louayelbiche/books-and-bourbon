import Database from 'better-sqlite3';

// ============================================================================
// Review Storage Types
// ============================================================================

export interface Review {
  reviewId: string;
  platform: 'google' | 'tripadvisor' | 'trustpilot';
  author: string;
  rating: number;
  text: string;
  publishedAt: string;
  hasOwnerResponse: boolean;
  ownerResponse?: string;
}

export interface AspectSentiment {
  name: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  mentionCount: number;
  topQuote: string;
}

export interface ReviewSentiment {
  reviewId: string;
  overall: 'positive' | 'negative' | 'mixed';
  score: number;
  aspects: AspectSentiment[];
  analyzer: 'gemini' | 'vader';
}

// ============================================================================
// ReviewStorage Interface
// ============================================================================

export interface ReviewStorage {
  storeReviews(businessId: string, reviews: Review[], source: string): void;
  getReviews(businessId: string, platform?: string): Review[];
  storeSentiment(sentiment: ReviewSentiment): void;
  getSentiment(reviewId: string): ReviewSentiment | null;
  getUnanalyzedReviews(businessId: string): Review[];
  logScan(businessId: string, source: string, rating: number, totalReviewCount: number): void;
  getLastScanTime(businessId: string): string | null;
  getRatingHistory(businessId: string, limit?: number): Array<{ rating: number; reviewCount: number; date: string }>;
  getCachedReviewCount(businessId: string): number;
  close(): void;
}

// ============================================================================
// SQLiteReviewStorage Implementation
// ============================================================================

export class SQLiteReviewStorage implements ReviewStorage {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        review_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        business_id TEXT NOT NULL,
        author TEXT,
        rating INTEGER,
        text TEXT,
        published_at TEXT,
        has_owner_response INTEGER DEFAULT 0,
        owner_response TEXT,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (review_id, platform)
      );

      CREATE TABLE IF NOT EXISTS sentiment (
        review_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        overall TEXT,
        score REAL,
        aspects_json TEXT,
        analyzer TEXT,
        analyzed_at TEXT NOT NULL,
        PRIMARY KEY (review_id, platform)
      );

      CREATE TABLE IF NOT EXISTS scan_log (
        business_id TEXT NOT NULL,
        source TEXT NOT NULL,
        rating REAL,
        total_review_count INTEGER,
        fetched_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
      CREATE INDEX IF NOT EXISTS idx_scan_log_business ON scan_log(business_id, fetched_at);
    `);
  }

  storeReviews(businessId: string, reviews: Review[], source: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO reviews
        (review_id, platform, business_id, author, rating, text, published_at, has_owner_response, owner_response, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const insertMany = this.db.transaction((revs: Review[]) => {
      for (const r of revs) {
        stmt.run(r.reviewId, r.platform, businessId, r.author, r.rating, r.text, r.publishedAt, r.hasOwnerResponse ? 1 : 0, r.ownerResponse ?? null, now);
      }
    });
    insertMany(reviews);
  }

  getReviews(businessId: string, platform?: string): Review[] {
    const query = platform
      ? 'SELECT * FROM reviews WHERE business_id = ? AND platform = ? ORDER BY published_at DESC'
      : 'SELECT * FROM reviews WHERE business_id = ? ORDER BY published_at DESC';
    const params = platform ? [businessId, platform] : [businessId];
    const rows = this.db.prepare(query).all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      reviewId: row.review_id as string,
      platform: row.platform as Review['platform'],
      author: row.author as string,
      rating: row.rating as number,
      text: row.text as string,
      publishedAt: row.published_at as string,
      hasOwnerResponse: (row.has_owner_response as number) === 1,
      ownerResponse: row.owner_response as string | undefined,
    }));
  }

  storeSentiment(sentiment: ReviewSentiment): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO sentiment
        (review_id, platform, overall, score, aspects_json, analyzer, analyzed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      sentiment.reviewId,
      'google',
      sentiment.overall,
      sentiment.score,
      JSON.stringify(sentiment.aspects),
      sentiment.analyzer,
      new Date().toISOString(),
    );
  }

  getSentiment(reviewId: string): ReviewSentiment | null {
    const row = this.db.prepare(
      'SELECT * FROM sentiment WHERE review_id = ?'
    ).get(reviewId) as Record<string, unknown> | undefined;

    if (!row) return null;
    return {
      reviewId: row.review_id as string,
      overall: row.overall as ReviewSentiment['overall'],
      score: row.score as number,
      aspects: JSON.parse(row.aspects_json as string),
      analyzer: row.analyzer as ReviewSentiment['analyzer'],
    };
  }

  getUnanalyzedReviews(businessId: string): Review[] {
    const rows = this.db.prepare(`
      SELECT r.* FROM reviews r
      LEFT JOIN sentiment s ON r.review_id = s.review_id AND r.platform = s.platform
      WHERE r.business_id = ? AND s.review_id IS NULL
      ORDER BY r.published_at DESC
    `).all(businessId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      reviewId: row.review_id as string,
      platform: row.platform as Review['platform'],
      author: row.author as string,
      rating: row.rating as number,
      text: row.text as string,
      publishedAt: row.published_at as string,
      hasOwnerResponse: (row.has_owner_response as number) === 1,
      ownerResponse: row.owner_response as string | undefined,
    }));
  }

  logScan(businessId: string, source: string, rating: number, totalReviewCount: number): void {
    this.db.prepare(`
      INSERT INTO scan_log (business_id, source, rating, total_review_count, fetched_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(businessId, source, rating, totalReviewCount, new Date().toISOString());
  }

  getLastScanTime(businessId: string): string | null {
    const row = this.db.prepare(
      'SELECT fetched_at FROM scan_log WHERE business_id = ? ORDER BY fetched_at DESC LIMIT 1'
    ).get(businessId) as { fetched_at: string } | undefined;
    return row?.fetched_at ?? null;
  }

  getRatingHistory(businessId: string, limit = 30): Array<{ rating: number; reviewCount: number; date: string }> {
    const rows = this.db.prepare(`
      SELECT rating, total_review_count, fetched_at
      FROM scan_log WHERE business_id = ?
      ORDER BY fetched_at DESC LIMIT ?
    `).all(businessId, limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      rating: row.rating as number,
      reviewCount: row.total_review_count as number,
      date: row.fetched_at as string,
    }));
  }

  getCachedReviewCount(businessId: string): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM reviews WHERE business_id = ?'
    ).get(businessId) as { count: number };
    return row.count;
  }

  close(): void {
    this.db.close();
  }
}
