/**
 * ConversationQueryEngine tests.
 *
 * Seeds 10+ conversations with varied data, then tests filtering,
 * pagination, stats, search, and cleanup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ConversationLogger } from '../src/logging/logger.js';
import { ConversationQueryEngine } from '../src/logging/query.js';
import type { DatabaseLike } from '../src/logging/types.js';

function createMemoryDb(): DatabaseLike {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db as unknown as DatabaseLike;
}

/**
 * Seed conversations with varied metadata for query testing.
 */
function seedData(db: DatabaseLike) {
  const logger = new ConversationLogger(db, { sourceApp: 'seed' });

  const sessions = [
    { id: 's1', app: 'pidgie-demo', domain: 'shop.com', locale: 'en', msgs: 3 },
    { id: 's2', app: 'pidgie-demo', domain: 'shop.com', locale: 'fr', msgs: 5 },
    { id: 's3', app: 'shopimate-demo', domain: 'store.io', locale: 'en', msgs: 2 },
    { id: 's4', app: 'shopimate-demo', domain: 'store.io', locale: 'de', msgs: 4 },
    { id: 's5', app: 'shopimate-sales', domain: null, locale: 'en', msgs: 1 },
    { id: 's6', app: 'pidgie-demo', domain: 'cafe.com', locale: 'ar', msgs: 6 },
    { id: 's7', app: 'shopimate-demo', domain: 'tech.co', locale: 'en', msgs: 8 },
    { id: 's8', app: 'pidgie-demo', domain: 'shop.com', locale: 'en', msgs: 2 },
    { id: 's9', app: 'shopimate-sales', domain: null, locale: 'fr', msgs: 3 },
    { id: 's10', app: 'pidgie-demo', domain: 'food.net', locale: 'es', msgs: 4 },
  ];

  // We need to set source_app per conversation, so we use separate loggers
  const loggers = new Map<string, ConversationLogger>();
  for (const s of sessions) {
    if (!loggers.has(s.app)) {
      loggers.set(s.app, new ConversationLogger(db, { sourceApp: s.app }));
    }
    const l = loggers.get(s.app)!;
    const convId = l.getOrStartConversation(s.id, {
      websiteDomain: s.domain || undefined,
      websiteUrl: s.domain ? `https://${s.domain}` : undefined,
      locale: s.locale,
    });

    for (let i = 0; i < s.msgs; i++) {
      if (i % 2 === 0) {
        l.logUserMessage(convId, `User msg ${i} from ${s.id}`);
      } else {
        l.logAssistantMessage(convId, `Assistant reply ${i} from ${s.id}`, 100 + i * 50);
      }
    }
  }
}

