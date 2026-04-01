/**
 * In-memory session store with TTL-based cleanup.
 * Uses globalThis singleton pattern to survive HMR reloads.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionData {
  id: string;
  contactId: string | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  createdAt: Date;
  lastAccessedAt: Date;
}

interface SessionStoreOptions {
  ttlMs?: number;
  cleanupMs?: number;
}

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_CLEANUP_MS = 5 * 60 * 1000; // 5 minutes

const GLOBAL_KEY = '__pidgie_rag_session_store__';

export class SessionStore {
  private sessions: Map<string, SessionData>;
  private ttlMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: SessionStoreOptions) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    const cleanupMs = options?.cleanupMs ?? DEFAULT_CLEANUP_MS;

    // Singleton via globalThis for HMR survival
    const g = globalThis as Record<string, unknown>;
    if (g[GLOBAL_KEY] instanceof Map) {
      this.sessions = g[GLOBAL_KEY] as Map<string, SessionData>;
    } else {
      this.sessions = new Map();
      g[GLOBAL_KEY] = this.sessions;
    }

    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupMs);
    // Allow process to exit without waiting for timer
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /** Get or create a session by ID. */
  getOrCreate(sessionId: string): SessionData {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        contactId: null,
        messages: [],
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
    } else {
      session.lastAccessedAt = new Date();
    }
    return session;
  }

  /** Add a message to a session. */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.getOrCreate(sessionId);
    session.messages.push({ role, content, timestamp: new Date() });
    session.lastAccessedAt = new Date();
  }

  /** Get messages from a session. */
  getMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    session.lastAccessedAt = new Date();
    return session.messages.map((m) => ({ role: m.role, content: m.content }));
  }

  /** Set the contact ID for a session. */
  setContactId(sessionId: string, contactId: string): void {
    const session = this.getOrCreate(sessionId);
    session.contactId = contactId;
  }

  /** Get a session by ID (returns null if not found or expired). */
  get(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() - session.lastAccessedAt.getTime() > this.ttlMs) {
      this.sessions.delete(sessionId);
      return null;
    }
    session.lastAccessedAt = new Date();
    return session;
  }

  /** Remove expired sessions. */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt.getTime() > this.ttlMs) {
        this.sessions.delete(id);
      }
    }
  }

  /** Stop cleanup timer (for testing). */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Number of active sessions. */
  get count(): number {
    return this.sessions.size;
  }
}
