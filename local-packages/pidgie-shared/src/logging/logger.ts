/**
 * ConversationLogger — persists chat conversations to SQLite.
 *
 * All writes are synchronous (better-sqlite3 is sub-ms) and wrapped
 * in try/catch so logging failures never break chat.
 */

import { createLogger } from '@runwell/logger';
import type { DatabaseLike, ConversationLoggerConfig, ConversationMetadata } from './types.js';

const logger = createLogger('conversation-logger');

function generateId(): string {
  return crypto.randomUUID();
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token
  return Math.ceil(text.length / 4);
}

export class ConversationLogger {
  private db: DatabaseLike;
  private sourceApp: string;
  private enabled: boolean;
  private sessionMap = new Map<string, string>(); // sessionId → conversationId
  private lastCleanup = Date.now();
  private static CLEANUP_INTERVAL_MS = 3_600_000; // 1 hour

  constructor(db: DatabaseLike, config: ConversationLoggerConfig) {
    this.db = db;
    this.sourceApp = config.sourceApp;
    this.enabled = config.enabled !== false;
    if (this.enabled) {
      this.initSchema();
    }
  }

  private initSchema(): void {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          source_app TEXT NOT NULL,
          website_url TEXT,
          website_domain TEXT,
          locale TEXT,
          metadata TEXT DEFAULT '{}',
          message_count INTEGER DEFAULT 0,
          started_at TEXT NOT NULL,
          last_message_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_conv_session_id ON conversations(session_id);
        CREATE INDEX IF NOT EXISTS idx_conv_source_app ON conversations(source_app);
        CREATE INDEX IF NOT EXISTS idx_conv_website_domain ON conversations(website_domain);
        CREATE INDEX IF NOT EXISTS idx_conv_started_at ON conversations(started_at);

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          response_latency_ms INTEGER,
          tool_calls TEXT,
          token_estimate INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_msg_conversation_id ON messages(conversation_id);
      `);
    } catch (error) {
      logger.error('Schema init failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Get or create a conversation for the given session.
   * Returns the conversation ID.
   */
  getOrStartConversation(sessionId: string, metadata?: ConversationMetadata): string {
    if (!this.enabled) return '';

    // Periodic cleanup to prevent unbounded session map growth
    if (Date.now() - this.lastCleanup > ConversationLogger.CLEANUP_INTERVAL_MS) {
      this.sessionMap.clear();
      this.lastCleanup = Date.now();
    }

    const existing = this.sessionMap.get(sessionId);
    if (existing) {
      if (metadata) {
        this.updateMetadata(existing, metadata);
      }
      return existing;
    }

    try {
      const id = generateId();
      const now = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO conversations (id, session_id, source_app, website_url, website_domain,
          locale, metadata, message_count, started_at, last_message_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        id,
        sessionId,
        this.sourceApp,
        metadata?.websiteUrl ?? null,
        metadata?.websiteDomain ?? null,
        metadata?.locale ?? null,
        metadata?.custom ? JSON.stringify(metadata.custom) : '{}',
        now,
        now,
        now
      );

      this.sessionMap.set(sessionId, id);
      return id;
    } catch (error) {
      logger.error('Failed to start conversation', { error: error instanceof Error ? error.message : String(error) });
      return '';
    }
  }

  /**
   * Log a user message.
   */
  logUserMessage(conversationId: string, content: string): void {
    if (!this.enabled || !conversationId) return;

    try {
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, token_estimate, created_at)
        VALUES (?, ?, 'user', ?, ?, ?)
      `).run(generateId(), conversationId, content, estimateTokens(content), now);

      this.db.prepare(`
        UPDATE conversations SET message_count = message_count + 1, last_message_at = ? WHERE id = ?
      `).run(now, conversationId);
    } catch (error) {
      logger.error('Failed to log user message', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Log an assistant message with optional latency and tool calls.
   */
  logAssistantMessage(
    conversationId: string,
    content: string,
    latencyMs?: number,
    toolCalls?: string[]
  ): void {
    if (!this.enabled || !conversationId) return;

    try {
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, response_latency_ms,
          tool_calls, token_estimate, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)
      `).run(
        generateId(),
        conversationId,
        content,
        latencyMs ?? null,
        toolCalls ? JSON.stringify(toolCalls) : null,
        estimateTokens(content),
        now
      );

      this.db.prepare(`
        UPDATE conversations SET message_count = message_count + 1, last_message_at = ? WHERE id = ?
      `).run(now, conversationId);
    } catch (error) {
      logger.error('Failed to log assistant message', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Merge partial metadata into an existing conversation.
   */
  updateMetadata(conversationId: string, partial: ConversationMetadata): void {
    if (!this.enabled || !conversationId) return;

    try {
      const row = this.db.prepare(
        'SELECT metadata, locale, website_url, website_domain FROM conversations WHERE id = ?'
      ).get(conversationId) as { metadata: string; locale: string | null; website_url: string | null; website_domain: string | null } | undefined;

      if (!row) return;

      const existing = JSON.parse(row.metadata || '{}');
      const merged = { ...existing, ...(partial.custom || {}) };

      this.db.prepare(`
        UPDATE conversations SET
          metadata = ?,
          locale = COALESCE(?, locale),
          website_url = COALESCE(?, website_url),
          website_domain = COALESCE(?, website_domain)
        WHERE id = ?
      `).run(
        JSON.stringify(merged),
        partial.locale ?? null,
        partial.websiteUrl ?? null,
        partial.websiteDomain ?? null,
        conversationId
      );
    } catch (error) {
      logger.error('Failed to update metadata', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Remove a session mapping (call on session expiry).
   */
  removeSession(sessionId: string): void {
    this.sessionMap.delete(sessionId);
  }
}

/**
 * Factory function — creates a ConversationLogger.
 */
export function createConversationLogger(
  db: DatabaseLike,
  config: ConversationLoggerConfig
): ConversationLogger {
  return new ConversationLogger(db, config);
}