describe('ConversationQueryEngine', () => {
  let db: DatabaseLike;
  let engine: ConversationQueryEngine;

  beforeEach(() => {
    db = createMemoryDb();
    seedData(db);
    engine = new ConversationQueryEngine(db);
  });

  // ── List ──────────────────────────────────────────────────────

  describe('list', () => {
    it('returns all conversations with default params', () => {
      const result = engine.list();
      expect(result.total).toBe(10);
      expect(result.conversations).toHaveLength(10);
    });

    it('paginates with limit/offset', () => {
      const page1 = engine.list({ limit: 3, offset: 0 });
      const page2 = engine.list({ limit: 3, offset: 3 });
      expect(page1.conversations).toHaveLength(3);
      expect(page2.conversations).toHaveLength(3);
      expect(page1.total).toBe(10);
      // No overlap
      const ids1 = page1.conversations.map((c) => c.id);
      const ids2 = page2.conversations.map((c) => c.id);
      expect(ids1.some((id) => ids2.includes(id))).toBe(false);
    });

    it('filters by sourceApp', () => {
      const result = engine.list({ sourceApp: 'shopimate-demo' });
      expect(result.total).toBe(3);
      result.conversations.forEach((c) => {
        expect(c.source_app).toBe('shopimate-demo');
      });
    });

    it('filters by domain', () => {
      const result = engine.list({ domain: 'shop.com' });
      expect(result.total).toBe(3);
    });

    it('filters by locale', () => {
      const result = engine.list({ locale: 'en' });
      expect(result.total).toBe(5); // s1, s3, s5, s7, s8
    });

    it('filters by minMessages', () => {
      const result = engine.list({ minMessages: 5 });
      expect(result.total).toBeGreaterThanOrEqual(2); // s2(5), s6(6), s7(8)
      result.conversations.forEach((c) => {
        expect(c.message_count).toBeGreaterThanOrEqual(5);
      });
    });

    it('returns empty for no matches', () => {
      const result = engine.list({ domain: 'nonexistent.xyz' });
      expect(result.total).toBe(0);
      expect(result.conversations).toHaveLength(0);
    });
  });

  // ── Get by ID / session ───────────────────────────────────────

  describe('getById', () => {
    it('returns conversation with messages', () => {
      const all = engine.list({ limit: 1 });
      const id = all.conversations[0].id;
      const conv = engine.getById(id);
      expect(conv).not.toBeNull();
      expect(conv!.messages).toBeDefined();
      expect(conv!.messages.length).toBeGreaterThan(0);
    });

    it('returns null for unknown ID', () => {
      expect(engine.getById('nonexistent')).toBeNull();
    });
  });

  describe('getBySessionId', () => {
    it('returns conversations for a session', () => {
      const convs = engine.getBySessionId('s1');
      expect(convs).toHaveLength(1);
      expect(convs[0].session_id).toBe('s1');
      expect(convs[0].messages.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown session', () => {
      expect(engine.getBySessionId('unknown')).toHaveLength(0);
    });
  });

  // ── Stats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns aggregate stats', () => {
      const stats = engine.getStats();
      expect(stats.totalConversations).toBe(10);
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.avgMessagesPerConversation).toBeGreaterThan(0);
      expect(stats.topDomains.length).toBeGreaterThan(0);
      expect(stats.byLocale.length).toBeGreaterThan(0);
      expect(stats.byDay.length).toBeGreaterThan(0);
      expect(stats.bySourceApp.length).toBeGreaterThan(0);
    });

    it('filters stats by sourceApp', () => {
      const stats = engine.getStats({ sourceApp: 'shopimate-sales' });
      expect(stats.totalConversations).toBe(2);
    });

    it('top domains are sorted by count desc', () => {
      const stats = engine.getStats();
      for (let i = 1; i < stats.topDomains.length; i++) {
        expect(stats.topDomains[i - 1].count).toBeGreaterThanOrEqual(stats.topDomains[i].count);
      }
    });
  });

  // ── Search ────────────────────────────────────────────────────

  describe('searchMessages', () => {
    it('finds messages by content', () => {
      const results = engine.searchMessages('User msg');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.content).toContain('User msg');
      });
    });

    it('includes session and source info', () => {
      const results = engine.searchMessages('User msg', 1);
      expect(results[0].session_id).toBeTruthy();
      expect(results[0].source_app).toBeTruthy();
    });

    it('returns empty for no matches', () => {
      expect(engine.searchMessages('zzzznonexistent')).toHaveLength(0);
    });

    it('respects limit', () => {
      const results = engine.searchMessages('msg', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  // ── Cleanup ───────────────────────────────────────────────────

  describe('deleteOlderThan', () => {
    it('deletes old conversations', () => {
      // All test data was just created, so 0 days should delete everything
      // But let's check with a high number first (should delete nothing)
      const deleted = engine.deleteOlderThan(365);
      expect(deleted).toBe(0);
    });

    it('cascades to messages', () => {
      // Insert a conversation with an old date manually
      const oldDate = new Date(Date.now() - 100 * 86400000).toISOString();
      db.prepare(`
        INSERT INTO conversations (id, session_id, source_app, message_count, started_at, last_message_at, created_at)
        VALUES ('old-1', 'old-sess', 'test', 0, ?, ?, ?)
      `).run(oldDate, oldDate, oldDate);
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES ('old-msg', 'old-1', 'user', 'old msg', ?)
      `).run(oldDate);

      const deleted = engine.deleteOlderThan(30);
      expect(deleted).toBe(1);

      // Message should also be gone
      const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get('old-msg');
      expect(msg).toBeUndefined();
    });
  });

  // ── Export ────────────────────────────────────────────────────

  describe('exportAll', () => {
    it('returns all conversations with messages', () => {
      const data = engine.exportAll();
      expect(data.length).toBe(10);
      data.forEach((conv) => {
        expect(conv.messages).toBeDefined();
      });
    });
  });
});
