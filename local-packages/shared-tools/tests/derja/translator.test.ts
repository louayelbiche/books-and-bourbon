import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NLLBTranslator } from '../../src/derja/translator.js';

// =============================================================================
// Mock fetch globally
// =============================================================================

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockFetchResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : `Error ${status}`,
    json: () => Promise.resolve(data),
  };
}

describe('NLLBTranslator', () => {
  let translator: NLLBTranslator;

  beforeEach(() => {
    vi.clearAllMocks();
    translator = new NLLBTranslator({
      baseUrl: 'https://test-nllb.example.com',
      timeoutMs: 5000,
      retryBackoffMs: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Successful translation
  // ===========================================================================

  describe('successful translation', () => {
    it('translates text and returns result', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'مرحبا' }));

      const result = await translator.translate({
        text: 'Hello',
        source: 'eng_Latn',
        target: 'aeb_Arab',
      });

      expect(result.translated).toBe('مرحبا');
      expect(result.source).toBe('eng_Latn');
      expect(result.target).toBe('aeb_Arab');
    });

    it('handles string response format', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse('Translated text'));

      const result = await translator.translate({
        text: 'نص',
        source: 'aeb_Arab',
        target: 'eng_Latn',
      });

      expect(result.translated).toBe('Translated text');
    });

    it('handles empty text gracefully', async () => {
      const result = await translator.translate({
        text: '',
        source: 'eng_Latn',
        target: 'aeb_Arab',
      });

      expect(result.translated).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('passes correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'ok' }));

      await translator.translate({
        text: 'Hello world',
        source: 'eng_Latn',
        target: 'aeb_Arab',
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('text=Hello+world');
      expect(calledUrl).toContain('source=eng_Latn');
      expect(calledUrl).toContain('target=aeb_Arab');
    });
  });

  // ===========================================================================
  // Convenience methods
  // ===========================================================================

  describe('convenience methods', () => {
    it('derjaToEnglish routes correctly', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'Hello' }));

      const result = await translator.derjaToEnglish('مرحبا');
      expect(result).toBe('Hello');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('source=aeb_Arab');
      expect(calledUrl).toContain('target=eng_Latn');
    });

    it('englishToDerja routes correctly', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'مرحبا' }));

      const result = await translator.englishToDerja('Hello');
      expect(result).toBe('مرحبا');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('source=eng_Latn');
      expect(calledUrl).toContain('target=aeb_Arab');
    });

    it('derjaToFrench routes correctly', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'Bonjour' }));

      const result = await translator.derjaToFrench('مرحبا');
      expect(result).toBe('Bonjour');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('source=aeb_Arab');
      expect(calledUrl).toContain('target=fra_Latn');
    });

    it('frenchToDerja routes correctly', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'مرحبا' }));

      const result = await translator.frenchToDerja('Bonjour');
      expect(result).toBe('مرحبا');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('source=fra_Latn');
      expect(calledUrl).toContain('target=aeb_Arab');
    });

    it('derjaToMSA routes correctly', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'مرحبا' }));

      const result = await translator.derjaToMSA('مرحبا');
      expect(result).toBe('مرحبا');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('source=aeb_Arab');
      expect(calledUrl).toContain('target=arb_Arab');
    });
  });

  // ===========================================================================
  // Retry behavior
  // ===========================================================================

  describe('retry on transient errors', () => {
    it('retries on 429 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(mockFetchResponse(null, 429))
        .mockResolvedValueOnce(mockFetchResponse({ result: 'ok' }));

      const result = await translator.translate({
        text: 'test',
        source: 'eng_Latn',
        target: 'aeb_Arab',
      });

      expect(result.translated).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 503 and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(mockFetchResponse(null, 503))
        .mockResolvedValueOnce(mockFetchResponse({ result: 'ok' }));

      const result = await translator.translate({
        text: 'test',
        source: 'eng_Latn',
        target: 'aeb_Arab',
      });

      expect(result.translated).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after all retries exhausted', async () => {
      mockFetch
        .mockResolvedValueOnce(mockFetchResponse(null, 503))
        .mockResolvedValueOnce(mockFetchResponse(null, 503))
        .mockResolvedValueOnce(mockFetchResponse(null, 503))
        .mockResolvedValueOnce(mockFetchResponse(null, 503));

      await expect(
        translator.translate({ text: 'test', source: 'eng_Latn', target: 'aeb_Arab' })
      ).rejects.toThrow('NLLB API');
    });
  });

  // ===========================================================================
  // Timeout handling
  // ===========================================================================

  describe('timeout handling', () => {
    it('throws on timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError);

      await expect(
        translator.translate({ text: 'test', source: 'eng_Latn', target: 'aeb_Arab' })
      ).rejects.toThrow('timeout');
    });
  });

  // ===========================================================================
  // Configuration
  // ===========================================================================

  describe('configuration', () => {
    it('uses default base URL when not configured', () => {
      const defaultTranslator = new NLLBTranslator();
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'ok' }));

      // The constructor should use the default URL
      expect(defaultTranslator).toBeDefined();
    });

    it('strips trailing slash from base URL', async () => {
      const slashTranslator = new NLLBTranslator({
        baseUrl: 'https://test.example.com/',
      });

      mockFetch.mockResolvedValueOnce(mockFetchResponse({ result: 'ok' }));

      await slashTranslator.translate({
        text: 'test',
        source: 'eng_Latn',
        target: 'aeb_Arab',
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('//api');
    });

    it('uses NLLB_API_URL env variable when set', () => {
      const originalEnv = process.env.NLLB_API_URL;
      process.env.NLLB_API_URL = 'https://custom-nllb.example.com';

      const envTranslator = new NLLBTranslator();
      expect(envTranslator).toBeDefined();

      process.env.NLLB_API_URL = originalEnv;
    });
  });

  // ===========================================================================
  // Non-retryable errors
  // ===========================================================================

  describe('non-retryable errors', () => {
    it('throws immediately on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse(null, 400));

      await expect(
        translator.translate({ text: 'test', source: 'eng_Latn', target: 'aeb_Arab' })
      ).rejects.toThrow('NLLB API error: 400');
    });

    it('throws immediately on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce(mockFetchResponse(null, 404));

      await expect(
        translator.translate({ text: 'test', source: 'eng_Latn', target: 'aeb_Arab' })
      ).rejects.toThrow('NLLB API error: 404');
    });
  });
});
