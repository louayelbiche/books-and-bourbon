/**
 * Tests for createHistoryHandler.
 *
 * Verifies query param parsing, access validation, pagination,
 * error handling, and limit clamping.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

import { createHistoryHandler } from '../src/api/create-history-handler.js';

function createMockHistoryStore() {
  return {
    getHistory: vi.fn().mockResolvedValue({
      messages: [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user' as const,
          content: 'Hello',
          createdAt: new Date('2026-03-17T10:00:00Z'),
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant' as const,
          content: 'Hi there',
          toolCalls: [{ name: 'search' }],
          createdAt: new Date('2026-03-17T10:00:01Z'),
        },
      ],
      hasMore: false,
      oldestTimestamp: '2026-03-17T10:00:00.000Z',
    }),
  };
}

function makeRequest(
  params: Record<string, string> = {},
  headers: Record<string, string> = {}
): Request {
  const url = new URL('http://localhost:3000/api/history');
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return new Request(url.toString(), {
    method: 'GET',
    headers: {
      'x-visitor-id': 'vis-abc-123',
      ...headers,
    },
  });
}

describe('createHistoryHandler', () => {
  it('returns paginated history for valid visitor', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.messages).toHaveLength(2);
    expect(body.hasMore).toBe(false);
    expect(body.oldestTimestamp).toBe('2026-03-17T10:00:00.000Z');
    expect(store.getHistory).toHaveBeenCalledWith('vis-abc-123', {
      before: undefined,
      limit: 20,
      sourceApp: undefined,
    });
  });

  it('returns 400 when x-visitor-id header is missing', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    const request = new Request('http://localhost:3000/api/history');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('x-visitor-id');
    expect(store.getHistory).not.toHaveBeenCalled();
  });

  it('passes before cursor to store', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    await GET(makeRequest({ before: '2026-03-17T09:00:00Z' }));

    expect(store.getHistory).toHaveBeenCalledWith('vis-abc-123', {
      before: '2026-03-17T09:00:00Z',
      limit: 20,
      sourceApp: undefined,
    });
  });

  it('passes custom limit to store', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    await GET(makeRequest({ limit: '50' }));

    expect(store.getHistory).toHaveBeenCalledWith('vis-abc-123', {
      before: undefined,
      limit: 50,
      sourceApp: undefined,
    });
  });

  it('clamps limit to 100', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    await GET(makeRequest({ limit: '500' }));

    expect(store.getHistory).toHaveBeenCalledWith('vis-abc-123', {
      before: undefined,
      limit: 100,
      sourceApp: undefined,
    });
  });

  it('returns 400 for invalid limit', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    const response = await GET(makeRequest({ limit: 'abc' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('limit');
  });

  it('returns 400 for zero limit', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    const response = await GET(makeRequest({ limit: '0' }));
    expect(response.status).toBe(400);
  });

  it('returns 403 when validateAccess denies', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({
      historyStore: store,
      validateAccess: () => false,
    });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Access denied');
    expect(store.getHistory).not.toHaveBeenCalled();
  });

  it('allows request when validateAccess returns true', async () => {
    const store = createMockHistoryStore();
    const validateAccess = vi.fn().mockResolvedValue(true);
    const { GET } = createHistoryHandler({
      historyStore: store,
      validateAccess,
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(validateAccess).toHaveBeenCalledWith(
      expect.any(Request),
      'vis-abc-123'
    );
    expect(store.getHistory).toHaveBeenCalled();
  });

  it('passes sourceApp option to store', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({
      historyStore: store,
      sourceApp: 'shopimate-sales',
    });

    await GET(makeRequest());

    expect(store.getHistory).toHaveBeenCalledWith('vis-abc-123', {
      before: undefined,
      limit: 20,
      sourceApp: 'shopimate-sales',
    });
  });

  it('returns 500 when store throws', async () => {
    const store = createMockHistoryStore();
    store.getHistory.mockRejectedValue(new Error('DB connection lost'));
    const { GET } = createHistoryHandler({ historyStore: store });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });

  it('serializes Date createdAt fields to ISO strings via Response.json', async () => {
    const store = createMockHistoryStore();
    const { GET } = createHistoryHandler({ historyStore: store });

    const response = await GET(makeRequest());
    const body = await response.json();

    // Response.json() serializes Date objects to ISO strings
    expect(typeof body.messages[0].createdAt).toBe('string');
    expect(body.messages[0].createdAt).toBe('2026-03-17T10:00:00.000Z');
  });
});
