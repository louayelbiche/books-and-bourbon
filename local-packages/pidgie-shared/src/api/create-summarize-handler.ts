/**
 * Factory for summarization trigger API route.
 *
 * Accepts a POST from navigator.sendBeacon (tab close) or explicit call.
 * Looks up the conversation by sessionId, then triggers summarization
 * fire-and-forget. Returns 202 Accepted immediately.
 */

import { createLogger, logError } from '@runwell/logger';

const summarizeLogger = createLogger('summarize-handler');

/**
 * Callback that triggers profile summarization for a conversation.
 * Should be fire-and-forget (caller does not await the result).
 */
export type SummarizeTrigger = (visitorId: string, conversationId: string) => void | Promise<void>;

/**
 * Resolves a sessionId to its conversation and visitor IDs.
 * Returns null if the session has no associated conversation.
 */
export type SessionResolver = (sessionId: string) => Promise<{
  visitorId: string;
  conversationId: string;
} | null>;

export interface CreateSummarizeHandlerOptions {
  /** Resolves sessionId to visitorId + conversationId. */
  resolveSession: SessionResolver;
  /** Triggers summarization. Called fire-and-forget. */
  summarize: SummarizeTrigger;
}

/**
 * Creates a POST handler for summarization triggers.
 *
 * Body: `{ sessionId: string }` (sent via sendBeacon as text/plain or application/json)
 *
 * Returns 202 immediately; summarization runs in background.
 */
export function createSummarizeHandler(options: CreateSummarizeHandlerOptions) {
  const { resolveSession, summarize } = options;

  async function POST(request: Request): Promise<Response> {
    try {
      let sessionId: string | undefined;

      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const body = await request.json();
        sessionId = body.sessionId;
      } else {
        // sendBeacon sends as text/plain
        const text = await request.text();
        try {
          const parsed = JSON.parse(text);
          sessionId = parsed.sessionId;
        } catch {
          sessionId = undefined;
        }
      }

      if (!sessionId) {
        return new Response(null, { status: 400 });
      }

      // Fire-and-forget: resolve and summarize in background
      resolveSession(sessionId)
        .then((result) => {
          if (result) {
            return summarize(result.visitorId, result.conversationId);
          }
        })
        .catch((err) => {
          summarizeLogger.error('Summarize trigger failed', logError(err));
        });

      return new Response(null, { status: 202 });
    } catch (error) {
      summarizeLogger.error('Summarize handler error', logError(error));
      return new Response(null, { status: 500 });
    }
  }

  return { POST };
}
