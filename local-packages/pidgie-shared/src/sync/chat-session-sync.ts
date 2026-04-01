/**
 * Cross-Tab Chat Session Sync
 *
 * Uses BroadcastChannel for real-time cross-tab messaging
 * and sessionStorage as source of truth for state reconciliation.
 */

import type { ChatCard, ChatAction } from '@runwell/card-system/types';

export interface SyncMessage {
  role: 'user' | 'assistant';
  content: string;
  cards?: ChatCard[];
  actions?: ChatAction[];
}

export interface SyncState {
  messages: SyncMessage[];
  suggestions: string[];
  sequence: number;
}

interface BroadcastPayload {
  type: 'new_message' | 'state_update';
  sessionId: string;
  sequence: number;
  payload: SyncMessage | SyncState;
  timestamp: number;
}

export class ChatSessionSync {
  private channel: BroadcastChannel | null = null;
  private sequence: number = 0;
  private sessionId: string;
  private storageKey: string;
  private visibilityHandler: (() => void) | null = null;

  /** Called when state is updated from another tab */
  onStateUpdate: ((state: SyncState) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.storageKey = `chat-sync-${sessionId}`;

    if (typeof window === 'undefined') return;

    try {
      this.channel = new BroadcastChannel(`chat-${sessionId}`);
      this.channel.onmessage = (event: MessageEvent<BroadcastPayload>) => {
        this.handleMessage(event.data);
      };
    } catch {
      // BroadcastChannel not supported — sync disabled
    }

    // Reconcile on tab focus
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.reconcile();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // Load existing sequence from storage
    this.loadSequence();
  }

  /**
   * Broadcast a new message to other tabs and persist state
   */
  broadcast(message: SyncMessage, allMessages: SyncMessage[], suggestions: string[]): void {
    this.sequence++;
    const state: SyncState = {
      messages: allMessages,
      suggestions,
      sequence: this.sequence,
    };

    this.persistState(state);

    this.channel?.postMessage({
      type: 'new_message',
      sessionId: this.sessionId,
      sequence: this.sequence,
      payload: message,
      timestamp: Date.now(),
    } satisfies BroadcastPayload);
  }

  /**
   * Broadcast full state to other tabs (for bulk updates like session restore)
   */
  broadcastFullState(messages: SyncMessage[], suggestions: string[]): void {
    this.sequence++;
    const state: SyncState = {
      messages,
      suggestions,
      sequence: this.sequence,
    };

    this.persistState(state);

    this.channel?.postMessage({
      type: 'state_update',
      sessionId: this.sessionId,
      sequence: this.sequence,
      payload: state,
      timestamp: Date.now(),
    } satisfies BroadcastPayload);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.channel?.close();
    this.channel = null;

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private handleMessage(data: BroadcastPayload): void {
    if (data.sessionId !== this.sessionId) return;
    if (data.sequence <= this.sequence) return;

    if (data.type === 'state_update') {
      this.sequence = data.sequence;
      const state = data.payload as SyncState;
      this.onStateUpdate?.(state);
    } else if (data.type === 'new_message') {
      // For new_message, load full state from sessionStorage
      const stored = this.loadState();
      if (stored) {
        this.sequence = stored.sequence;
        this.onStateUpdate?.(stored);
      }
    }
  }

  private reconcile(): void {
    const stored = this.loadState();
    if (stored && stored.sequence > this.sequence) {
      this.sequence = stored.sequence;
      this.onStateUpdate?.(stored);
    }
  }

  private persistState(state: SyncState): void {
    try {
      const json = JSON.stringify(state);
      // Guard against excessively large state (2MB limit)
      if (json.length > 2_000_000) return;
      sessionStorage.setItem(this.storageKey, json);
    } catch {
      // sessionStorage full or unavailable
    }
  }

  private loadState(): SyncState | null {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as SyncState;
    } catch {
      return null;
    }
  }

  private loadSequence(): void {
    const state = this.loadState();
    if (state) {
      this.sequence = state.sequence;
    }
  }
}
