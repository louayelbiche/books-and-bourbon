/**
 * In-memory session store for the concierge bot.
 *
 * Same pattern as concierge-demo and shopimate-landing, simplified
 * for deployed client bots (no scrape data, no screenshots).
 *
 * Reusable across all client deployments — nothing B&B-specific here.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ClientSessionData {
  id: string;
  messages: ChatMessage[];
  knowledge: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

class ClientSessionStore {
  private sessions: Map<string, ClientSessionData> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private ttlMs: number;

  constructor(ttlMs: number = 2 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    this.sessions.forEach((session, id) => {
      if (now - session.lastAccessedAt.getTime() > this.ttlMs) {
        this.sessions.delete(id);
      }
    });
  }

  create(knowledge: string): ClientSessionData {
    const id = crypto.randomUUID();
    const session: ClientSessionData = {
      id,
      messages: [],
      knowledge,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): ClientSessionData | null {
    const session = this.sessions.get(id);
    if (session) {
      session.lastAccessedAt = new Date();
      return session;
    }
    return null;
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push({ role, content, timestamp: new Date() });
      session.lastAccessedAt = new Date();
    }
  }

  getMessages(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId)?.messages ?? [];
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }
}

// Singleton — global to survive hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __bbSessionStore: ClientSessionStore | undefined;
}

export const sessionStore =
  global.__bbSessionStore ?? new ClientSessionStore();

if (process.env.NODE_ENV !== 'production') {
  global.__bbSessionStore = sessionStore;
}
