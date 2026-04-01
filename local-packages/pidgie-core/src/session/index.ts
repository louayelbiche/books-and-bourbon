/**
 * Session Management Module
 *
 * Provides generic session management with TTL, cleanup, and pluggable adapters.
 *
 * @example
 * ```typescript
 * import { SessionStore, createSessionStore } from '@runwell/pidgie-core/session';
 *
 * // Create a session store
 * const sessions = createSessionStore<MyContext>({
 *   ttlMs: 2 * 60 * 60 * 1000, // 2 hours
 * });
 *
 * // Create a session
 * const session = await sessions.create({
 *   context: { website: myScrapedData },
 *   visitorId: 'visitor-123',
 * });
 *
 * // Get a session
 * const existing = await sessions.get(sessionId);
 *
 * // Add a message
 * await sessions.addMessage(sessionId, {
 *   role: 'user',
 *   content: 'Hello!',
 * });
 * ```
 */

export { SessionStore, createSessionStore } from './store.js';
export { MemorySessionAdapter, createMemoryAdapter } from './memory-adapter.js';

export type {
  // Core types
  SessionData,
  ChatMessage,
  SessionAdapter,
  SessionStoreConfig,
  SessionStats,
  CreateSessionOptions,

  // Profile types
  CustomerProfile,
  UTMParams,
} from './types.js';
