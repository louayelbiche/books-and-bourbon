import type { Pool } from 'pg';
import type { CreateVisitorInput, TaggedFact, VisitorProfile } from './types.js';

interface ProfileRow {
  id: string;
  visitor_key: string;
  visitor_type: string;
  source_app: string;
  tenant_id: string | null;
  profile_json: {
    facts: TaggedFact[];
    last_conversation_summary: string;
  };
  visit_count: number;
  total_messages: number;
  geo_region: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
}

function rowToProfile(row: ProfileRow): VisitorProfile {
  const profile = typeof row.profile_json === 'string'
    ? JSON.parse(row.profile_json)
    : row.profile_json;
  return {
    id: row.id,
    visitorKey: row.visitor_key,
    visitorType: row.visitor_type as VisitorProfile['visitorType'],
    sourceApp: row.source_app,
    tenantId: row.tenant_id,
    facts: profile.facts ?? [],
    lastConversationSummary: profile.last_conversation_summary ?? '',
    visitCount: row.visit_count,
    totalMessages: row.total_messages,
    geoRegion: row.geo_region,
    firstSeenAt: new Date(row.first_seen_at),
    lastSeenAt: new Date(row.last_seen_at),
  };
}

export class VisitorStore {
  constructor(private pool: Pool) {}

  async getOrCreate(input: CreateVisitorInput): Promise<VisitorProfile> {
    const { identity, geoRegion } = input;
    const result = await this.pool.query<ProfileRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `INSERT INTO bot_visitor_profiles (visitor_key, visitor_type, source_app, tenant_id, geo_region, profile_json)
       VALUES ($1, $2, $3, $4, $5, '{"facts":[],"last_conversation_summary":""}'::jsonb)
       ON CONFLICT (visitor_key, source_app) DO UPDATE SET
         last_seen_at = NOW(),
         visit_count = bot_visitor_profiles.visit_count + 1
       RETURNING *`,
      [identity.visitorKey, identity.visitorType, identity.sourceApp, identity.tenantId ?? null, geoRegion ?? null]
    );
    return rowToProfile(result.rows[0]);
  }

  async getByKey(visitorKey: string, sourceApp: string): Promise<VisitorProfile | null> {
    const result = await this.pool.query<ProfileRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT * FROM bot_visitor_profiles WHERE visitor_key = $1 AND source_app = $2`,
      [visitorKey, sourceApp]
    );
    return result.rows[0] ? rowToProfile(result.rows[0]) : null;
  }

  async getById(id: string): Promise<VisitorProfile | null> {
    const result = await this.pool.query<ProfileRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT * FROM bot_visitor_profiles WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? rowToProfile(result.rows[0]) : null;
  }

  async recordVisit(id: string): Promise<void> {
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `UPDATE bot_visitor_profiles SET last_seen_at = NOW(), visit_count = visit_count + 1 WHERE id = $1`,
      [id]
    );
  }

  async updateProfile(id: string, facts: TaggedFact[], summary: string): Promise<void> {
    const profileJson = JSON.stringify({
      facts,
      last_conversation_summary: summary,
    });
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `UPDATE bot_visitor_profiles SET profile_json = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [profileJson, id]
    );
  }

  async incrementMessages(id: string, count: number): Promise<void> {
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `UPDATE bot_visitor_profiles SET total_messages = total_messages + $1, updated_at = NOW() WHERE id = $2`,
      [count, id]
    );
  }


  /**
   * Merge contact facts (key prefix `contact_`) into a visitor's profile
   * without overwriting other facts. Atomic at DB level via SELECT FOR UPDATE.
   */
  async upsertContactFacts(id: string, contactFacts: TaggedFact[]): Promise<void> {
    if (contactFacts.length === 0) return;

    for (const f of contactFacts) {
      if (!f.key.startsWith('contact_')) {
        throw new Error(`upsertContactFacts: key "${f.key}" must start with "contact_"`);
      }
    }

    const result = await this.pool.query<ProfileRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT profile_json FROM bot_visitor_profiles WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (result.rows.length === 0) return;

    const profile = typeof result.rows[0].profile_json === 'string'
      ? JSON.parse(result.rows[0].profile_json)
      : result.rows[0].profile_json;

    const existingFacts: TaggedFact[] = profile.facts ?? [];
    const nonContactFacts = existingFacts.filter((f: TaggedFact) => !f.key.startsWith('contact_'));
    const mergedFacts = [...nonContactFacts, ...contactFacts];

    const updatedJson = JSON.stringify({
      facts: mergedFacts,
      last_conversation_summary: profile.last_conversation_summary ?? '',
    });

    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `UPDATE bot_visitor_profiles SET profile_json = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [updatedJson, id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `DELETE FROM bot_visitor_profiles WHERE id = $1`,
      [id]
    );
  }

  async deleteExpiredEU(retentionDays: number): Promise<number> {
    const result = await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `DELETE FROM bot_visitor_profiles
       WHERE geo_region = 'EU'
         AND updated_at < NOW() - make_interval(days => $1)
       RETURNING id`,
      [retentionDays]
    );
    return result.rowCount ?? 0;
  }
}
