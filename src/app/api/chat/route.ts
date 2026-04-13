/**
 * SSE chat endpoint: proxies to BIB /api/public/chat.
 * All intelligence runs in The Office (BIB). This route is a thin
 * adapter that converts BIB's JSON response to SSE for the widget.
 */

const BIB_URL = process.env.BIB_PUBLIC_CHAT_URL || 'http://host.docker.internal:9200/api/public/chat';
const TENANT_ID = process.env.BIB_TENANT_ID || 'c7ec4d92-98ad-4ebe-bf4d-062aaf41146f';
const ALLOWED_ORIGINS = ['books.runwellsystems.com', 'books-staging.runwellsystems.com', 'localhost'];

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '';
  const allowedExact = [
    'https://books.runwellsystems.com',
    'https://books-staging.runwellsystems.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  const isAllowed = allowedExact.includes(origin);

  const body = await request.json();
  const { sessionId, message, locale } = body;

  if (!sessionId || !message) {
    return Response.json({ error: 'sessionId and message are required' }, { status: 400 });
  }

  try {
    const bibResponse = await fetch(BIB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId,
        tenantId: TENANT_ID,
        channel: 'website',
        contactName: 'Website Visitor',
        locale,
      }),
    });

    const data = await bibResponse.json();
    const reply = data.reply || 'I apologize, I could not generate a response.';
    const suggestions = data.suggestions || [];

    // Wrap as SSE for the chat widget
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: reply })}\n\n`));

        if (suggestions.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'suggestions', suggestions })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', detectedLocale: data.detectedLocale })}\n\n`));
        controller.close();
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    if (isAllowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, x-session-id, x-visitor-id';
    }

    return new Response(stream, { headers });
  } catch (error) {
    console.error('[chat-proxy] BIB error:', error instanceof Error ? error.message : error);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: 'I apologize, I am temporarily unavailable. Please try again in a moment.' })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }
}
