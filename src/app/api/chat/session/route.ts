/**
 * Session management for the concierge bot.
 *
 * POST: Create a new session (fetches CMS knowledge, stores in memory)
 * GET/DELETE/HEAD: Handled by createSessionHandler factory from concierge-shared
 */

import { NextResponse } from 'next/server';
import { createSessionHandler } from '@runwell/concierge-shared/api';
import { createLogger, logError } from '@runwell/logger';
import { sessionStore } from '@/lib/chat/session-store';
import { getKnowledge } from '@/lib/chat/knowledge';
import type { ClientSessionData } from '@/lib/chat/session-store';

const logger = createLogger('session');

// Factory handles GET, DELETE, HEAD
const handler = createSessionHandler({
  sessionStore,
  serialize: (raw) => {
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

// Custom POST — creates session with CMS knowledge
export async function POST() {
  try {
    const knowledge = await getKnowledge();
    const session = sessionStore.create(knowledge);
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    logger.error('Failed to create session', logError(error));
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
