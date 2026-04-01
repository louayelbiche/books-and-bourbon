/**
 * Factory for paginated conversation history API route handlers.
 *
 * Returns a GET handler that serves visitor message history with
 * cursor-based pagination (before timestamp + limit).
 *
 * Like ConversationPersistence, this uses an interface so pidgie-shared
 * has no hard dependency on bot-memory or pg.
 */

import { createLogger, logError } from '@runwell/logger';

const historyLogger = createLogger('history-handler');

/**
 * Portable history page shape returned by the handler.
 * Mirrors bot-memory's HistoryPage without importing it.
 */
export interface HistoryMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: { name: string }[];
  createdAt: Date | string;
}

export interface HistoryPage {
  messages: HistoryMessage[];
  hasMore: boolean;
  oldestTimestamp: string | null;
}

/**
 * Interface for loading paginated history.
 * Implemented by bot-memory's HistoryLoader (via adapter) or any
 * compatible store.
 */
export interface HistoryPersistence {
  getHistory(
    visitorId: string,
    options?: {
      before?: string;
      limit?: number;
      sourceApp?: string;
    }
  ): Promise<HistoryPage>;
}

export interface CreateHistoryHandlerOptions {
  /** History loader instance (e.g. from bot-memory's HistoryLoader). */
  historyStore: HistoryPersistence;

  /**
   * Optional access validation. Return true to allow, false to deny.
   * Use this to verify the requesting user owns the visitorId.
   */
  validateAccess?: (request: Request, visitorId: string) => boolean | Promise<boolean>;

  /** If set, only return history for this source app. */
  sourceApp?: string;
}

/**
 * Creates a GET handler that serves paginated conversation history.
 *
 * Query params:
 * - `limit` (optional, default 20, max 100)
 * - `before` (optional, ISO timestamp cursor for pagination)
 *
 * Visitor ID is read from the `x-visitor-id` header.
 *
 * Response: `{ messages, hasMore, oldestTimestamp }`
 */
export function createHistoryHandler(options: CreateHistoryHandlerOptions) {
  const { historyStore, validateAccess, sourceApp } = options;

  async function GET(request: Request): Promise<Response> {
    try {
      const visitorId = request.headers.get('x-visitor-id');
      if (!visitorId) {
        return Response.json(
          { error: 'x-visitor-id header required' },
          { status: 400 }
        );
      }

      if (validateAccess) {
        const allowed = await validateAccess(request, visitorId);
        if (!allowed) {
          return Response.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      const url = new URL(request.url);
      const before = url.searchParams.get('before') || undefined;
      const limitParam = url.searchParams.get('limit');

      let limit = 20;
      if (limitParam) {
        const parsed = parseInt(limitParam, 10);
        if (isNaN(parsed) || parsed < 1) {
          return Response.json(
            { error: 'limit must be a positive integer' },
            { status: 400 }
          );
        }
        limit = Math.min(parsed, 100);
      }

      const page = await historyStore.getHistory(visitorId, {
        before,
        limit,
        sourceApp,
      });

      return Response.json(page);
    } catch (error) {
      historyLogger.error('History handler error', logError(error));
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return { GET };
}
