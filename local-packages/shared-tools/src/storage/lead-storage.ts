import Database from 'better-sqlite3';

// ============================================================================
// Lead Storage Types
// ============================================================================

export interface Lead {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  mapsUrl: string;
  types: string[];
  stage: LeadStage;
  discoveredAt: string;
}

export type LeadStage =
  | 'discovered'
  | 'enriched'
  | 'contacts_extracted'
  | 'qualified'
  | 'outreach_drafted'
  | 'outreach_sent';

export interface LeadEnrichmentData {
  website?: string;
  phone?: string;
  hours?: string;
  priceLevel?: number;
  score?: number;
  scoreBreakdown?: object;
  stage?: string;
}

export interface ExtractedContact {
  type: 'email' | 'phone' | 'form';
  value: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  isPersonal: boolean;
  personName?: string;
  personRole?: string;
}

export interface EnrichedLead extends Lead {
  website?: string;
  phone?: string;
  hours?: string;
  priceLevel?: number;
  contacts: ExtractedContact[];
  score: number;
  scoreBreakdown: Record<string, number>;
  weaknesses: string[];
  opportunities: string[];
  fromCache?: boolean;
}

export interface OutreachLogEntry {
  placeId: string;
  to: string;
  subject?: string;
  template?: string;
  demo: boolean;
  messageId: string;
  sentAt: string;
}

export interface OutreachResult {
  placeId: string;
  to: string;
  demo: boolean;
  messageId: string;
  sentAt: string;
}

// ============================================================================
// LeadStorage Interface
// ============================================================================

export interface LeadStorage {
  storeLead(lead: Lead): void;
  updateEnrichment(placeId: string, data: LeadEnrichmentData): void;
  storeContacts(placeId: string, contacts: ExtractedContact[]): void;
  logOutreach(result: OutreachLogEntry): void;
  getLead(placeId: string): EnrichedLead | null;
  getContacts(placeId: string): ExtractedContact[];
  wasContacted(placeId: string): boolean;
  getOutreachHistory(placeId: string): OutreachResult[];
  close(): void;
}

// ============================================================================
// SQLiteLeadStorage Implementation
// ============================================================================

