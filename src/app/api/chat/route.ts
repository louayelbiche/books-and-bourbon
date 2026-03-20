/**
 * SSE chat endpoint for the concierge bot.
 * Uses createChatHandler factory from concierge-shared.
 * Bot-memory integration: lazy-initialized Postgres pool for conversation
 * persistence, profile injection, and visitor tracking.
 */

import { createChatHandler, parseStructuredResponse } from '@runwell/pidgie-shared/api';
import type { ConversationPersistence } from '@runwell/bot-memory';
import { sessionStore } from '@/lib/chat/session-store';
import { BBConciergeAgent } from '@/lib/chat/bb-agent';
import { getMemoryStore, getProfileInjector } from '@/lib/chat/memory';
import type { ClientSessionData } from '@/lib/chat/session-store';

// Lazy-initialized handler with memoryStore support.
let cachedHandler: ((request: Request) => Promise<Response>) | null = null;

async function getHandler(): Promise<(request: Request) => Promise<Response>> {
  if (cachedHandler) return cachedHandler;

  const memoryStore: ConversationPersistence | undefined = await getMemoryStore();
  const profileInjector = await getProfileInjector();

  cachedHandler = createChatHandler({
    sessionStore,
    createAgent: (session: unknown) => {
      const s = session as ClientSessionData;
      return new BBConciergeAgent(s.knowledge);
    },
    parseResponse: parseStructuredResponse,
    allowedOrigins: ['books.runwellsystems.com'],
    ...(memoryStore
      ? {
          memoryStore,
          getVisitorId: (req: Request) => req.headers.get('x-visitor-id'),
          sourceApp: 'books-and-bourbon',
          ...(profileInjector
            ? {
                getProfileBlock: (visitorId: string) =>
                  profileInjector.getPromptBlock(visitorId).then((b) => b?.promptText ?? null),
              }
            : {}),
        }
      : {}),
  });

  return cachedHandler;
}

export async function POST(request: Request): Promise<Response> {
  const handler = await getHandler();
  return handler(request);
}
