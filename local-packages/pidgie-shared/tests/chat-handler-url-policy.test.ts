/**
 * Integration tests: URL policy enforcement in createChatHandler.
 *
 * Verifies that allowedOrigins config correctly:
 * - Strips URLs from text (emits text_replace)
 * - Blocks foreign card/action URLs
 * - Allows same-origin card/action URLs
 * - Supports function-based allowedOrigins
 * - Stores URL-stripped text in session history
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the env module (matches chat-handler-cards.test.ts pattern)
vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

function createMockAgent(response: string) {
  return {
    chatStream: async function* () {
      for (const char of response) {
        yield char;
      }
    },
  };
}

function createMockSessionStore() {
  const messages: Array<{ role: string; content: string }> = [];
  return {
    get: () => ({ messages }),
    addMessage: (_sid: string, role: string, content: string) => {
      messages.push({ role, content });
    },
    getMessages: () => messages,
  };
}

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseSSEEvents(response: Response): Promise<Array<Record<string, unknown>>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: Array<Record<string, unknown>> = [];
  let done = false;
  let buffer = '';

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            events.push(JSON.parse(trimmed.slice(6)));
          } catch {
            // skip malformed
          }
        }
      }
    }
  }
  if (buffer.trim().startsWith('data: ')) {
    try {
      events.push(JSON.parse(buffer.trim().slice(6)));
    } catch {
      // skip
    }
  }
  return events;
}

import { createChatHandler } from '../src/api/create-chat-handler.js';

const RESPONSE_WITH_URL = `Check out https://external.com/promo for deals!
[CARDS]
[{"id":"c1","type":"product","title":"Allowed Item","url":"https://shop.com/item","image":"https://cdn.shop.com/img.jpg","generatedAt":1700000000},{"id":"c2","type":"product","title":"Blocked Item","url":"https://evil.com/phish","image":"https://evil.com/logo.png","generatedAt":1700000000}]
[/CARDS]
[ACTIONS]
[{"id":"a1","label":"Visit","type":"navigate","payload":"https://shop.com/go","style":"primary"},{"id":"a2","label":"Phish","type":"navigate","payload":"https://evil.com/steal","style":"secondary"}]
[/ACTIONS]`;

describe('Chat handler URL policy', () => {
  it('strips URLs from text and emits text_replace event', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_URL) as never,
      parseResponse: parseStructuredResponse,
      allowedOrigins: ['shop.com'],
    });

    const response = await handler(makeRequest({ sessionId: 'sess-url-strip', message: 'Show deals' }));
    const events = await parseSSEEvents(response);

    const textReplace = events.find(e => e.type === 'text_replace');
    expect(textReplace).toBeDefined();
    expect(textReplace!.content).not.toContain('https://external.com');
    expect(textReplace!.content).toContain('Check out');
  });

  it('blocks foreign card URLs when allowedOrigins set', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_URL) as never,
      parseResponse: parseStructuredResponse,
      allowedOrigins: ['shop.com'],
    });

    const response = await handler(makeRequest({ sessionId: 'sess-block-foreign', message: 'Show' }));
    const events = await parseSSEEvents(response);

    const cardsEvent = events.find(e => e.type === 'cards');
    expect(cardsEvent).toBeDefined();
    const cards = cardsEvent!.cards as Array<Record<string, unknown>>;

    // Allowed card keeps its URL
    const allowed = cards.find(c => c.id === 'c1');
    expect(allowed!.url).toBe('https://shop.com/item');
    expect(allowed!.image).toBe('https://cdn.shop.com/img.jpg');

    // Blocked card has URL cleared but image preserved (images are display-only)
    const blocked = cards.find(c => c.id === 'c2');
    expect(blocked!.url).toBe('');
    expect(blocked!.image).toBe('https://evil.com/logo.png');
  });

  it('allows same-origin card URLs', async () => {
    const sameOriginResponse = `Here you go!
[CARDS]
[{"id":"c1","type":"product","title":"Our Product","url":"https://shop.com/p1","generatedAt":1700000000}]
[/CARDS]`;
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(sameOriginResponse) as never,
      parseResponse: parseStructuredResponse,
      allowedOrigins: ['shop.com'],
    });

    const response = await handler(makeRequest({ sessionId: 'sess-allow-same', message: 'Show' }));
    const events = await parseSSEEvents(response);

    const cardsEvent = events.find(e => e.type === 'cards');
    const cards = cardsEvent!.cards as Array<Record<string, unknown>>;
    expect(cards[0].url).toBe('https://shop.com/p1');
  });

  it('supports function-based allowedOrigins', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_URL) as never,
      parseResponse: parseStructuredResponse,
      allowedOrigins: () => ['shop.com'],
    });

    const response = await handler(makeRequest({ sessionId: 'sess-fn-origins', message: 'Hi' }));
    const events = await parseSSEEvents(response);

    const cardsEvent = events.find(e => e.type === 'cards');
    const cards = cardsEvent!.cards as Array<Record<string, unknown>>;
    const blocked = cards.find(c => c.id === 'c2');
    expect(blocked!.url).toBe('');
  });

  it('stores URL-stripped text in session history', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');
    const store = createMockSessionStore();

    const handler = createChatHandler({
      sessionStore: store,
      createAgent: () => createMockAgent(RESPONSE_WITH_URL) as never,
      parseResponse: parseStructuredResponse,
      allowedOrigins: ['shop.com'],
    });

    const response = await handler(makeRequest({ sessionId: 'sess-history-url', message: 'Show' }));
    await parseSSEEvents(response);

    const assistantMsg = store.getMessages().find((m: { role: string }) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg!.content).not.toContain('https://external.com');
    expect(assistantMsg!.content).not.toContain('[CARDS]');
  });
});