export class SQLiteLeadStorage implements LeadStorage {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        place_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        rating REAL,
        review_count INTEGER,
        maps_url TEXT,
        types_json TEXT,
        stage TEXT DEFAULT 'discovered',
        website TEXT,
        phone TEXT,
        hours TEXT,
        price_level INTEGER,
        score INTEGER DEFAULT 0,
        score_breakdown_json TEXT,
        discovered_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        source TEXT NOT NULL,
        confidence TEXT NOT NULL,
        is_personal INTEGER DEFAULT 0,
        person_name TEXT,
        person_role TEXT,
        FOREIGN KEY (place_id) REFERENCES leads(place_id),
        UNIQUE(place_id, type, value)
      );

      CREATE TABLE IF NOT EXISTS outreach_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject TEXT,
        template TEXT,
        demo INTEGER DEFAULT 1,
        message_id TEXT,
        sent_at TEXT NOT NULL,
        FOREIGN KEY (place_id) REFERENCES leads(place_id)
      );

      CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
      CREATE INDEX IF NOT EXISTS idx_contacts_place ON contacts(place_id);
      CREATE INDEX IF NOT EXISTS idx_outreach_place ON outreach_log(place_id);
    `);
  }

  storeLead(lead: Lead): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO leads
        (place_id, name, address, rating, review_count, maps_url, types_json, stage, discovered_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lead.placeId, lead.name, lead.address, lead.rating,
      lead.reviewCount, lead.mapsUrl, JSON.stringify(lead.types),
      lead.stage, lead.discoveredAt, now,
    );
  }

  updateEnrichment(placeId: string, data: LeadEnrichmentData): void {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.website !== undefined) { updates.push('website = ?'); values.push(data.website); }
    if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
    if (data.hours !== undefined) { updates.push('hours = ?'); values.push(data.hours); }
    if (data.priceLevel !== undefined) { updates.push('price_level = ?'); values.push(data.priceLevel); }
    if (data.score !== undefined) { updates.push('score = ?'); values.push(data.score); }
    if (data.scoreBreakdown) { updates.push('score_breakdown_json = ?'); values.push(JSON.stringify(data.scoreBreakdown)); }
    if (data.stage) { updates.push('stage = ?'); values.push(data.stage); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(placeId);

    if (updates.length > 1) {
      this.db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE place_id = ?`).run(...values);
    }
  }

  storeContacts(placeId: string, contacts: ExtractedContact[]): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO contacts
        (place_id, type, value, source, confidence, is_personal, person_name, person_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((cs: ExtractedContact[]) => {
      for (const c of cs) {
        stmt.run(
          placeId, c.type, c.value, c.source, c.confidence,
          c.isPersonal ? 1 : 0, c.personName ?? null, c.personRole ?? null,
        );
      }
    });
    insertMany(contacts);
  }

  logOutreach(result: OutreachLogEntry): void {
    this.db.prepare(`
      INSERT INTO outreach_log (place_id, recipient, subject, template, demo, message_id, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      result.placeId, result.to, result.subject ?? null,
      result.template ?? null, result.demo ? 1 : 0,
      result.messageId, result.sentAt,
    );
  }

  getLead(placeId: string): EnrichedLead | null {
    const row = this.db.prepare('SELECT * FROM leads WHERE place_id = ?').get(placeId) as Record<string, unknown> | undefined;
    if (!row) return null;

    const contacts = this.getContacts(placeId);

    return {
      placeId: row.place_id as string,
      name: row.name as string,
      address: row.address as string,
      rating: row.rating as number,
      reviewCount: row.review_count as number,
      mapsUrl: row.maps_url as string,
      types: JSON.parse((row.types_json as string) || '[]'),
      stage: row.stage as LeadStage,
      website: row.website as string | undefined,
      phone: row.phone as string | undefined,
      hours: row.hours as string | undefined,
      priceLevel: row.price_level as number | undefined,
      contacts,
      score: (row.score as number) || 0,
      scoreBreakdown: row.score_breakdown_json
        ? JSON.parse(row.score_breakdown_json as string)
        : { hasWebsite: 0, hasContacts: 0, ratingScore: 0, reviewScore: 0, signalMatch: 0, digitalPresence: 0, aiAssessment: 0, total: 0 },
      weaknesses: [],
      opportunities: [],
      discoveredAt: row.discovered_at as string,
      fromCache: true,
    };
  }

  getContacts(placeId: string): ExtractedContact[] {
    const rows = this.db.prepare('SELECT * FROM contacts WHERE place_id = ?').all(placeId) as Record<string, unknown>[];
    return rows.map((r) => ({
      type: r.type as ExtractedContact['type'],
      value: r.value as string,
      source: r.source as string,
      confidence: r.confidence as ExtractedContact['confidence'],
      isPersonal: (r.is_personal as number) === 1,
      personName: r.person_name as string | undefined,
      personRole: r.person_role as string | undefined,
    }));
  }

  wasContacted(placeId: string): boolean {
    const row = this.db.prepare(
      'SELECT COUNT(*) as cnt FROM outreach_log WHERE place_id = ? AND demo = 0',
    ).get(placeId) as { cnt: number };
    return row.cnt > 0;
  }

  getOutreachHistory(placeId: string): OutreachResult[] {
    const rows = this.db.prepare(
      'SELECT * FROM outreach_log WHERE place_id = ? ORDER BY sent_at DESC',
    ).all(placeId) as Record<string, unknown>[];
    return rows.map((r) => ({
      placeId: r.place_id as string,
      to: r.recipient as string,
      demo: (r.demo as number) === 1,
      messageId: r.message_id as string,
      sentAt: r.sent_at as string,
    }));
  }

  close(): void {
    this.db.close();
  }
}
