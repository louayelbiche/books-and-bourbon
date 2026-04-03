// src/logging/logger.ts
import { createLogger } from "@runwell/logger";
var logger = createLogger("conversation-logger");
function generateId() {
  return crypto.randomUUID();
}
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
var ConversationLogger = class _ConversationLogger {
  db;
  sourceApp;
  enabled;
  sessionMap = /* @__PURE__ */ new Map();
  // sessionId → conversationId
  lastCleanup = Date.now();
  static CLEANUP_INTERVAL_MS = 36e5;
  // 1 hour
  constructor(db, config) {
    this.db = db;
    this.sourceApp = config.sourceApp;
    this.enabled = config.enabled !== false;
    if (this.enabled) {
      this.initSchema();
    }
  }
  initSchema() {
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
      logger.error("Schema init failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  /**
   * Get or create a conversation for the given session.
   * Returns the conversation ID.
   */
  getOrStartConversation(sessionId, metadata) {
    if (!this.enabled) return "";
    if (Date.now() - this.lastCleanup > _ConversationLogger.CLEANUP_INTERVAL_MS) {
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
      const now = (/* @__PURE__ */ new Date()).toISOString();
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
        metadata?.custom ? JSON.stringify(metadata.custom) : "{}",
        now,
        now,
        now
      );
      this.sessionMap.set(sessionId, id);
      return id;
    } catch (error) {
      logger.error("Failed to start conversation", { error: error instanceof Error ? error.message : String(error) });
      return "";
    }
  }
  /**
   * Log a user message.
   */
  logUserMessage(conversationId, content) {
    if (!this.enabled || !conversationId) return;
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, token_estimate, created_at)
        VALUES (?, ?, 'user', ?, ?, ?)
      `).run(generateId(), conversationId, content, estimateTokens(content), now);
      this.db.prepare(`
        UPDATE conversations SET message_count = message_count + 1, last_message_at = ? WHERE id = ?
      `).run(now, conversationId);
    } catch (error) {
      logger.error("Failed to log user message", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  /**
   * Log an assistant message with optional latency and tool calls.
   */
  logAssistantMessage(conversationId, content, latencyMs, toolCalls) {
    if (!this.enabled || !conversationId) return;
    try {
      const now = (/* @__PURE__ */ new Date()).toISOString();
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
      logger.error("Failed to log assistant message", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  /**
   * Merge partial metadata into an existing conversation.
   */
  updateMetadata(conversationId, partial) {
    if (!this.enabled || !conversationId) return;
    try {
      const row = this.db.prepare(
        "SELECT metadata, locale, website_url, website_domain FROM conversations WHERE id = ?"
      ).get(conversationId);
      if (!row) return;
      const existing = JSON.parse(row.metadata || "{}");
      const merged = { ...existing, ...partial.custom || {} };
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
      logger.error("Failed to update metadata", { error: error instanceof Error ? error.message : String(error) });
    }
  }
  /**
   * Remove a session mapping (call on session expiry).
   */
  removeSession(sessionId) {
    this.sessionMap.delete(sessionId);
  }
};
function createConversationLogger(db, config) {
  return new ConversationLogger(db, config);
}

// src/logging/query.ts
var ConversationQueryEngine = class {
  db;
  constructor(db) {
    this.db = db;
  }
  /**
   * List conversations with pagination and filtering.
   */
  list(options = {}) {
    const { limit = 50, offset = 0 } = options;
    const conditions = [];
    const params = [];
    if (options.sourceApp) {
      conditions.push("source_app = ?");
      params.push(options.sourceApp);
    }
    if (options.domain) {
      conditions.push("website_domain = ?");
      params.push(options.domain);
    }
    if (options.dateFrom) {
      conditions.push("started_at >= ?");
      params.push(options.dateFrom);
    }
    if (options.dateTo) {
      conditions.push("started_at <= ?");
      params.push(options.dateTo);
    }
    if (options.locale) {
      conditions.push("locale = ?");
      params.push(options.locale);
    }
    if (options.minMessages) {
      conditions.push("message_count >= ?");
      params.push(options.minMessages);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = this.db.prepare(
      `SELECT COUNT(*) as count FROM conversations ${where}`
    ).get(...params).count;
    const conversations = this.db.prepare(
      `SELECT * FROM conversations ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);
    return { conversations, total };
  }
  /**
   * Get a conversation by ID with all messages.
   */
  getById(id) {
    const conv = this.db.prepare(
      "SELECT * FROM conversations WHERE id = ?"
    ).get(id);
    if (!conv) return null;
    const messages = this.db.prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    ).all(id);
    return { ...conv, messages };
  }
  /**
   * Get conversations by session ID.
   */
  getBySessionId(sessionId) {
    const convs = this.db.prepare(
      "SELECT * FROM conversations WHERE session_id = ? ORDER BY started_at DESC"
    ).all(sessionId);
    return convs.map((conv) => {
      const messages = this.db.prepare(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
      ).all(conv.id);
      return { ...conv, messages };
    });
  }
  /**
   * Aggregate stats.
   */
  getStats(options = {}) {
    const conditions = [];
    const params = [];
    if (options.sourceApp) {
      conditions.push("source_app = ?");
      params.push(options.sourceApp);
    }
    if (options.dateFrom) {
      conditions.push("started_at >= ?");
      params.push(options.dateFrom);
    }
    if (options.dateTo) {
      conditions.push("started_at <= ?");
      params.push(options.dateTo);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totals = this.db.prepare(`
      SELECT COUNT(*) as totalConversations, COALESCE(SUM(message_count), 0) as totalMessages
      FROM conversations ${where}
    `).get(...params);
    const avgMessages = totals.totalConversations > 0 ? totals.totalMessages / totals.totalConversations : 0;
    const latencyRow = this.db.prepare(`
      SELECT AVG(m.response_latency_ms) as avg
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.role = 'assistant' AND m.response_latency_ms IS NOT NULL
      ${conditions.length > 0 ? "AND " + conditions.map((c) => "c." + c).join(" AND ") : ""}
    `).get(...params);
    const topDomains = this.db.prepare(`
      SELECT website_domain as domain, COUNT(*) as count
      FROM conversations ${where}
      ${where ? "AND" : "WHERE"} website_domain IS NOT NULL
      GROUP BY website_domain ORDER BY count DESC LIMIT 10
    `).all(...params);
    const byLocale = this.db.prepare(`
      SELECT COALESCE(locale, 'unknown') as locale, COUNT(*) as count
      FROM conversations ${where}
      GROUP BY locale ORDER BY count DESC
    `).all(...params);
    const byDay = this.db.prepare(`
      SELECT DATE(started_at) as day, COUNT(*) as count
      FROM conversations ${where}
      GROUP BY DATE(started_at) ORDER BY day DESC LIMIT 30
    `).all(...params);
    const bySourceApp = this.db.prepare(`
      SELECT source_app, COUNT(*) as count
      FROM conversations ${where}
      GROUP BY source_app ORDER BY count DESC
    `).all(...params);
    return {
      totalConversations: totals.totalConversations,
      totalMessages: totals.totalMessages,
      avgMessagesPerConversation: Math.round(avgMessages * 100) / 100,
      avgResponseLatencyMs: Math.round(latencyRow.avg ?? 0),
      topDomains,
      byLocale,
      byDay,
      bySourceApp
    };
  }
  /**
   * Search message content with LIKE.
   */
  searchMessages(query, limit = 50) {
    return this.db.prepare(`
      SELECT m.*, c.session_id, c.source_app
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(`%${query}%`, limit);
  }
  /**
   * Delete conversations older than N days. Messages cascade.
   */
  deleteOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 864e5).toISOString();
    const result = this.db.prepare(
      "DELETE FROM conversations WHERE started_at < ?"
    ).run(cutoff);
    return result.changes;
  }
  /**
   * Export all conversations (for backup/analysis).
   */
  exportAll() {
    const convs = this.db.prepare(
      "SELECT * FROM conversations ORDER BY started_at DESC"
    ).all();
    return convs.map((conv) => {
      const messages = this.db.prepare(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
      ).all(conv.id);
      return { ...conv, messages };
    });
  }
};
export {
  ConversationLogger,
  ConversationQueryEngine,
  createConversationLogger
};
//# sourceMappingURL=index.js.map