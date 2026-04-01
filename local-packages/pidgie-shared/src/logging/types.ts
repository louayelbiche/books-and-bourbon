/**
 * Conversation logging types.
 *
 * DatabaseLike is a minimal interface matching better-sqlite3's API surface
 * so the shared package has no runtime dependency on better-sqlite3.
 * Each app injects its own DB instance.
 */

export interface DatabaseLike {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
}

export interface ConversationRecord {
  id: string;
  session_id: string;
  source_app: string;
  website_url: string | null;
  website_domain: string | null;
  locale: string | null;
  metadata: string; // JSON string
  message_count: number;
  started_at: string;
  last_message_at: string;
  created_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  response_latency_ms: number | null;
  tool_calls: string | null; // JSON string
  token_estimate: number | null;
  created_at: string;
}

export interface ConversationMetadata {
  websiteUrl?: string;
  websiteDomain?: string;
  locale?: string;
  custom?: Record<string, unknown>;
}

export interface ConversationLoggerConfig {
  sourceApp: string;
  enabled?: boolean; // default true
}
