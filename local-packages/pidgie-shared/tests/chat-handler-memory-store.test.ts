/**
 * Chat handler memoryStore integration tests.
 *
 * Verifies that createChatHandler correctly uses the async ConversationPersistence
 * interface (memoryStore) when provided, and emits visitorId via SSE meta event.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

function createMockAgent(response: string, toolCallNames?: string[]) {
  return {
    chatStream: async function* (_msg: string, _hist: unknown[], options?: {
      onToolCall?: (name: string, args: Record<string, unknown>) => void;
      onToolResult?: (result: { name: string; args: Record<string, unknown>; success: boolean; resultSummary?: string; durationMs: number }) => void;
    }) {
      if (toolCallNames) {
        for (const name of toolCallNames) {
          options?.onToolCall?.(name, {});
          options?.onToolResult?.({ name, args: {}, success: true, resultSummary: '{}', durationMs: 1 });
        }
      }
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
    addMessage: (_sid: string, _msg: { role: string; content: string }) => {
      messages.push(_msg);
    },
    getMessages: () => messages,
  };
}

function createMockMemoryStore() {
  return {
    getOrCreateConversation: vi.fn().mockResolvedValue('conv-pg-001'),
    logMessage: vi.fn().mockResolvedValue(undefined),
  };
}

import { createChatHandler } from '../src/api/create-chat-handler.js';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-visitor-id': 'vis-abc-123',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function consumeSSE(response: Response): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: Array<{ type: string; [key: string]: unknown }> = [];
  let done = false;

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          events.push(JSON.parse(line.slice(6)));
        } catch { /* skip malformed */ }
      }
    }
  }
  return events;
}

describe('Chat handler with memoryStore', () => {
  let memoryStore: ReturnType<typeof createMockMemoryStore>;

  beforeEach(() => {
    memoryStore = createMockMemoryStore();
  });

  it('uses memoryStore for conversation logging when provided', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Hello!') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-1', message: 'Hi' }));
    await consumeSSE(response);

    expect(memoryStore.getOrCreateConversation).toHaveBeenCalledWith(
      'vis-abc-123', 'sess-1', 'test-bot', {}
    );
    expect(memoryStore.logMessage).toHaveBeenCalledWith('conv-pg-001', 'user', 'Hi');
    expect(memoryStore.logMessage).toHaveBeenCalledWith(
      'conv-pg-001', 'assistant', 'Hello!',
      expect.objectContaining({ responseLatencyMs: expect.any(Number) })
    );
  });

  it('emits visitorId as SSE meta event', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Hi') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-meta', message: 'Test' }));
    const events = await consumeSSE(response);

    const metaEvent = events.find(e => e.type === 'meta');
    expect(metaEvent).toBeDefined();
    expect(metaEvent!.visitorId).toBe('vis-abc-123');
  });

  it('records tool calls in memoryStore', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Found items', ['search', 'get_price']) as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-tools', message: 'Find shoes' }));
    await consumeSSE(response);

    // Check assistant message logged with tool calls
    const assistantCall = memoryStore.logMessage.mock.calls.find(
      (c: unknown[]) => c[1] === 'assistant'
    );
    expect(assistantCall).toBeDefined();
    expect(assistantCall![3]).toEqual(expect.objectContaining({
      toolCalls: [
        expect.objectContaining({ name: 'search', success: true }),
        expect.objectContaining({ name: 'get_price', success: true }),
      ],
    }));
  });

  it('falls back to legacy logger when memoryStore not provided', async () => {
    const legacyLogger = {
      getOrStartConversation: vi.fn().mockReturnValue('conv-sqlite'),
      logUserMessage: vi.fn(),
      logAssistantMessage: vi.fn(),
    };

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('OK') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger: legacyLogger as never,
    });

    const response = await handler(makeRequest({ sessionId: 'sess-legacy', message: 'Hi' }));
    await consumeSSE(response);

    expect(legacyLogger.getOrStartConversation).toHaveBeenCalled();
    expect(legacyLogger.logUserMessage).toHaveBeenCalledWith('conv-sqlite', 'Hi');
  });

  it('memoryStore takes precedence over legacy logger', async () => {
    const legacyLogger = {
      getOrStartConversation: vi.fn(),
      logUserMessage: vi.fn(),
      logAssistantMessage: vi.fn(),
    };

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('OK') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      logger: legacyLogger as never,
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-both', message: 'Hi' }));
    await consumeSSE(response);

    // memoryStore used
    expect(memoryStore.getOrCreateConversation).toHaveBeenCalled();
    // Legacy logger NOT used
    expect(legacyLogger.getOrStartConversation).not.toHaveBeenCalled();
  });

  it('skips memoryStore when visitorId is null', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('OK') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: () => null, // no visitor
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-novis', message: 'Hi' }));
    const events = await consumeSSE(response);

    expect(memoryStore.getOrCreateConversation).not.toHaveBeenCalled();
    expect(events.find(e => e.type === 'meta')).toBeUndefined();
  });

  it('does not crash when memoryStore throws', async () => {
    memoryStore.getOrCreateConversation.mockRejectedValue(new Error('DB down'));

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('Still works') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-err', message: 'Hi' }));
    expect(response.status).toBe(200);
    const events = await consumeSSE(response);
    expect(events.find(e => e.type === 'done')).toBeDefined();
  });

  it('logs error message in memoryStore on streaming failure', async () => {
    const failingAgent = {
      chatStream: async function* () {
        yield 'Start...';
        throw new Error('LLM failure');
      },
    };

    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => failingAgent as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
    });

    const response = await handler(makeRequest({ sessionId: 'sess-fail', message: 'Break' }));
    await consumeSSE(response);

    const errorCall = memoryStore.logMessage.mock.calls.find(
      (c: unknown[]) => c[1] === 'assistant' && (c[2] as string).includes('[ERROR]')
    );
    expect(errorCall).toBeDefined();
  });

  it('passes extractMetadata to memoryStore as metadata', async () => {
    const handler = createChatHandler({
      sessionStore: createMockSessionStore(),
      createAgent: () => createMockAgent('OK') as never,
      parseSuggestions: (text) => ({ cleanText: text, suggestions: [] }),
      memoryStore,
      getVisitorId: (req) => req.headers.get('x-visitor-id'),
      sourceApp: 'test-bot',
      extractMetadata: () => ({ websiteUrl: 'https://test.com', locale: 'fr' }),
    });

    const response = await handler(makeRequest({ sessionId: 'sess-meta2', message: 'Salut' }));
    await consumeSSE(response);

    expect(memoryStore.getOrCreateConversation).toHaveBeenCalledWith(
      'vis-abc-123', 'sess-meta2', 'test-bot',
      { websiteUrl: 'https://test.com', locale: 'fr' }
    );
  });
});
