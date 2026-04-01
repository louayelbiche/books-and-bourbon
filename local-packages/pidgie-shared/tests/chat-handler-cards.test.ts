/**
 * Chat handler card pipeline integration tests.
 *
 * Verifies that createChatHandler correctly emits cards, actions,
 * and suggestions SSE events when parseResponse is used.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the env module
vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

// Minimal mock agent that yields text chunks
function createMockAgent(response: string) {
  return {
    chatStream: async function* () {
      for (const char of response) {
        yield char;
      }
    },
  };
}

// Minimal mock session store (non-alt: 3-arg addMessage)
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

/** Parse all SSE events from a response into typed objects */
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
      // Parse complete SSE data lines
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
  // Parse remaining buffer
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

describe('Chat handler card pipeline', () => {
  const RESPONSE_WITH_CARDS = `Here are some products!
[CARDS]
[{"id":"p1","type":"product","title":"Blue Shirt","url":"https://shop.com/p1","generatedAt":1700000000}]
[/CARDS]
[ACTIONS]
[{"id":"view","label":"View on store","type":"navigate","payload":"https://shop.com","style":"primary"}]
[/ACTIONS]
[SUGGESTIONS: What sizes? | Any discounts? | Show more]`;

  it('emits cards, actions, and suggestions SSE events in correct order', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_CARDS) as never,
      parseResponse: parseStructuredResponse,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-cards', message: 'Show products' }));
    expect(response.status).toBe(200);

    const events = await parseSSEEvents(response);
    const eventTypes = events.map(e => e.type);

    // Text events come first (one per character in the mock)
    const firstNonText = eventTypes.findIndex(t => t !== 'text');
    expect(firstNonText).toBeGreaterThan(0);

    // After text: text_replace (URL/tag stripping) → cards → actions → suggestions → done
    const postTextTypes = eventTypes.slice(firstNonText);
    expect(postTextTypes).toEqual(['text_replace', 'cards', 'actions', 'suggestions', 'done']);
  });

  it('emits card data with correct structure', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_CARDS) as never,
      parseResponse: parseStructuredResponse,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-card-data', message: 'Products' }));
    const events = await parseSSEEvents(response);

    const cardsEvent = events.find(e => e.type === 'cards');
    expect(cardsEvent).toBeDefined();
    const cards = cardsEvent!.cards as Array<Record<string, unknown>>;
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('p1');
    expect(cards[0].type).toBe('product');
    expect(cards[0].title).toBe('Blue Shirt');
    expect(cards[0].url).toBe('https://shop.com/p1');
  });

  it('emits action data with correct structure', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_CARDS) as never,
      parseResponse: parseStructuredResponse,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-action-data', message: 'Show' }));
    const events = await parseSSEEvents(response);

    const actionsEvent = events.find(e => e.type === 'actions');
    expect(actionsEvent).toBeDefined();
    const actions = actionsEvent!.actions as Array<Record<string, unknown>>;
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('view');
    expect(actions[0].label).toBe('View on store');
    expect(actions[0].type).toBe('navigate');
    expect(actions[0].style).toBe('primary');
  });

  it('emits suggestions with correct values', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_CARDS) as never,
      parseResponse: parseStructuredResponse,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-sugg-data', message: 'Hi' }));
    const events = await parseSSEEvents(response);

    const suggestionsEvent = events.find(e => e.type === 'suggestions');
    expect(suggestionsEvent).toBeDefined();
    expect(suggestionsEvent!.suggestions).toEqual(['What sizes?', 'Any discounts?', 'Show more']);
  });

  it('does NOT emit cards/actions events when response has none', async () => {
    const plainResponse = 'Just a regular response with no cards.\n[SUGGESTIONS: Help | FAQ]';
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(plainResponse) as never,
      parseResponse: parseStructuredResponse,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-no-cards', message: 'Hello' }));
    const events = await parseSSEEvents(response);
    const eventTypes = events.map(e => e.type);

    expect(eventTypes).not.toContain('cards');
    expect(eventTypes).not.toContain('actions');
    expect(eventTypes).toContain('suggestions');
    expect(eventTypes).toContain('done');
  });

  it('parseResponse takes precedence over parseSuggestions', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');
    const legacyParser = vi.fn();

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(RESPONSE_WITH_CARDS) as never,
      parseResponse: parseStructuredResponse,
      parseSuggestions: legacyParser,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-precedence', message: 'Test' }));
    await parseSSEEvents(response);

    // Legacy parser should NOT have been called
    expect(legacyParser).not.toHaveBeenCalled();
  });

  it('falls back to parseSuggestions when parseResponse is not provided', async () => {
    const responseWithSuggestions = 'Hello!\n[SUGGESTIONS: A | B | C]';

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent(responseWithSuggestions) as never,
      parseSuggestions: (text) => {
        const match = text.match(/\[SUGGESTIONS?:\s*([^\]]+)\]/i);
        const cleanText = text.replace(/\[SUGGESTIONS?:[^\]]+\]/gi, '').trim();
        const suggestions = match ? match[1].split('|').map(s => s.trim()).slice(0, 3) : [];
        return { cleanText, suggestions };
      },
    });

    const response = await handler(makeRequest({ sessionId: 'sess-fallback', message: 'Hi' }));
    const events = await parseSSEEvents(response);
    const eventTypes = events.map(e => e.type);

    expect(eventTypes).toContain('suggestions');
    expect(eventTypes).not.toContain('cards');
    expect(eventTypes).not.toContain('actions');

    const suggestionsEvent = events.find(e => e.type === 'suggestions');
    expect(suggestionsEvent!.suggestions).toEqual(['A', 'B', 'C']);
  });

  it('stores clean text (without tags) in session history', async () => {
    const { parseStructuredResponse } = await import('@runwell/card-system/parsers');
    const store = createMockSessionStore();

    const handler = createChatHandler({
      sessionStore: store,
      createAgent: () => createMockAgent(RESPONSE_WITH_CARDS) as never,
      parseResponse: parseStructuredResponse,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-history', message: 'Products' }));
    await parseSSEEvents(response);

    // The stored assistant message should be clean text, not raw with tags
    const assistantMsg = store.getMessages().find((m: { role: string }) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg!.content).toBe('Here are some products!');
    expect(assistantMsg!.content).not.toContain('[CARDS]');
    expect(assistantMsg!.content).not.toContain('[ACTIONS]');
    expect(assistantMsg!.content).not.toContain('[SUGGESTIONS');
  });
});
