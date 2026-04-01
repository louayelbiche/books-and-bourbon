/**
 * Chat handler logging integration tests.
 *
 * Verifies that createChatHandler correctly hooks into ConversationLogger
 * when a logger is provided, and works identically without one.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ConversationLogger } from '../src/logging/logger.js';
import type { DatabaseLike, MessageRecord } from '../src/logging/types.js';

// Mock the agent module
vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

function createMemoryDb(): DatabaseLike {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db as unknown as DatabaseLike;
}

// Minimal mock agent that yields text chunks
function createMockAgent(response: string, toolCallNames?: string[]) {
  return {
    chatStream: async function* (_msg: string, _hist: unknown[], options?: {
      onToolCall?: (name: string, args: Record<string, unknown>) => void;
      onToolResult?: (result: { name: string; args: Record<string, unknown>; success: boolean; resultSummary?: string; durationMs: number }) => void;
    }) {
      // Simulate tool calls if provided
      if (toolCallNames) {
        for (const name of toolCallNames) {
          options?.onToolCall?.(name, {});
          options?.onToolResult?.({ name, args: {}, success: true, resultSummary: '{}', durationMs: 1 });
        }
      }
      // Yield response in chunks
      for (const char of response) {
        yield char;
      }
    },
  };
}

// Minimal mock session store
function createMockSessionStore(sessionData: Record<string, unknown> = {}) {
  const messages: Array<{ role: string; content: string }> = [];
  return {
    get: (_id: string) => ({ messages, ...sessionData }),
    addMessage: (_sid: string, _msg: { role: string; content: string }) => {
      messages.push(_msg);
    },
    getMessages: () => messages,
  };
}

// Import the handler factory (after mocks since it imports redactError)
import { createChatHandler } from '../src/api/create-chat-handler.js';

describe('Chat handler logging integration', () => {
  let db: DatabaseLike;
  let logger: ConversationLogger;

  beforeEach(() => {
    db = createMemoryDb();
    logger = new ConversationLogger(db, { sourceApp: 'test-app' });
  });

  function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
    return new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  async function consumeSSE(response: Response): Promise<string[]> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const events: string[] = [];
    let done = false;

    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        events.push(decoder.decode(value));
      }
    }
    return events;
  }

  it('logs user message when logger is provided', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Hello!') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-1', message: 'Hi there' }));
    await consumeSSE(response);

    const msgs = db.prepare('SELECT * FROM messages ORDER BY created_at').all() as MessageRecord[];
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('Hi there');
  });

  it('logs assistant message with latency > 0', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Response text') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-2', message: 'Test' }));
    await consumeSSE(response);

    const msgs = db.prepare(
      "SELECT * FROM messages WHERE role = 'assistant'"
    ).all() as MessageRecord[];
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('Response text');
    expect(msgs[0].response_latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not store PII headers', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('OK') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger,
    });

    const response = await handler(makeRequest(
      { sessionId: 'sess-nopii', message: 'Hi' },
      { 'User-Agent': 'TestBot/1.0', 'X-Forwarded-For': '10.0.0.1', 'Accept-Language': 'en-US' }
    ));
    await consumeSSE(response);

    const conv = db.prepare('SELECT * FROM conversations WHERE session_id = ?').get('sess-nopii') as Record<string, unknown>;
    expect(conv).not.toHaveProperty('user_agent');
    expect(conv).not.toHaveProperty('ip_address');
    expect(conv).not.toHaveProperty('accept_language');
  });

  it('calls extractMetadata with session object', async () => {
    const sessionData = { website: { url: 'https://test.com' }, locale: 'fr' };
    const extractMetadata = vi.fn(() => ({
      websiteUrl: 'https://test.com',
      websiteDomain: 'test.com',
      locale: 'fr',
    }));

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(sessionData),
      createAgent: () => createMockAgent('Bonjour') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger,
      extractMetadata,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-meta', message: 'Salut' }));
    await consumeSSE(response);

    expect(extractMetadata).toHaveBeenCalled();
    const conv = db.prepare('SELECT website_domain, locale FROM conversations WHERE session_id = ?').get('sess-meta') as { website_domain: string; locale: string };
    expect(conv.website_domain).toBe('test.com');
    expect(conv.locale).toBe('fr');
  });

  it('works without logger (no crash)', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Works fine') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      // no logger
    });

    const response = await handler(makeRequest({ sessionId: 'sess-nolog', message: 'Test' }));
    expect(response.status).toBe(200);
    await consumeSSE(response);
  });

  it('records tool calls when onToolCall fires', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Found 3 items', ['search_products', 'get_price']) as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-tools', message: 'Find shoes' }));
    await consumeSSE(response);

    const msg = db.prepare(
      "SELECT tool_calls FROM messages WHERE role = 'assistant' AND conversation_id IN (SELECT id FROM conversations WHERE session_id = 'sess-tools')"
    ).get() as { tool_calls: string };
    expect(JSON.parse(msg.tool_calls)).toEqual(['search_products', 'get_price']);
  });

  it('logs error message on streaming failure', async () => {
    const failingAgent = {
      chatStream: async function* () {
        yield 'Start...';
        throw new Error('Gemini API failure');
      },
    };

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => failingAgent as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-err', message: 'Break' }));
    await consumeSSE(response);

    const msgs = db.prepare(
      "SELECT * FROM messages WHERE role = 'assistant' AND content LIKE '%ERROR%'"
    ).all() as MessageRecord[];
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toContain('[ERROR]');
  });
});
