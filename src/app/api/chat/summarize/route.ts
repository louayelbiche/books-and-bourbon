import { getConversationStore, getSummarizer } from '@/lib/chat/memory';

/**
 * Beacon endpoint for tab-close summarization.
 * Called via navigator.sendBeacon() when the user leaves the page.
 * Always returns 202 to avoid blocking the browser.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(null, { status: 202 });
    }

    const conversationStore = await getConversationStore();
    const summarizer = await getSummarizer();
    if (!conversationStore || !summarizer) {
      return new Response(null, { status: 202 });
    }

    const conversation = await conversationStore.getBySessionId(sessionId);
    if (!conversation) {
      return new Response(null, { status: 202 });
    }

    summarizer.summarize(conversation.visitorId, conversation.id).catch(() => {});
  } catch {
    // Beacon endpoints must never fail
  }

  return new Response(null, { status: 202 });
}
