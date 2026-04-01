/**
 * Tests for createEscalationHttpTool (PRD-053)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEscalationHttpTool } from '../../request-escalation/src/tool.js';
import type { EscalationHttpToolConfig } from '../../request-escalation/src/tool.js';

const BASE_CONFIG: EscalationHttpToolConfig = {
  bibBaseUrl: 'https://app.example.com',
  apiKey: 'test-api-key-123',
  businessName: 'Acme Corp',
  source: 'whatsapp',
};

describe('createEscalationHttpTool', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns an AgentTool with name "submit_request"', () => {
    const tool = createEscalationHttpTool(BASE_CONFIG);
    expect(tool.name).toBe('submit_request');
  });

  it('description includes business name', () => {
    const tool = createEscalationHttpTool(BASE_CONFIG);
    expect(tool.description).toContain('Acme Corp');
  });

  it('description mentions buying intent', () => {
    const tool = createEscalationHttpTool(BASE_CONFIG);
    expect(tool.description).toContain('buying intent');
  });

  it('has required parameter "question"', () => {
    const tool = createEscalationHttpTool(BASE_CONFIG);
    expect(tool.parameters.required).toContain('question');
  });

  it('POSTs to correct URL with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'req-123' }),
    });
    globalThis.fetch = mockFetch;

    const tool = createEscalationHttpTool(BASE_CONFIG);
    await tool.execute({ question: 'How much for enterprise?' }, {});

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://app.example.com/api/escalation/ingest');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-API-Key']).toBe('test-api-key-123');
  });

  it('sends question and context in request body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'req-456' }),
    });
    globalThis.fetch = mockFetch;

    const tool = createEscalationHttpTool(BASE_CONFIG);
    await tool.execute({
      question: 'Enterprise pricing?',
      context: 'Visitor asked about bulk pricing',
    }, {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.question).toBe('Enterprise pricing?');
    expect(body.botContext).toBe('Visitor asked about bulk pricing');
    expect(body.source).toBe('whatsapp');
  });

  it('includes visitor info when provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'req-789' }),
    });
    globalThis.fetch = mockFetch;

    const tool = createEscalationHttpTool(BASE_CONFIG);
    await tool.execute({
      question: 'Need a demo',
      visitor_name: 'John',
      visitor_email: 'john@example.com',
      visitor_phone: '+1-555-0100',
    }, {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.visitorInfo.name).toBe('John');
    expect(body.visitorInfo.email).toBe('john@example.com');
    expect(body.visitorInfo.phone).toBe('+1-555-0100');
  });

  it('strips empty visitor info', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'req-abc' }),
    });
    globalThis.fetch = mockFetch;

    const tool = createEscalationHttpTool(BASE_CONFIG);
    await tool.execute({ question: 'Help needed' }, {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.visitorInfo).toBeUndefined();
  });

  it('returns success with request_id on 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'req-success' }),
    });

    const tool = createEscalationHttpTool(BASE_CONFIG);
    const result = await tool.execute({ question: 'Test' }, {}) as Record<string, unknown>;

    expect(result.status).toBe('success');
    expect(result.request_id).toBe('req-success');
    expect(result.message).toContain('Acme Corp');
  });

  it('returns error on non-200 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const tool = createEscalationHttpTool(BASE_CONFIG);
    const result = await tool.execute({ question: 'Test' }, {}) as Record<string, unknown>;

    expect(result.status).toBe('error');
    expect(result.message).toContain('Acme Corp');
  });

  it('defaults business name to "our team" when not provided', () => {
    const tool = createEscalationHttpTool({
      bibBaseUrl: 'https://app.example.com',
      apiKey: 'key',
    });
    expect(tool.description).toContain('our team');
  });

  it('defaults source to "whatsapp" when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'x' }),
    });
    globalThis.fetch = mockFetch;

    const tool = createEscalationHttpTool({
      bibBaseUrl: 'https://app.example.com',
      apiKey: 'key',
    });
    await tool.execute({ question: 'Test' }, {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.source).toBe('whatsapp');
  });
});
