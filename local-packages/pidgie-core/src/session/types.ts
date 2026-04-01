/**
 * Session Management Types
 *
 * Generic session types for Pidgie applications.
 */

/**
 * Chat message in a session
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Tool calls made (assistant only) */
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
}

/**
 * Core session data - extensible via generics
 */
export interface SessionData<TContext = Record<string, unknown>> {
  /** Unique session identifier */
  id: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastAccessedAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Chat message history */
  messages: ChatMessage[];
  /** Visitor identifier (anonymous) */
  visitorId?: string;
  /** Customer identifier (logged in) */
  customerId?: string;
  /** Current page/context */
  currentPage?: string;
  /** Referrer URL */
  referrer?: string;
  /** UTM parameters */
  utmParams?: UTMParams;
  /** Customer profile (built via progressive profiling) */
  profile?: CustomerProfile;
  /** Application-specific context data */
  context: TContext;
  /** Extensible metadata */
  metadata?: Record<string, unknown>;
}

/**
 * UTM tracking parameters
 */
export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/**
 * Customer profile built through progressive profiling
 */
export interface CustomerProfile {
  /** Shopping for self or gift */
  shoppingFor?: 'self' | 'gift' | 'both';
  /** Known sizes by category */
  sizes?: Record<string, string>;
  /** Budget preference */
  budget?: 'budget' | 'mid-range' | 'premium';
  /** Style preferences */
  style?: string[];
  /** Other learned preferences */
  preferences?: Record<string, unknown>;
}

/**
 * Session store configuration
 */
export interface SessionStoreConfig {
  /** Time-to-live in milliseconds (default: 2 hours) */
  ttlMs?: number;
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupIntervalMs?: number;
  /** Maximum sessions to store (default: unlimited) */
  maxSessions?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Session adapter interface for different storage backends
 */
export interface SessionAdapter<TContext = Record<string, unknown>> {
  /** Get a session by ID */
  get(id: string): Promise<SessionData<TContext> | null>;
  /** Set/update a session */
  set(id: string, session: SessionData<TContext>): Promise<void>;
  /** Delete a session */
  delete(id: string): Promise<boolean>;
  /** Get all session IDs */
  keys(): Promise<string[]>;
  /** Clear all sessions */
  clear(): Promise<void>;
  /** Get session count */
  size(): Promise<number>;
}

/**
 * Session store statistics
 */
export interface SessionStats {
  /** Total active sessions */
  totalSessions: number;
  /** Oldest session creation date */
  oldestSession: Date | null;
  /** Newest session creation date */
  newestSession: Date | null;
  /** Sessions cleaned up in last cleanup cycle */
  lastCleanupCount?: number;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions<TContext = Record<string, unknown>> {
  /** Initial context data */
  context: TContext;
  /** Visitor ID */
  visitorId?: string;
  /** Customer ID (if logged in) */
  customerId?: string;
  /** Initial page */
  currentPage?: string;
  /** Referrer */
  referrer?: string;
  /** UTM params */
  utmParams?: UTMParams;
  /** Initial metadata */
  metadata?: Record<string, unknown>;
}
