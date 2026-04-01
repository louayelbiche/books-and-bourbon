/**
 * Factory for creating demo-chat POST handlers.
 *
 * Proxies chat messages to BIB /api/public/chat with a demo tenant ID.
 * Converts BIB JSON responses to SSE format for the useChat hook.
 * Includes rate limiting, timeout protection, and graceful fallback.
 *
 * Usage:
 *   import { createDemoChatHandler } from '@runwell/pidgie-shared/api';
 *   export const POST = createDemoChatHandler({
 *     bibUrl: process.env.NEXT_PUBLIC_DEMO_BIB_URL,
 *   });
 */

export interface CreateDemoChatHandlerOptions {
  /** BIB staging URL (e.g. https://dashboard-staging.runwellsystems.com) */
  bibUrl?: string;
  /** Max messages per session per window (default: 30) */
  rateLimit?: number;
  /** Rate limit window in ms (default: 10 minutes) */
  rateWindowMs?: number;
  /** Request timeout in ms (default: 10000) */
  timeoutMs?: number;
}

// Shared rate limit state (per-process)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

// Periodic cleanup
if (typeof globalThis.setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateBuckets) {
      if (now > bucket.resetAt) rateBuckets.delete(key);
    }
  }, 60_000);
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    (timer as NodeJS.Timeout).unref();
  }
}

/**
 * Converts a text reply + optional suggestions into an SSE stream
 * compatible with the useChat hook's parser.
 */
export function toSSE(reply: string, suggestions: string[] = []): Response {
  const lines = [
    `data: ${JSON.stringify({ type: 'text', content: reply })}`,
    ...(suggestions.length > 0
      ? [`data: ${JSON.stringify({ type: 'suggestions', suggestions })}`]
      : []),
    `data: ${JSON.stringify({ type: 'done' })}`,
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export function createDemoChatHandler(options: CreateDemoChatHandlerOptions) {
  const {
    bibUrl,
    rateLimit: limit = 30,
    rateWindowMs = 10 * 60 * 1000,
    timeoutMs = 10_000,
  } = options;

  return async function POST(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    let body: { message: string; sessionId: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { message, sessionId } = body;

    if (!message || !sessionId) {
      return Response.json({ error: 'message and sessionId required' }, { status: 400 });
    }

    if (!bibUrl || !tenantId) {
      return Response.json({ error: 'Demo routing not available' }, { status: 400 });
    }

    const rateKey = `demo-chat:${sessionId}`;
    if (!checkRateLimit(rateKey, limit, rateWindowMs)) {
      return Response.json({ error: 'Too many messages. Please wait a moment.' }, { status: 429 });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const bibResponse = await fetch(`${bibUrl}/api/public/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: `demo-${sessionId}`,
          tenantId,
          channel: 'website',
          contactName: 'Website Visitor',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!bibResponse.ok) {
        console.error('[DemoChat] BIB responded with', bibResponse.status);
        return toSSE('I am currently connecting to the demo system. Please try again in a moment.');
      }

      const contentType = bibResponse.headers.get('Content-Type') || '';
      const bibBody = bibResponse.body;

      if (!bibBody) {
        return toSSE('Sorry, I could not process that request. Please try again.');
      }

      // If BIB returns SSE, pass through directly
      if (contentType.includes('text/event-stream')) {
        return new Response(bibBody, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      }

      // BIB returns JSON: convert to SSE format for useChat hook
      const bibData = await bibResponse.json();
      const reply = bibData.reply || bibData.message || 'I received your message.';
      const suggestions = bibData.suggestions || [];
      return toSSE(reply, suggestions);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      if (!isAbort) console.error('[DemoChat] Proxy error:', err);
      return toSSE('I am currently connecting to the demo system. Please try again in a moment.');
    }
  };
}
