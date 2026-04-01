/**
 * Analytics Types
 */

/**
 * Logged conversation
 */
export interface ConversationLog {
  /** Unique conversation ID */
  id: string;
  /** Business ID */
  businessId: string;
  /** Session ID */
  sessionId: string;
  /** Visitor ID (anonymous) */
  visitorId: string;
  /** Start time */
  startedAt: Date;
  /** End time (if conversation ended) */
  endedAt?: Date;
  /** Message count */
  messageCount: number;
  /** Detected topics */
  topics: string[];
  /** User agent */
  userAgent?: string;
  /** Hashed IP (for rate limiting, not tracking) */
  ipHash?: string;
  /** Conversation metrics */
  metrics: ConversationMetrics;
  /** Individual messages */
  messages: MessageLog[];
}

/**
 * Logged message
 */
export interface MessageLog {
  /** Message ID */
  id: string;
  /** Role */
  role: 'user' | 'assistant';
  /** Message content (may be truncated for storage) */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Tools used (assistant only) */
  toolsUsed?: string[];
  /** Was blocked by security */
  blocked?: boolean;
  /** Block reason */
  blockReason?: string;
  /** Response time in ms (assistant only) */
  responseTimeMs?: number;
}

/**
 * Conversation metrics
 */
export interface ConversationMetrics {
  /** Total messages */
  totalMessages: number;
  /** User messages */
  userMessages: number;
  /** Assistant messages */
  assistantMessages: number;
  /** Blocked messages */
  blockedMessages: number;
  /** Average response time (ms) */
  avgResponseTimeMs: number;
  /** Conversation duration (ms) */
  durationMs: number;
  /** Tools used in conversation */
  toolsUsed: string[];
  /** Topics discussed */
  topics: string[];
  /** Sentiment (if detected) */
  sentiment?: 'positive' | 'neutral' | 'negative';
}
