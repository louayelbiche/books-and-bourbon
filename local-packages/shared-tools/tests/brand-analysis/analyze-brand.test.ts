import { describe, it, expect, vi } from 'vitest';
import { analyzeBrand } from '../../src/brand-analysis/analyze-brand.js';
import { createMockLLMClient, MOCK_BRAND_RESPONSE } from '../mocks/fixtures.js';

describe('analyzeBrand', () => {
  it('returns a valid BrandProfile from LLM response', async () => {
    const llm = createMockLLMClient(MOCK_BRAND_RESPONSE);
    const result = await analyzeBrand(llm, 'Some website content about a tech company.');

    expect(result.companyName).toBe('Test Corp');
    expect(result.brandVoice.tone).toBe('professional');
    expect(result.brandVoice.personality).toContain('innovative');
    expect(result.products).toHaveLength(1);
    expect(result.confidence).toBe(0.85);
  });

  it('calls LLM with correct options', async () => {
    const llm = createMockLLMClient(MOCK_BRAND_RESPONSE);
    await analyzeBrand(llm, 'content');

    expect(llm.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseFormat: 'json',
        }),
      }),
    );
  });

  it('truncates content at 15K chars', async () => {
    const llm = createMockLLMClient(MOCK_BRAND_RESPONSE);
    const longContent = 'x'.repeat(20_000);
    await analyzeBrand(llm, longContent);

    const call = vi.mocked(llm.generate).mock.calls[0][0];
    // The prompt template adds text around the content, but content portion should be truncated
    expect(call.prompt.length).toBeLessThan(20_000);
  });

  it('does not include systemPrompt (single-prompt pattern)', async () => {
    const llm = createMockLLMClient(MOCK_BRAND_RESPONSE);
    await analyzeBrand(llm, 'content');

    const call = vi.mocked(llm.generate).mock.calls[0][0];
    expect(call.systemPrompt).toBeUndefined();
  });

  it('propagates LLM errors', async () => {
    const llm = {
      generate: vi.fn().mockRejectedValue(new Error('Rate limited')),
    };

    await expect(analyzeBrand(llm, 'content')).rejects.toThrow('Rate limited');
  });

  it('throws on malformed JSON from LLM', async () => {
    const llm = createMockLLMClient('not valid json');
    await expect(analyzeBrand(llm, 'content')).rejects.toThrow();
  });

  it('returns defaults for sparse JSON', async () => {
    const llm = createMockLLMClient(JSON.stringify({ companyName: 'Sparse Inc' }));
    const result = await analyzeBrand(llm, 'content');

    expect(result.companyName).toBe('Sparse Inc');
    expect(result.confidence).toBe(0.5);
    expect(result.products).toEqual([]);
  });
});
