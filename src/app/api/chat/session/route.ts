/**
 * Session management for the concierge bot.
 *
 * POST: Create a new session (fetches CMS knowledge, stores in memory, creates visitor)
 * GET/DELETE/HEAD: Handled by createSessionHandler factory from concierge-shared
 */

import { NextResponse } from 'next/server';
import { createSessionHandler } from '@runwell/concierge-shared/api';
import { createLogger, logError } from '@runwell/logger';
import { sessionStore } from '@/lib/chat/session-store';
import { getKnowledge } from '@/lib/chat/knowledge';
import { getVisitorStore } from '@/lib/chat/memory';
import type { ClientSessionData } from '@/lib/chat/session-store';

const logger = createLogger('session');

// Factory handles GET, DELETE, HEAD
const handler = createSessionHandler({
  sessionStore,
  serialize: (raw: unknown) => {
    const session = raw as unknown as ClientSessionData;
    return {
      sessionId: session.id,
      messageCount: session.messages.length,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      createdAt: session.createdAt.toISOString(),
    };
  },
});

export const GET = handler.GET;
export const DELETE = handler.DELETE;
export const HEAD = handler.HEAD;

// Custom POST: creates session with CMS knowledge + bot-memory visitor
export async function POST() {
  try {
    const knowledge = await getKnowledge();
    const session = sessionStore.create(knowledge);

    // Get or create visitor identity (Postgres-backed via bot-memory)
    let visitorId: string | undefined;
    const visitorStore = await getVisitorStore();
    if (visitorStore) {
      try {
        const visitorKey = `cookie:${crypto.randomUUID()}`;
        const profile = await visitorStore.getOrCreate({
          identity: {
            visitorKey,
            visitorType: 'cookie',
            sourceApp: 'books-and-bourbon',
          },
        });
        visitorId = profile.id;
      } catch (error) {
        console.error('[bot-memory:bb] Failed to create visitor:', error);
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      ...(visitorId ? { visitorId } : {}),
    });
  } catch (error) {
    logger.error('Failed to create session', logError(error));
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
