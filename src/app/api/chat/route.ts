/**
 * SSE chat endpoint for the concierge bot.
 * Uses createChatHandler factory from concierge-shared.
 */

import { createChatHandler } from '@runwell/concierge-shared/api';
import { parseSuggestions } from '@runwell/concierge-shared/api';
import { sessionStore } from '@/lib/chat/session-store';
import { BBConciergeAgent } from '@/lib/chat/bb-agent';
import type { ClientSessionData } from '@/lib/chat/session-store';

const handler = createChatHandler({
  sessionStore,
  createAgent: (session) => {
    const s = session as ClientSessionData;
    return new BBConciergeAgent(s.knowledge);
  },
  parseSuggestions,
});

export const POST = handler;
