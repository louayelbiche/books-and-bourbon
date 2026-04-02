// src/sync/chat-session-sync.ts
var ChatSessionSync = class {
  channel = null;
  sequence = 0;
  sessionId;
  storageKey;
  visibilityHandler = null;
  /** Called when state is updated from another tab */
  onStateUpdate = null;
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.storageKey = `chat-sync-${sessionId}`;
    if (typeof window === "undefined") return;
    try {
      this.channel = new BroadcastChannel(`chat-${sessionId}`);
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch {
    }
    this.visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        this.reconcile();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.loadSequence();
  }
  /**
   * Broadcast a new message to other tabs and persist state
   */
  broadcast(message, allMessages, suggestions) {
    var _a;
    this.sequence++;
    const state = {
      messages: allMessages,
      suggestions,
      sequence: this.sequence
    };
    this.persistState(state);
    (_a = this.channel) == null ? void 0 : _a.postMessage({
      type: "new_message",
      sessionId: this.sessionId,
      sequence: this.sequence,
      payload: message,
      timestamp: Date.now()
    });
  }
  /**
   * Broadcast full state to other tabs (for bulk updates like session restore)
   */
  broadcastFullState(messages, suggestions) {
    var _a;
    this.sequence++;
    const state = {
      messages,
      suggestions,
      sequence: this.sequence
    };
    this.persistState(state);
    (_a = this.channel) == null ? void 0 : _a.postMessage({
      type: "state_update",
      sessionId: this.sessionId,
      sequence: this.sequence,
      payload: state,
      timestamp: Date.now()
    });
  }
  /**
   * Clean up resources
   */
  destroy() {
    var _a;
    (_a = this.channel) == null ? void 0 : _a.close();
    this.channel = null;
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
  handleMessage(data) {
    var _a, _b;
    if (data.sessionId !== this.sessionId) return;
    if (data.sequence <= this.sequence) return;
    if (data.type === "state_update") {
      this.sequence = data.sequence;
      const state = data.payload;
      (_a = this.onStateUpdate) == null ? void 0 : _a.call(this, state);
    } else if (data.type === "new_message") {
      const stored = this.loadState();
      if (stored) {
        this.sequence = stored.sequence;
        (_b = this.onStateUpdate) == null ? void 0 : _b.call(this, stored);
      }
    }
  }
  reconcile() {
    var _a;
    const stored = this.loadState();
    if (stored && stored.sequence > this.sequence) {
      this.sequence = stored.sequence;
      (_a = this.onStateUpdate) == null ? void 0 : _a.call(this, stored);
    }
  }
  persistState(state) {
    try {
      const json = JSON.stringify(state);
      if (json.length > 2e6) return;
      sessionStorage.setItem(this.storageKey, json);
    } catch {
    }
  }
  loadState() {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  loadSequence() {
    const state = this.loadState();
    if (state) {
      this.sequence = state.sequence;
    }
  }
};

export {
  ChatSessionSync
};
//# sourceMappingURL=chunk-YAL3J32Q.js.map