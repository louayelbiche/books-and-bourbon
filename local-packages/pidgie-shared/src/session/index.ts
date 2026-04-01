/**
 * Generic demo session store — wrapper around in-memory Map with TTL.
 *
 * Products define their own session shape via generics.
 * Provides singleton pattern with dev hot-reload persistence.
 */

import type { ChatCard, ChatAction } from '@runwell/card-system/types';

export interface BaseChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cards?: ChatCard[];
  actions?: ChatAction[];
}

export interface BaseSessionData {
  id: string;
  messages: BaseChatMessage[];
  createdAt: Date;
  lastAccessedAt: Date;
  screenshotMobile: string | null;
  screenshotDesktop: string | null;
}

export interface DemoSessionStoreConfig {
  /** TTL in milliseconds (default: 2 hours) */
  ttlMs?: number;
  /** Cleanup interval in milliseconds (default: 5 minutes) */
  cleanupIntervalMs?: number;
  /** Max sessions before LRU eviction (default: 500, 0 = unlimited) */
  maxSessions?: number;
  /** Log prefix for console output */
  logPrefix?: string;
  /** Callback fired when a session expires during cleanup. Fire-and-forget; errors are logged, not thrown. */
  onSessionExpire?: (sessionId: string, session: BaseSessionData) => void | Promise<void>;
}

export class DemoSessionStore<T extends BaseSessionData = BaseSessionData> {
  private sessions: Map<string, T> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private ttlMs: number;
  private maxSessions: number;
  private logPrefix: string;
  private onSessionExpire?: (sessionId: string, session: BaseSessionData) => void | Promise<void>;

  constructor(config: DemoSessionStoreConfig = {}) {
    this.ttlMs = config.ttlMs ?? 2 * 60 * 60 * 1000;
    this.maxSessions = config.maxSessions ?? 500;
    this.logPrefix = config.logPrefix ?? 'DemoSessionStore';
    this.onSessionExpire = config.onSessionExpire;
    this.startCleanup(config.cleanupIntervalMs ?? 5 * 60 * 1000);
  }

  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
    // Allow graceful shutdown without waiting for cleanup timer
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt.getTime() > this.ttlMs) {
        this.sessions.delete(id);
        console.log(`[${this.logPrefix}] Cleaned up expired session: ${id}`);
        if (this.onSessionExpire) {
          try {
            const result = this.onSessionExpire(id, session);
            if (result instanceof Promise) {
              result.catch((err) =>
                console.error(`[${this.logPrefix}] onSessionExpire error for ${id}:`, err)
              );
            }
          } catch (err) {
            console.error(`[${this.logPrefix}] onSessionExpire error for ${id}:`, err);
          }
        }
      }
    }
  }

  /**
   * Store a session. The caller is responsible for constructing the session
   * with the correct type shape. Evicts the oldest session (by lastAccessedAt)
   * if at capacity.
   */
  set(session: T): void {
    // LRU eviction at capacity
    if (this.maxSessions > 0 && this.sessions.size >= this.maxSessions) {
      let oldestId: string | null = null;
      let oldestTime = Infinity;
      for (const [sid, s] of this.sessions) {
        if (s.lastAccessedAt.getTime() < oldestTime) {
          oldestTime = s.lastAccessedAt.getTime();
          oldestId = sid;
        }
      }
      if (oldestId) {
        this.sessions.delete(oldestId);
        console.log(`[${this.logPrefix}] Evicted oldest session: ${oldestId} (at capacity ${this.maxSessions})`);
      }
    }
    this.sessions.set(session.id, session);
    console.log(`[${this.logPrefix}] Created session: ${session.id}`);
  }

  get(id: string): T | null {
    const session = this.sessions.get(id);
    if (session) {
      session.lastAccessedAt = new Date();
      return session;
    }
    return null;
  }

  addMessage(
    sessionId: string,
    roleOrMessage: 'user' | 'assistant' | { role: 'user' | 'assistant'; content: string; cards?: ChatCard[]; actions?: ChatAction[] },
    content?: string,
    extras?: { cards?: ChatCard[]; actions?: ChatAction[] }
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (typeof roleOrMessage === 'string') {
      // Called as addMessage(id, role, content, extras?)
      session.messages.push({
        role: roleOrMessage,
        content: content!,
        timestamp: new Date(),
        ...extras,
      });
    } else {
      // Called as addMessage(id, { role, content, cards?, actions? })
      session.messages.push({
        ...roleOrMessage,
        timestamp: new Date(),
      });
    }
    session.lastAccessedAt = new Date();
  }

  getMessages(sessionId: string): BaseChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages ?? [];
  }

  updateScreenshots(
    sessionId: string,
    screenshots: { mobile?: string; desktop?: string }
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (screenshots.mobile) session.screenshotMobile = screenshots.mobile;
      if (screenshots.desktop) session.screenshotDesktop = screenshots.desktop;
      session.lastAccessedAt = new Date();
      console.log(`[${this.logPrefix}] Updated screenshots for session: ${sessionId}`);
    }
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  getStats(): { totalSessions: number; oldestSession: Date | null } {
    let oldest: Date | null = null;
    for (const session of this.sessions.values()) {
      if (!oldest || session.createdAt < oldest) {
        oldest = session.createdAt;
      }
    }
    return { totalSessions: this.sessions.size, oldestSession: oldest };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

/**
 * Create a singleton session store that persists across dev hot-reloads.
 *
 * Usage:
 * ```ts
 * const sessionStore = createSingletonStore<MySessionData>('__mySessionStore', { logPrefix: 'MyApp' });
 * ```
 */
export function createSingletonStore<T extends BaseSessionData>(
  globalKey: string,
  config?: DemoSessionStoreConfig
): DemoSessionStore<T> {
  const g = globalThis as Record<string, unknown>;
  if (!g[globalKey]) {
    const ttlMs = parseInt(process.env.SESSION_TTL_MS || '7200000', 10);
    g[globalKey] = new DemoSessionStore<T>({ ttlMs, ...config });
  }
  return g[globalKey] as DemoSessionStore<T>;
}
