/**
 * Session Store
 *
 * Generic session management with TTL, cleanup, and pluggable adapters.
 */

import type {
  SessionData,
  SessionAdapter,
  SessionStoreConfig,
  SessionStats,
  CreateSessionOptions,
  ChatMessage,
} from './types.js';
import { MemorySessionAdapter } from './memory-adapter.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<SessionStoreConfig> = {
  ttlMs: 2 * 60 * 60 * 1000, // 2 hours
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxSessions: 0, // unlimited
  debug: false,
};

/**
 * Session store with TTL management and automatic cleanup
 */
export class SessionStore<TContext = Record<string, unknown>> {
  private adapter: SessionAdapter<TContext>;
  private config: Required<SessionStoreConfig>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private lastCleanupCount: number = 0;

  constructor(
    adapter?: SessionAdapter<TContext>,
    config?: SessionStoreConfig
  ) {
    this.adapter = adapter ?? new MemorySessionAdapter<TContext>();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((err) => {
        if (this.config.debug) {
          console.error('[SessionStore] Cleanup error:', err);
        }
      });
    }, this.config.cleanupIntervalMs);

    // Prevent interval from keeping Node process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const keys = await this.adapter.keys();
    let cleanedCount = 0;

    for (const id of keys) {
      const session = await this.adapter.get(id);
      if (session && now > session.expiresAt.getTime()) {
        await this.adapter.delete(id);
        cleanedCount++;
        if (this.config.debug) {
          console.log(`[SessionStore] Cleaned up expired session: ${id}`);
        }
      }
    }

    this.lastCleanupCount = cleanedCount;

    if (cleanedCount > 0 && this.config.debug) {
      console.log(`[SessionStore] Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  }

  /**
   * Generate a unique session ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Calculate expiration date based on TTL
   */
  private calculateExpiration(): Date {
    return new Date(Date.now() + this.config.ttlMs);
  }

  /**
   * Create a new session
   */
  async create(options: CreateSessionOptions<TContext>): Promise<SessionData<TContext>> {
    // Check max sessions limit
    if (this.config.maxSessions > 0) {
      const currentSize = await this.adapter.size();
      if (currentSize >= this.config.maxSessions) {
        // Run cleanup to free space
        await this.cleanup();
        const newSize = await this.adapter.size();
        if (newSize >= this.config.maxSessions) {
          throw new Error('Maximum session limit reached');
        }
      }
    }

    const now = new Date();
    const id = this.generateId();

    const session: SessionData<TContext> = {
      id,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: this.calculateExpiration(),
      messages: [],
      visitorId: options.visitorId,
      customerId: options.customerId,
      currentPage: options.currentPage,
      referrer: options.referrer,
      utmParams: options.utmParams,
      context: options.context,
      metadata: options.metadata,
    };

    await this.adapter.set(id, session);

    if (this.config.debug) {
      console.log(`[SessionStore] Created session: ${id}`);
    }

    return session;
  }

  /**
   * Get a session by ID, updating last accessed time
   */
  async get(id: string): Promise<SessionData<TContext> | null> {
    const session = await this.adapter.get(id);

    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() > session.expiresAt.getTime()) {
      await this.adapter.delete(id);
      return null;
    }

    // Update last accessed time and extend expiration
    session.lastAccessedAt = new Date();
    session.expiresAt = this.calculateExpiration();
    await this.adapter.set(id, session);

    return session;
  }

  /**
   * Get or create a session
   */
  async getOrCreate(
    id: string | undefined,
    options: CreateSessionOptions<TContext>
  ): Promise<SessionData<TContext>> {
    if (id) {
      const existing = await this.get(id);
      if (existing) {
        return existing;
      }
    }
    return this.create(options);
  }

  /**
   * Update session with a callback function
   */
  async update(
    id: string,
    updater: (session: SessionData<TContext>) => SessionData<TContext> | Promise<SessionData<TContext>>
  ): Promise<SessionData<TContext> | null> {
    const session = await this.get(id);
    if (!session) {
      return null;
    }

    const updated = await updater(session);
    updated.lastAccessedAt = new Date();
    updated.expiresAt = this.calculateExpiration();

    await this.adapter.set(id, updated);
    return updated;
  }

  /**
   * Add a message to a session
   */
  async addMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'timestamp'>
  ): Promise<void> {
    await this.update(sessionId, (session) => {
      session.messages.push({
        ...message,
        timestamp: new Date(),
      });
      return session;
    });
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.get(sessionId);
    return session?.messages ?? [];
  }

  /**
   * Update session context
   */
  async updateContext(
    sessionId: string,
    context: Partial<TContext>
  ): Promise<SessionData<TContext> | null> {
    return this.update(sessionId, (session) => {
      session.context = { ...session.context, ...context };
      return session;
    });
  }

  /**
   * Update session metadata
   */
  async updateMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): Promise<SessionData<TContext> | null> {
    return this.update(sessionId, (session) => {
      session.metadata = { ...session.metadata, ...metadata };
      return session;
    });
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.adapter.delete(id);
    if (result && this.config.debug) {
      console.log(`[SessionStore] Deleted session: ${id}`);
    }
    return result;
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<SessionStats> {
    const keys = await this.adapter.keys();
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const id of keys) {
      const session = await this.adapter.get(id);
      if (session) {
        if (!oldest || session.createdAt < oldest) {
          oldest = session.createdAt;
        }
        if (!newest || session.createdAt > newest) {
          newest = session.createdAt;
        }
      }
    }

    return {
      totalSessions: keys.length,
      oldestSession: oldest,
      newestSession: newest,
      lastCleanupCount: this.lastCleanupCount,
    };
  }

  /**
   * Destroy the session store and stop cleanup
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    await this.adapter.clear();
  }
}

/**
 * Create a session store with default memory adapter
 */
export function createSessionStore<TContext = Record<string, unknown>>(
  config?: SessionStoreConfig
): SessionStore<TContext> {
  return new SessionStore<TContext>(undefined, config);
}
