/**
 * ConversationQueryEngine — read/query/aggregate logged conversations.
 *
 * Used by admin API routes. All reads are synchronous (better-sqlite3).
 */

import type { DatabaseLike, ConversationRecord, MessageRecord } from './types.js';

export interface ListOptions {
  limit?: number;        // default 50
  offset?: number;       // default 0
  sourceApp?: string;
  domain?: string;
  dateFrom?: string;     // ISO date
  dateTo?: string;       // ISO date
  locale?: string;
  minMessages?: number;
}

export interface StatsOptions {
  sourceApp?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ConversationWithMessages extends ConversationRecord {
  messages: MessageRecord[];
}

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConversation: number;
  avgResponseLatencyMs: number;
  topDomains: Array<{ domain: string; count: number }>;
  byLocale: Array<{ locale: string; count: number }>;
  byDay: Array<{ day: string; count: number }>;
  bySourceApp: Array<{ source_app: string; count: number }>;
}

export class ConversationQueryEngine {
  private db: DatabaseLike;

  constructor(db: DatabaseLike) {
    this.db = db;
  }

  /**
   * List conversations with pagination and filtering.
   */
  list(options: ListOptions = {}): { conversations: ConversationRecord[]; total: number } {
    const { limit = 50, offset = 0 } = options;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.sourceApp) {
      conditions.push('source_app = ?');
      params.push(options.sourceApp);
    }
    if (options.domain) {
      conditions.push('website_domain = ?');
      params.push(options.domain);
    }
    if (options.dateFrom) {
      conditions.push('started_at >= ?');
      params.push(options.dateFrom);
    }
    if (options.dateTo) {
      conditions.push('started_at <= ?');
      params.push(options.dateTo);
    }
    if (options.locale) {
      conditions.push('locale = ?');
      params.push(options.locale);
    }
    if (options.minMessages) {
      conditions.push('message_count >= ?');
      params.push(options.minMessages);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (this.db.prepare(
      `SELECT COUNT(*) as count FROM conversations ${where}`
    ).get(...params) as { count: number }).count;

    const conversations = this.db.prepare(
      `SELECT * FROM conversations ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as ConversationRecord[];

    return { conversations, total };
  }

  /**
   * Get a conversation by ID with all messages.
   */
  getById(id: string): ConversationWithMessages | null {
    const conv = this.db.prepare(
      'SELECT * FROM conversations WHERE id = ?'
    ).get(id) as ConversationRecord | undefined;

    if (!conv) return null;

    const messages = this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(id) as MessageRecord[];

    return { ...conv, messages };
  }

  /**
   * Get conversations by session ID.
   */
  getBySessionId(sessionId: string): ConversationWithMessages[] {
    const convs = this.db.prepare(
      'SELECT * FROM conversations WHERE session_id = ? ORDER BY started_at DESC'
    ).all(sessionId) as ConversationRecord[];

    return convs.map((conv) => {
      const messages = this.db.prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      ).all(conv.id) as MessageRecord[];
      return { ...conv, messages };
    });
  }

  /**
   * Aggregate stats.
   */
  getStats(options: StatsOptions = {}): ConversationStats {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.sourceApp) {
      conditions.push('source_app = ?');
      params.push(options.sourceApp);
    }
    if (options.dateFrom) {
      conditions.push('started_at >= ?');
      params.push(options.dateFrom);
    }
    if (options.dateTo) {
      conditions.push('started_at <= ?');
      params.push(options.dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totals = this.db.prepare(`
      SELECT COUNT(*) as totalConversations, COALESCE(SUM(message_count), 0) as totalMessages
      FROM conversations ${where}
    `).get(...params) as { totalConversations: number; totalMessages: number };

    const avgMessages = totals.totalConversations > 0
      ? totals.totalMessages / totals.totalConversations
      : 0;

    // Average latency across all assistant messages
    const latencyRow = this.db.prepare(`
      SELECT AVG(m.response_latency_ms) as avg
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.role = 'assistant' AND m.response_latency_ms IS NOT NULL
      ${conditions.length > 0 ? 'AND ' + conditions.map(c => 'c.' + c).join(' AND ') : ''}
    `).get(...params) as { avg: number | null };

    const topDomains = this.db.prepare(`
      SELECT website_domain as domain, COUNT(*) as count
      FROM conversations ${where}
      ${where ? 'AND' : 'WHERE'} website_domain IS NOT NULL
      GROUP BY website_domain ORDER BY count DESC LIMIT 10
    `).all(...params) as Array<{ domain: string; count: number }>;

    const byLocale = this.db.prepare(`
      SELECT COALESCE(locale, 'unknown') as locale, COUNT(*) as count
      FROM conversations ${where}
      GROUP BY locale ORDER BY count DESC
    `).all(...params) as Array<{ locale: string; count: number }>;

    const byDay = this.db.prepare(`
      SELECT DATE(started_at) as day, COUNT(*) as count
      FROM conversations ${where}
      GROUP BY DATE(started_at) ORDER BY day DESC LIMIT 30
    `).all(...params) as Array<{ day: string; count: number }>;

    const bySourceApp = this.db.prepare(`
      SELECT source_app, COUNT(*) as count
      FROM conversations ${where}
      GROUP BY source_app ORDER BY count DESC
    `).all(...params) as Array<{ source_app: string; count: number }>;

    return {
      totalConversations: totals.totalConversations,
      totalMessages: totals.totalMessages,
      avgMessagesPerConversation: Math.round(avgMessages * 100) / 100,
      avgResponseLatencyMs: Math.round(latencyRow.avg ?? 0),
      topDomains,
      byLocale,
      byDay,
      bySourceApp,
    };
  }

  /**
   * Search message content with LIKE.
   */
  searchMessages(query: string, limit = 50): Array<MessageRecord & { session_id: string; source_app: string }> {
    return this.db.prepare(`
      SELECT m.*, c.session_id, c.source_app
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(`%${query}%`, limit) as Array<MessageRecord & { session_id: string; source_app: string }>;
  }

  /**
   * Delete conversations older than N days. Messages cascade.
   */
  deleteOlderThan(days: number): number {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const result = this.db.prepare(
      'DELETE FROM conversations WHERE started_at < ?'
    ).run(cutoff);
    return result.changes;
  }

  /**
   * Export all conversations (for backup/analysis).
   */
  exportAll(): ConversationWithMessages[] {
    const convs = this.db.prepare(
      'SELECT * FROM conversations ORDER BY started_at DESC'
    ).all() as ConversationRecord[];

    return convs.map((conv) => {
      const messages = this.db.prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      ).all(conv.id) as MessageRecord[];
      return { ...conv, messages };
    });
  }
}
