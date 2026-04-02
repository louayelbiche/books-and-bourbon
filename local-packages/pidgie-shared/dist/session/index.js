// src/session/index.ts
var DemoSessionStore = class {
  sessions = /* @__PURE__ */ new Map();
  cleanupInterval = null;
  ttlMs;
  maxSessions;
  logPrefix;
  onSessionExpire;
  constructor(config = {}) {
    this.ttlMs = config.ttlMs ?? 2 * 60 * 60 * 1e3;
    this.maxSessions = config.maxSessions ?? 500;
    this.logPrefix = config.logPrefix ?? "DemoSessionStore";
    this.onSessionExpire = config.onSessionExpire;
    this.startCleanup(config.cleanupIntervalMs ?? 5 * 60 * 1e3);
  }
  startCleanup(intervalMs) {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
  cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt.getTime() > this.ttlMs) {
        this.sessions.delete(id);
        console.log(`[${this.logPrefix}] Cleaned up expired session: ${id}`);
        if (this.onSessionExpire) {
          try {
            const result = this.onSessionExpire(id, session);
            if (result instanceof Promise) {
              result.catch(
                (err) => console.error(`[${this.logPrefix}] onSessionExpire error for ${id}:`, err)
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
  set(session) {
    if (this.maxSessions > 0 && this.sessions.size >= this.maxSessions) {
      let oldestId = null;
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
  get(id) {
    const session = this.sessions.get(id);
    if (session) {
      session.lastAccessedAt = /* @__PURE__ */ new Date();
      return session;
    }
    return null;
  }
  addMessage(sessionId, roleOrMessage, content, extras) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (typeof roleOrMessage === "string") {
      session.messages.push({
        role: roleOrMessage,
        content,
        timestamp: /* @__PURE__ */ new Date(),
        ...extras
      });
    } else {
      session.messages.push({
        ...roleOrMessage,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    session.lastAccessedAt = /* @__PURE__ */ new Date();
  }
  getMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    return (session == null ? void 0 : session.messages) ?? [];
  }
  updateScreenshots(sessionId, screenshots) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (screenshots.mobile) session.screenshotMobile = screenshots.mobile;
      if (screenshots.desktop) session.screenshotDesktop = screenshots.desktop;
      session.lastAccessedAt = /* @__PURE__ */ new Date();
      console.log(`[${this.logPrefix}] Updated screenshots for session: ${sessionId}`);
    }
  }
  delete(id) {
    return this.sessions.delete(id);
  }
  getStats() {
    let oldest = null;
    for (const session of this.sessions.values()) {
      if (!oldest || session.createdAt < oldest) {
        oldest = session.createdAt;
      }
    }
    return { totalSessions: this.sessions.size, oldestSession: oldest };
  }
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
};
function createSingletonStore(globalKey, config) {
  const g = globalThis;
  if (!g[globalKey]) {
    const ttlMs = parseInt(process.env.SESSION_TTL_MS || "7200000", 10);
    g[globalKey] = new DemoSessionStore({ ttlMs, ...config });
  }
  return g[globalKey];
}
export {
  DemoSessionStore,
  createSingletonStore
};
//# sourceMappingURL=index.js.map