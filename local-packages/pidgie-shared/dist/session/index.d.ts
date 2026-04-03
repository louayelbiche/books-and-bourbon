import { ChatCard, ChatAction } from '@runwell/card-system/types';

/**
 * Generic demo session store — wrapper around in-memory Map with TTL.
 *
 * Products define their own session shape via generics.
 * Provides singleton pattern with dev hot-reload persistence.
 */

interface BaseChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    cards?: ChatCard[];
    actions?: ChatAction[];
}
interface BaseSessionData {
    id: string;
    messages: BaseChatMessage[];
    createdAt: Date;
    lastAccessedAt: Date;
    screenshotMobile: string | null;
    screenshotDesktop: string | null;
}
interface DemoSessionStoreConfig {
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
declare class DemoSessionStore<T extends BaseSessionData = BaseSessionData> {
    private sessions;
    private cleanupInterval;
    private ttlMs;
    private maxSessions;
    private logPrefix;
    private onSessionExpire?;
    constructor(config?: DemoSessionStoreConfig);
    private startCleanup;
    private cleanup;
    /**
     * Store a session. The caller is responsible for constructing the session
     * with the correct type shape. Evicts the oldest session (by lastAccessedAt)
     * if at capacity.
     */
    set(session: T): void;
    get(id: string): T | null;
    addMessage(sessionId: string, roleOrMessage: 'user' | 'assistant' | {
        role: 'user' | 'assistant';
        content: string;
        cards?: ChatCard[];
        actions?: ChatAction[];
    }, content?: string, extras?: {
        cards?: ChatCard[];
        actions?: ChatAction[];
    }): void;
    getMessages(sessionId: string): BaseChatMessage[];
    updateScreenshots(sessionId: string, screenshots: {
        mobile?: string;
        desktop?: string;
    }): void;
    delete(id: string): boolean;
    getStats(): {
        totalSessions: number;
        oldestSession: Date | null;
    };
    destroy(): void;
}
/**
 * Create a singleton session store that persists across dev hot-reloads.
 *
 * Usage:
 * ```ts
 * const sessionStore = createSingletonStore<MySessionData>('__mySessionStore', { logPrefix: 'MyApp' });
 * ```
 */
declare function createSingletonStore<T extends BaseSessionData>(globalKey: string, config?: DemoSessionStoreConfig): DemoSessionStore<T>;

export { type BaseChatMessage, type BaseSessionData, DemoSessionStore, type DemoSessionStoreConfig, createSingletonStore };
