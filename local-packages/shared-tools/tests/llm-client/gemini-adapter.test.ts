import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiAdapter } from '../../src/llm-client/gemini-adapter.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function geminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

function errorResponse(status: number, body = '') {
  return {
    ok: false,
    status,
    text: async () => body,
  };
}

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    mockFetch.mockReset();
    adapter = new GeminiAdapter({
      apiKey: 'test-key',
      baseBackoffMs: 10, // Fast for tests
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws if apiKey is missing', () => {
      expect(() => new GeminiAdapter({ apiKey: '' })).toThrow(
        'apiKey is required',
      );
    });

    it('uses default model and retry config', () => {
      const a = new GeminiAdapter({ apiKey: 'key' });
      // Verify by making a call and checking the URL
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));
      a.generate({ prompt: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.0-flash'),
        expect.any(Object),
      );
    });

    it('accepts custom model', async () => {
      const a = new GeminiAdapter({
        apiKey: 'key',
        model: 'gemini-1.5-pro',
      });
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));
      await a.generate({ prompt: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-1.5-pro'),
        expect.any(Object),
      );
    });
  });

  describe('request body', () => {
    it('sends single prompt without system_instruction', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({ prompt: 'Analyze this' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.contents).toEqual([
        { role: 'user', parts: [{ text: 'Analyze this' }] },
      ]);
      expect(body.system_instruction).toBeUndefined();
    });

    it('includes system_instruction when systemPrompt provided', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({
        prompt: 'Generate posts',
        systemPrompt: 'You are a social media expert.',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.system_instruction).toEqual({
        parts: [{ text: 'You are a social media expert.' }],
      });
      expect(body.contents).toEqual([
        { role: 'user', parts: [{ text: 'Generate posts' }] },
      ]);
    });

    it('sets responseMimeType to application/json by default', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({ prompt: 'test' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.generationConfig.responseMimeType).toBe(
        'application/json',
      );
    });

    it('sets responseMimeType to text/plain for text format', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({
        prompt: 'test',
        options: { responseFormat: 'text' },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.generationConfig.responseMimeType).toBe('text/plain');
    });

    it('applies default generation config', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({ prompt: 'test' });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.generationConfig.temperature).toBe(0.7);
      expect(body.generationConfig.maxOutputTokens).toBe(4096);
    });

    it('applies custom options', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({
        prompt: 'test',
        options: { temperature: 0.3, maxOutputTokens: 1024 },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.generationConfig.temperature).toBe(0.3);
      expect(body.generationConfig.maxOutputTokens).toBe(1024);
    });

    it('includes API key in URL', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('ok'));

      await adapter.generate({ prompt: 'test' });

      expect(mockFetch.mock.calls[0][0]).toContain('key=test-key');
    });
  });

  describe('response parsing', () => {
    it('returns text from candidates', async () => {
      mockFetch.mockResolvedValueOnce(geminiResponse('{"result": true}'));

      const result = await adapter.generate({ prompt: 'test' });
      expect(result).toBe('{"result": true}');
    });

    it('throws on empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{}] } }] }),
      });

      await expect(adapter.generate({ prompt: 'test' })).rejects.toThrow(
        'Empty Gemini response',
      );
    });

    it('includes finishReason in error for empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            { content: { parts: [{}] }, finishReason: 'SAFETY' },
          ],
        }),
      });

      await expect(adapter.generate({ prompt: 'test' })).rejects.toThrow(
        'SAFETY',
      );
    });
  });

  describe('retry logic', () => {
    it('retries on 429 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(errorResponse(429, 'rate limit'))
        .mockResolvedValueOnce(geminiResponse('ok'));

      const result = await adapter.generate({ prompt: 'test' });
      expect(result).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 503 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(errorResponse(503, 'service unavailable'))
        .mockResolvedValueOnce(geminiResponse('ok'));

      const result = await adapter.generate({ prompt: 'test' });
      expect(result).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on retryable fetch error (timeout)', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(geminiResponse('ok'));

      const result = await adapter.generate({ prompt: 'test' });
      expect(result).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on retryable fetch error (resource exhausted)', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('resource exhausted'))
        .mockResolvedValueOnce(geminiResponse('ok'));

      const result = await adapter.generate({ prompt: 'test' });
      expect(result).toBe('ok');
    });

    it('throws after max retries exceeded', async () => {
      mockFetch.mockResolvedValue(errorResponse(429, 'rate limit'));

      await expect(adapter.generate({ prompt: 'test' })).rejects.toThrow(
        '429',
      );
      // Initial + 3 retries = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('does not retry on 400 (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(400, 'bad request'));

      await expect(adapter.generate({ prompt: 'test' })).rejects.toThrow(
        '400',
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 401 (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse(401, 'unauthorized'));

      await expect(adapter.generate({ prompt: 'test' })).rejects.toThrow(
        '401',
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry on non-retryable fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network failure'));

      await expect(adapter.generate({ prompt: 'test' })).rejects.toThrow(
        'network failure',
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('respects custom maxRetries', async () => {
      const customAdapter = new GeminiAdapter({
        apiKey: 'key',
        maxRetries: 1,
        baseBackoffMs: 10,
      });
      mockFetch.mockResolvedValue(errorResponse(429, 'rate limit'));

      await expect(
        customAdapter.generate({ prompt: 'test' }),
      ).rejects.toThrow('429');
      // Initial + 1 retry = 2 calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('all 8 retryable patterns', () => {
    const patterns = [
      '429',
      'rate limit',
      'quota',
      'too many requests',
      '503',
      'service unavailable',
      'timeout',
      'resource exhausted',
    ];

    for (const pattern of patterns) {
      it(`retries on "${pattern}" error`, async () => {
        mockFetch
          .mockRejectedValueOnce(new Error(pattern))
          .mockResolvedValueOnce(geminiResponse('ok'));

        const result = await adapter.generate({ prompt: 'test' });
        expect(result).toBe('ok');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    }
  });
});
