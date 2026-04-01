/**
 * Tests for createSummarizeHandler.
 *
 * Verifies beacon parsing, session resolution, fire-and-forget behavior,
 * and error handling.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

import { createSummarizeHandler } from '../src/api/create-summarize-handler.js';

function makeRequest(body: string, contentType = 'text/plain;charset=UTF-8'): Request {
  return new Request('http://localhost:3000/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
}

describe('createSummarizeHandler', () => {
  it('returns 202 and triggers summarization for valid session', async () => {
    const summarize = vi.fn();
    const resolveSession = vi.fn().mockResolvedValue({
      visitorId: 'vis-1',
      conversationId: 'conv-1',
    });

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(makeRequest(JSON.stringify({ sessionId: 'sess-1' })));

    expect(response.status).toBe(202);

    // Wait for fire-and-forget promise
    await new Promise((r) => setTimeout(r, 10));
    expect(resolveSession).toHaveBeenCalledWith('sess-1');
    expect(summarize).toHaveBeenCalledWith('vis-1', 'conv-1');
  });

  it('parses application/json content type', async () => {
    const summarize = vi.fn();
    const resolveSession = vi.fn().mockResolvedValue({
      visitorId: 'vis-2',
      conversationId: 'conv-2',
    });

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(
      makeRequest(JSON.stringify({ sessionId: 'sess-json' }), 'application/json')
    );

    expect(response.status).toBe(202);
    await new Promise((r) => setTimeout(r, 10));
    expect(resolveSession).toHaveBeenCalledWith('sess-json');
  });

  it('returns 400 when sessionId is missing', async () => {
    const summarize = vi.fn();
    const resolveSession = vi.fn();

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(makeRequest(JSON.stringify({})));

    expect(response.status).toBe(400);
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it('returns 400 for unparseable body', async () => {
    const summarize = vi.fn();
    const resolveSession = vi.fn();

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(makeRequest('not json'));

    expect(response.status).toBe(400);
  });

  it('does not call summarize when session has no conversation', async () => {
    const summarize = vi.fn();
    const resolveSession = vi.fn().mockResolvedValue(null);

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(makeRequest(JSON.stringify({ sessionId: 'sess-none' })));

    expect(response.status).toBe(202);
    await new Promise((r) => setTimeout(r, 10));
    expect(resolveSession).toHaveBeenCalledWith('sess-none');
    expect(summarize).not.toHaveBeenCalled();
  });

  it('does not crash when resolveSession throws', async () => {
    const summarize = vi.fn();
    const resolveSession = vi.fn().mockRejectedValue(new Error('DB down'));

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(makeRequest(JSON.stringify({ sessionId: 'sess-err' })));

    expect(response.status).toBe(202);
    await new Promise((r) => setTimeout(r, 10));
    expect(summarize).not.toHaveBeenCalled();
  });

  it('does not crash when summarize throws', async () => {
    const summarize = vi.fn().mockRejectedValue(new Error('LLM down'));
    const resolveSession = vi.fn().mockResolvedValue({
      visitorId: 'vis-3',
      conversationId: 'conv-3',
    });

    const { POST } = createSummarizeHandler({ resolveSession, summarize });
    const response = await POST(makeRequest(JSON.stringify({ sessionId: 'sess-3' })));

    expect(response.status).toBe(202);
    await new Promise((r) => setTimeout(r, 10));
    expect(summarize).toHaveBeenCalled();
    // Should not throw; error is caught internally
  });
});
