import { describe, it, expect, vi } from 'vitest';
import { extractBrandVoice } from '../../src/brand-analysis/extract-voice.js';
import { createMockLLMClient, MOCK_VOICE_RESPONSE } from '../mocks/fixtures.js';

describe('extractBrandVoice', () => {
  it('returns a valid WebsiteAnalysis from LLM response', async () => {
    const llm = createMockLLMClient(MOCK_VOICE_RESPONSE);
    const result = await extractBrandVoice(llm, 'Some website content.');

    expect(result.companyName).toBe('Test Corp');
    expect(result.industry).toBe('Technology');
    expect(result.mainOfferings).toContain('SaaS Platform');
    expect(result.brandVoice).toBe('Professional and data-driven with emphasis on ROI');
  });

  it('uses system + user prompt pattern', async () => {
    const llm = createMockLLMClient(MOCK_VOICE_RESPONSE);
    await extractBrandVoice(llm, 'content');

    const call = vi.mocked(llm.generate).mock.calls[0][0];
    expect(call.systemPrompt).toBeDefined();
    expect(call.systemPrompt).toContain('brand analyst');
    expect(call.prompt).toContain('content');
  });

  it('calls LLM with correct options', async () => {
    const llm = createMockLLMClient(MOCK_VOICE_RESPONSE);
    await extractBrandVoice(llm, 'content');

    expect(llm.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseFormat: 'json',
        }),
      }),
    );
  });

  it('truncates content at 15K chars', async () => {
    const llm = createMockLLMClient(MOCK_VOICE_RESPONSE);
    const longContent = 'y'.repeat(20_000);
    await extractBrandVoice(llm, longContent);

    const call = vi.mocked(llm.generate).mock.calls[0][0];
    expect(call.prompt.length).toBeLessThan(20_000);
  });

  it('propagates LLM errors', async () => {
    const llm = {
      generate: vi.fn().mockRejectedValue(new Error('Service unavailable')),
    };

    await expect(extractBrandVoice(llm, 'content')).rejects.toThrow('Service unavailable');
  });

  it('returns defaults for sparse JSON', async () => {
    const llm = createMockLLMClient(JSON.stringify({ companyName: 'Sparse' }));
    const result = await extractBrandVoice(llm, 'content');

    expect(result.companyName).toBe('Sparse');
    expect(result.industry).toBe('General');
    expect(result.mainOfferings).toEqual([]);
    expect(result.brandVoice).toBe('Professional');
  });

  it('handles array-wrapped response', async () => {
    const llm = createMockLLMClient(JSON.stringify([{
      companyName: 'Wrapped Corp',
      industry: 'Retail',
      mainOfferings: ['Shoes'],
      brandVoice: 'Trendy and youthful',
    }]));

    const result = await extractBrandVoice(llm, 'content');
    expect(result.companyName).toBe('Wrapped Corp');
    expect(result.brandVoice).toBe('Trendy and youthful');
  });
});
