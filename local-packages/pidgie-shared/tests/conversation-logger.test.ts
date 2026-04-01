/**
 * ConversationLogger tests.
 *
 * Uses better-sqlite3 :memory: DB — no disk I/O.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ConversationLogger, createConversationLogger } from '../src/logging/logger.js';
import type { DatabaseLike, ConversationMetadata } from '../src/logging/types.js';

function createMemoryDb(): DatabaseLike {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db as unknown as DatabaseLike;
}

describe('ConversationLogger', () => {
  let db: DatabaseLike;
  let logger: ConversationLogger;

  beforeEach(() => {
    db = createMemoryDb();
    logger = new ConversationLogger(db, { sourceApp: 'test-app' });
  });

  // ── Schema ────────────────────────────────────────────────────

  describe('schema initialization', () => {
    it('creates conversations and messages tables', () => {
      const tables = (db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all() as Array<{ name: string }>).map((r) => r.name);
      expect(tables).toContain('conversations');
      expect(tables).toContain('messages');
    });

    it('is idempotent — second init does not throw', () => {
      expect(() => new ConversationLogger(db, { sourceApp: 'test-app' })).not.toThrow();
    });

    it('creates indexes', () => {
      const indexes = (db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      ).all() as Array<{ name: string }>).map((r) => r.name);
      expect(indexes).toContain('idx_conv_session_id');
      expect(indexes).toContain('idx_conv_source_app');
      expect(indexes).toContain('idx_conv_website_domain');
      expect(indexes).toContain('idx_conv_started_at');
      expect(indexes).toContain('idx_msg_conversation_id');
    });
  });

  // ── Conversation lifecycle ────────────────────────────────────

  describe('getOrStartConversation', () => {
    it('returns a non-empty conversation ID', () => {
      const id = logger.getOrStartConversation('sess-1');
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('returns same ID for same session', () => {
      const id1 = logger.getOrStartConversation('sess-1');
      const id2 = logger.getOrStartConversation('sess-1');
      expect(id1).toBe(id2);
    });

    it('returns different IDs for different sessions', () => {
      const id1 = logger.getOrStartConversation('sess-1');
      const id2 = logger.getOrStartConversation('sess-2');
      expect(id1).not.toBe(id2);
    });

    it('stores conversation in database', () => {
      const id = logger.getOrStartConversation('sess-1', {
        websiteUrl: 'https://example.com',
        websiteDomain: 'example.com',
        locale: 'fr',
      });

      const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Record<string, unknown>;
      expect(row.session_id).toBe('sess-1');
      expect(row.source_app).toBe('test-app');
      expect(row.website_url).toBe('https://example.com');
      expect(row.website_domain).toBe('example.com');
      expect(row.locale).toBe('fr');
      expect(row.message_count).toBe(0);
    });

    it('stores metadata fields (no PII)', () => {
      const meta: ConversationMetadata = {
        websiteUrl: 'https://shop.io',
        websiteDomain: 'shop.io',
        locale: 'de',
        custom: { referrer: 'google' },
      };

      const id = logger.getOrStartConversation('sess-meta', meta);
      const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Record<string, unknown>;
      expect(row.website_url).toBe('https://shop.io');
      expect(row.locale).toBe('de');
      expect(JSON.parse(row.metadata as string)).toEqual({ referrer: 'google' });
      // PII fields should not exist
      expect(row).not.toHaveProperty('user_agent');
      expect(row).not.toHaveProperty('ip_address');
      expect(row).not.toHaveProperty('accept_language');
    });
  });

  // ── Message logging ───────────────────────────────────────────

  describe('logUserMessage', () => {
    it('inserts a user message', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logUserMessage(convId, 'Hello');

      const msgs = db.prepare('SELECT * FROM messages WHERE conversation_id = ?').all(convId) as Array<Record<string, unknown>>;
      expect(msgs).toHaveLength(1);
      expect(msgs[0].role).toBe('user');
      expect(msgs[0].content).toBe('Hello');
    });

    it('increments message_count', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logUserMessage(convId, 'Hello');
      logger.logUserMessage(convId, 'World');

      const row = db.prepare('SELECT message_count FROM conversations WHERE id = ?').get(convId) as { message_count: number };
      expect(row.message_count).toBe(2);
    });

    it('updates last_message_at', () => {
      const convId = logger.getOrStartConversation('sess-1');
      const before = (db.prepare('SELECT last_message_at FROM conversations WHERE id = ?').get(convId) as { last_message_at: string }).last_message_at;

      logger.logUserMessage(convId, 'Hello');
      const after = (db.prepare('SELECT last_message_at FROM conversations WHERE id = ?').get(convId) as { last_message_at: string }).last_message_at;

      expect(after >= before).toBe(true);
    });

    it('estimates token count', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logUserMessage(convId, 'Hello World'); // 11 chars → ceil(11/4) = 3

      const msg = db.prepare('SELECT token_estimate FROM messages WHERE conversation_id = ?').get(convId) as { token_estimate: number };
      expect(msg.token_estimate).toBe(3);
    });
  });

  describe('logAssistantMessage', () => {
    it('inserts an assistant message with latency', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logAssistantMessage(convId, 'Hi there!', 250);

      const msgs = db.prepare('SELECT * FROM messages WHERE conversation_id = ?').all(convId) as Array<Record<string, unknown>>;
      expect(msgs).toHaveLength(1);
      expect(msgs[0].role).toBe('assistant');
      expect(msgs[0].content).toBe('Hi there!');
      expect(msgs[0].response_latency_ms).toBe(250);
    });

    it('stores tool calls as JSON', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logAssistantMessage(convId, 'Checking inventory...', 500, ['check_inventory', 'get_price']);

      const msg = db.prepare('SELECT tool_calls FROM messages WHERE conversation_id = ?').get(convId) as { tool_calls: string };
      expect(JSON.parse(msg.tool_calls)).toEqual(['check_inventory', 'get_price']);
    });

    it('handles no tool calls', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logAssistantMessage(convId, 'Just text', 100);

      const msg = db.prepare('SELECT tool_calls FROM messages WHERE conversation_id = ?').get(convId) as { tool_calls: string | null };
      expect(msg.tool_calls).toBeNull();
    });

    it('increments message_count', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.logUserMessage(convId, 'Hello');
      logger.logAssistantMessage(convId, 'Hi!', 100);

      const row = db.prepare('SELECT message_count FROM conversations WHERE id = ?').get(convId) as { message_count: number };
      expect(row.message_count).toBe(2);
    });
  });

  // ── Metadata updates ──────────────────────────────────────────

  describe('updateMetadata', () => {
    it('merges custom metadata', () => {
      const convId = logger.getOrStartConversation('sess-1', { custom: { a: 1 } });
      logger.updateMetadata(convId, { custom: { b: 2 } });

      const row = db.prepare('SELECT metadata FROM conversations WHERE id = ?').get(convId) as { metadata: string };
      expect(JSON.parse(row.metadata)).toEqual({ a: 1, b: 2 });
    });

    it('updates locale', () => {
      const convId = logger.getOrStartConversation('sess-1');
      logger.updateMetadata(convId, { locale: 'ar' });

      const row = db.prepare('SELECT locale FROM conversations WHERE id = ?').get(convId) as { locale: string };
      expect(row.locale).toBe('ar');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles very long messages (100K chars)', () => {
      const convId = logger.getOrStartConversation('sess-long');
      const longMsg = 'x'.repeat(100_000);
      logger.logUserMessage(convId, longMsg);

      const msg = db.prepare('SELECT content FROM messages WHERE conversation_id = ?').get(convId) as { content: string };
      expect(msg.content.length).toBe(100_000);
    });

    it('handles empty content', () => {
      const convId = logger.getOrStartConversation('sess-empty');
      logger.logUserMessage(convId, '');

      const msg = db.prepare('SELECT content FROM messages WHERE conversation_id = ?').get(convId) as { content: string };
      expect(msg.content).toBe('');
    });

    it('handles unicode/emoji/CJK/Arabic', () => {
      const convId = logger.getOrStartConversation('sess-unicode');
      const text = 'Hello 🌍 世界 مرحبا café';
      logger.logUserMessage(convId, text);

      const msg = db.prepare('SELECT content FROM messages WHERE conversation_id = ?').get(convId) as { content: string };
      expect(msg.content).toBe(text);
    });

    it('handles concurrent writes to different conversations', () => {
      const conv1 = logger.getOrStartConversation('sess-a');
      const conv2 = logger.getOrStartConversation('sess-b');

      logger.logUserMessage(conv1, 'msg-a');
      logger.logUserMessage(conv2, 'msg-b');
      logger.logAssistantMessage(conv1, 'reply-a', 100);
      logger.logAssistantMessage(conv2, 'reply-b', 200);

      const count1 = (db.prepare('SELECT message_count FROM conversations WHERE id = ?').get(conv1) as { message_count: number }).message_count;
      const count2 = (db.prepare('SELECT message_count FROM conversations WHERE id = ?').get(conv2) as { message_count: number }).message_count;
      expect(count1).toBe(2);
      expect(count2).toBe(2);
    });

    it('does nothing when disabled', () => {
      const disabledLogger = new ConversationLogger(db, { sourceApp: 'disabled', enabled: false });
      const id = disabledLogger.getOrStartConversation('sess-disabled');
      expect(id).toBe('');
    });

    it('does not throw on invalid conversation ID', () => {
      expect(() => logger.logUserMessage('nonexistent', 'test')).not.toThrow();
      expect(() => logger.logAssistantMessage('nonexistent', 'test', 100)).not.toThrow();
    });

    it('does not throw when logging to empty convId', () => {
      expect(() => logger.logUserMessage('', 'test')).not.toThrow();
      expect(() => logger.logAssistantMessage('', 'test', 100)).not.toThrow();
    });
  });

  // ── Factory function ──────────────────────────────────────────

  describe('createConversationLogger', () => {
    it('returns a ConversationLogger instance', () => {
      const l = createConversationLogger(db, { sourceApp: 'factory-test' });
      expect(l).toBeInstanceOf(ConversationLogger);
    });
  });

  // ── Session mapping ───────────────────────────────────────────

  describe('removeSession', () => {
    it('clears the session mapping so next call creates a new conversation', () => {
      const id1 = logger.getOrStartConversation('sess-rm');
      logger.removeSession('sess-rm');
      const id2 = logger.getOrStartConversation('sess-rm');
      expect(id1).not.toBe(id2);
    });
  });

  // ── Session map cleanup ─────────────────────────────────────

  describe('session map hourly cleanup', () => {
    it('clears session map after cleanup interval, creating new conversation for same session', () => {
      const id1 = logger.getOrStartConversation('sess-cleanup');
      expect(id1).toBeTruthy();

      // Force the lastCleanup to be old enough
      // Access private field via any cast for testing
      (logger as unknown as { lastCleanup: number }).lastCleanup = Date.now() - 3_700_000; // > 1 hour ago

      const id2 = logger.getOrStartConversation('sess-cleanup');
      // After cleanup, session map was cleared, so a new conversation is created
      expect(id2).not.toBe(id1);
    });
  });
});
