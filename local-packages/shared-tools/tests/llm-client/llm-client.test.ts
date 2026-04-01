import { describe, it, expect, vi } from 'vitest';
import type { LLMClient, LLMClientParams } from '../../src/llm-client/types.js';
import { createMockLLMClient } from '../mocks/fixtures.js';

describe('LLMClient interface contract', () => {
  it('accepts a single prompt (sales-agent pattern)', async () => {
    const client = createMockLLMClient('{"result": "ok"}');

    const params: LLMClientParams = {
      prompt: 'Analyze this brand',
    };

    const result = await client.generate(params);
    expect(result).toBe('{"result": "ok"}');
    expect(client.generate).toHaveBeenCalledWith(params);
  });

  it('accepts system + user prompt (social-agent pattern)', async () => {
    const client = createMockLLMClient('{"posts": []}');

    const params: LLMClientParams = {
      prompt: 'Generate posts for this brand',
      systemPrompt: 'You are a social media expert.',
    };

    const result = await client.generate(params);
    expect(result).toBe('{"posts": []}');
    expect(client.generate).toHaveBeenCalledWith(params);
  });

  it('accepts options overrides', async () => {
    const client = createMockLLMClient('response');

    const params: LLMClientParams = {
      prompt: 'test',
      options: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        timeoutMs: 10_000,
        responseFormat: 'text',
      },
    };

    const result = await client.generate(params);
    expect(result).toBe('response');
  });

  it('works with custom implementation', async () => {
    const customClient: LLMClient = {
      generate: async (params: LLMClientParams) => {
        return `Processed: ${params.prompt}`;
      },
    };

    const result = await customClient.generate({ prompt: 'hello' });
    expect(result).toBe('Processed: hello');
  });

  it('mock tracks call count', async () => {
    const client = createMockLLMClient('ok');

    await client.generate({ prompt: 'a' });
    await client.generate({ prompt: 'b' });

    expect(client.generate).toHaveBeenCalledTimes(2);
  });

  it('can be configured to reject', async () => {
    const client: LLMClient = {
      generate: vi.fn().mockRejectedValue(new Error('API error')),
    };

    await expect(client.generate({ prompt: 'fail' })).rejects.toThrow(
      'API error',
    );
  });
});
