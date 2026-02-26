/**
 * SSE chat endpoint for the concierge bot.
 * Uses createChatHandler factory from concierge-shared.
 */

import { createChatHandler, parseStructuredResponse } from '@runwell/concierge-shared/api';
import { sessionStore } from '@/lib/chat/session-store';
import { BBConciergeAgent } from '@/lib/chat/bb-agent';
import type { ClientSessionData } from '@/lib/chat/session-store';

const handler = createChatHandler({
  sessionStore,
  createAgent: (session: unknown) => {
    const s = session as ClientSessionData;
    return new BBConciergeAgent(s.knowledge);
  },
  parseResponse: parseStructuredResponse,
  allowedOrigins: ['books.runwellsystems.com'],
});

export const POST = handler;
