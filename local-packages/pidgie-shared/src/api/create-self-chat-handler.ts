/**
 * Factory for creating self-chat POST handlers.
 *
 * Proxies chat messages to BIB /api/public/chat with a fixed tenant ID
 * (the brand's own BIB tenant). Converts BIB JSON responses to SSE format.
 *
 * Usage:
 *   import { createSelfChatHandler } from '@runwell/pidgie-shared/api';
 *   export const POST = createSelfChatHandler({
 *     bibUrl: process.env.BIB_PUBLIC_CHAT_URL || 'http://host.docker.internal:9200/api/public/chat',
 *     tenantId: '633a5813-9468-4dc2-96c8-88ed7ccb3ab9',
 *   });
 */

export interface CreateSelfChatHandlerOptions {
  /** BIB public chat URL (full path to /api/public/chat) */
  bibUrl: string;
  /** Fixed tenant ID for this brand's self-bot */
  tenantId: string;
  /** Max requests per IP per minute (default: 15) */
  rateLimit?: number;
  /** Max message length (default: 2000) */
  maxMessageLength?: number;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

if (typeof globalThis.setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 5 * 60_000);
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    (timer as NodeJS.Timeout).unref();
  }
}

export function createSelfChatHandler(options: CreateSelfChatHandlerOptions) {
  const {
    bibUrl,
    tenantId,
    rateLimit: limit = 15,
    maxMessageLength = 2000,
  } = options;

  return async function POST(request: Request): Promise<Response> {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (!checkRateLimit(ip, limit)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    let body: { message: string; history?: Array<{ role: string; content: string }>; locale?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { message, history = [] } = body;
    if (!message || typeof message !== 'string' || message.length > maxMessageLength) {
      return Response.json({ error: 'Invalid message' }, { status: 400 });
    }

    try {
      const bibRes = await fetch(bibUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: ip,
          tenantId,
          channel: 'website',
          contactName: 'Website Visitor',
          history,
        }),
      });

      const data = await bibRes.json();
      const reply = data.reply || 'I am temporarily unavailable.';
      const suggestions = data.suggestions || [];

      // SSE format matching the self-bot widget parser: {"text": "..."} + [DONE]
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: reply })}\n\n`));
          if (suggestions.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ suggestions })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (err) {
      console.error('[self-chat] BIB error:', err instanceof Error ? err.message : err);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`));
          controller.close();
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    }
  };
}
