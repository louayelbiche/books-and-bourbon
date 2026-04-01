/**
 * Adapter that bridges ConversationStore to the ConversationPersistence
 * interface expected by pidgie-shared's createChatHandler.
 *
 * This avoids a hard dependency between pidgie-shared and bot-memory.
 */

import type { ConversationStore } from './store.js';
import type { ToolCallRecord } from './types.js';

/**
 * ConversationPersistence interface (mirrors pidgie-shared's definition).
 * Defined here so bot-memory consumers can use it without importing pidgie-shared.
 */
export interface ConversationPersistence {
  getOrCreateConversation(
    visitorId: string,
    sessionId: string,
    sourceApp: string,
    metadata?: Record<string, unknown>
  ): Promise<string>;

  logMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    extras?: {
      toolCalls?: ToolCallRecord[];
      responseLatencyMs?: number;
      sentimentScore?: number;
    }
  ): Promise<void>;
}

/**
 * Creates a ConversationPersistence adapter from a ConversationStore.
 *
 * Usage:
 * ```ts
 * import { ConversationStore, createPersistenceAdapter } from '@runwell/bot-memory/conversation';
 * import { createChatHandler } from '@runwell/pidgie-shared/api';
 *
 * const store = new ConversationStore(pool);
 * const handler = createChatHandler({
 *   memoryStore: createPersistenceAdapter(store),
 *   getVisitorId: (req) => req.headers.get('x-visitor-id'),
 *   sourceApp: 'my-bot',
 *   // ...other options
 * });
 * ```
 */
export function createPersistenceAdapter(store: ConversationStore): ConversationPersistence {
  return {
    async getOrCreateConversation(visitorId, sessionId, sourceApp, metadata) {
      const existing = await store.getBySessionId(sessionId);
      if (existing) return existing.id;
      return store.create(visitorId, sessionId, sourceApp, metadata);
    },

    async logMessage(conversationId, role, content, extras) {
      await store.addMessage(conversationId, role, content, extras);
    },
  };
}
