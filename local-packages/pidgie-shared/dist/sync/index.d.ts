import { ChatCard, ChatAction } from '@runwell/card-system/types';

/**
 * Cross-Tab Chat Session Sync
 *
 * Uses BroadcastChannel for real-time cross-tab messaging
 * and sessionStorage as source of truth for state reconciliation.
 */

interface SyncMessage {
    role: 'user' | 'assistant';
    content: string;
    cards?: ChatCard[];
    actions?: ChatAction[];
}
interface SyncState {
    messages: SyncMessage[];
    suggestions: string[];
    sequence: number;
}
declare class ChatSessionSync {
    private channel;
    private sequence;
    private sessionId;
    private storageKey;
    private visibilityHandler;
    /** Called when state is updated from another tab */
    onStateUpdate: ((state: SyncState) => void) | null;
    constructor(sessionId: string);
    /**
     * Broadcast a new message to other tabs and persist state
     */
    broadcast(message: SyncMessage, allMessages: SyncMessage[], suggestions: string[]): void;
    /**
     * Broadcast full state to other tabs (for bulk updates like session restore)
     */
    broadcastFullState(messages: SyncMessage[], suggestions: string[]): void;
    /**
     * Clean up resources
     */
    destroy(): void;
    private handleMessage;
    private reconcile;
    private persistState;
    private loadState;
    private loadSequence;
}

export { ChatSessionSync, type SyncMessage, type SyncState };
