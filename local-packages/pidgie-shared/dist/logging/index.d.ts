/**
 * Conversation logging types.
 *
 * DatabaseLike is a minimal interface matching better-sqlite3's API surface
 * so the shared package has no runtime dependency on better-sqlite3.
 * Each app injects its own DB instance.
 */
interface DatabaseLike {
    exec(sql: string): void;
    prepare(sql: string): {
        run(...params: unknown[]): {
            changes: number;
        };
        get(...params: unknown[]): unknown;
        all(...params: unknown[]): unknown[];
    };
}
interface ConversationRecord {
    id: string;
    session_id: string;
    source_app: string;
    website_url: string | null;
    website_domain: string | null;
    locale: string | null;
    metadata: string;
    message_count: number;
    started_at: string;
    last_message_at: string;
    created_at: string;
}
interface MessageRecord {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    response_latency_ms: number | null;
    tool_calls: string | null;
    token_estimate: number | null;
    created_at: string;
}
interface ConversationMetadata {
    websiteUrl?: string;
    websiteDomain?: string;
    locale?: string;
    custom?: Record<string, unknown>;
}
interface ConversationLoggerConfig {
    sourceApp: string;
    enabled?: boolean;
}

/**
 * ConversationLogger — persists chat conversations to SQLite.
 *
 * All writes are synchronous (better-sqlite3 is sub-ms) and wrapped
 * in try/catch so logging failures never break chat.
 */

declare class ConversationLogger {
    private db;
    private sourceApp;
    private enabled;
    private sessionMap;
    private lastCleanup;
    private static CLEANUP_INTERVAL_MS;
    constructor(db: DatabaseLike, config: ConversationLoggerConfig);
    private initSchema;
    /**
     * Get or create a conversation for the given session.
     * Returns the conversation ID.
     */
    getOrStartConversation(sessionId: string, metadata?: ConversationMetadata): string;
    /**
     * Log a user message.
     */
    logUserMessage(conversationId: string, content: string): void;
    /**
     * Log an assistant message with optional latency and tool calls.
     */
    logAssistantMessage(conversationId: string, content: string, latencyMs?: number, toolCalls?: string[]): void;
    /**
     * Merge partial metadata into an existing conversation.
     */
    updateMetadata(conversationId: string, partial: ConversationMetadata): void;
    /**
     * Remove a session mapping (call on session expiry).
     */
    removeSession(sessionId: string): void;
}
/**
 * Factory function — creates a ConversationLogger.
 */
declare function createConversationLogger(db: DatabaseLike, config: ConversationLoggerConfig): ConversationLogger;

/**
 * ConversationQueryEngine — read/query/aggregate logged conversations.
 *
 * Used by admin API routes. All reads are synchronous (better-sqlite3).
 */

interface ListOptions {
    limit?: number;
    offset?: number;
    sourceApp?: string;
    domain?: string;
    dateFrom?: string;
    dateTo?: string;
    locale?: string;
    minMessages?: number;
}
interface StatsOptions {
    sourceApp?: string;
    dateFrom?: string;
    dateTo?: string;
}
interface ConversationWithMessages extends ConversationRecord {
    messages: MessageRecord[];
}
interface ConversationStats {
    totalConversations: number;
    totalMessages: number;
    avgMessagesPerConversation: number;
    avgResponseLatencyMs: number;
    topDomains: Array<{
        domain: string;
        count: number;
    }>;
    byLocale: Array<{
        locale: string;
        count: number;
    }>;
    byDay: Array<{
        day: string;
        count: number;
    }>;
    bySourceApp: Array<{
        source_app: string;
        count: number;
    }>;
}
declare class ConversationQueryEngine {
    private db;
    constructor(db: DatabaseLike);
    /**
     * List conversations with pagination and filtering.
     */
    list(options?: ListOptions): {
        conversations: ConversationRecord[];
        total: number;
    };
    /**
     * Get a conversation by ID with all messages.
     */
    getById(id: string): ConversationWithMessages | null;
    /**
     * Get conversations by session ID.
     */
    getBySessionId(sessionId: string): ConversationWithMessages[];
    /**
     * Aggregate stats.
     */
    getStats(options?: StatsOptions): ConversationStats;
    /**
     * Search message content with LIKE.
     */
    searchMessages(query: string, limit?: number): Array<MessageRecord & {
        session_id: string;
        source_app: string;
    }>;
    /**
     * Delete conversations older than N days. Messages cascade.
     */
    deleteOlderThan(days: number): number;
    /**
     * Export all conversations (for backup/analysis).
     */
    exportAll(): ConversationWithMessages[];
}

export { ConversationLogger, type ConversationLoggerConfig, type ConversationMetadata, ConversationQueryEngine, type ConversationRecord, type ConversationStats, type ConversationWithMessages, type DatabaseLike, type ListOptions, type MessageRecord, type StatsOptions, createConversationLogger };
