/**
 * Mock LLM Client for Testing
 */

import type {
  LLMClient,
  GenerateOptions,
  GenerationResult,
  StreamChunk,
  ToolDeclaration,
} from '@runwell/agent-core';

export class MockLLMClient implements LLMClient {
  public lastPrompt: string = '';
  public lastOptions?: GenerateOptions;
  public mockResponse: string = 'Mock response';
  public mockFunctionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    this.lastPrompt = prompt;
    this.lastOptions = options;

    return {
      text: this.mockResponse,
      finishReason: 'STOP',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    };
  }

  async *generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<StreamChunk> {
    this.lastPrompt = prompt;
    this.lastOptions = options;

    const words = this.mockResponse.split(' ');
    for (const word of words) {
      yield {
        type: 'text',
        content: word + ' ',
      };
    }

    yield {
      type: 'done',
      content: '',
    };
  }

  async generateWithTools(
    prompt: string,
    tools: ToolDeclaration[],
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    this.lastPrompt = prompt;
    this.lastOptions = options;

    return {
      text: this.mockResponse,
      functionCalls: this.mockFunctionCalls.length > 0 ? this.mockFunctionCalls : undefined,
      finishReason: 'STOP',
    };
  }

  async continueWithToolResult(
    conversationHistory: Array<{ role: string; content: string }>,
    toolName: string,
    toolResult: unknown,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    return {
      text: `Tool ${toolName} returned: ${JSON.stringify(toolResult)}`,
      finishReason: 'STOP',
    };
  }

  async continueWithAllToolResults(
    originalPrompt: string,
    functionCalls: Array<{ name: string; args: Record<string, unknown> }>,
    results: Array<{ name: string; result: unknown }>,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    const summary = results.map((r) => `${r.name}: ${JSON.stringify(r.result)}`).join('; ');
    return {
      text: `Based on the tools (${functionCalls.map((c) => c.name).join(', ')}): ${summary}`,
      finishReason: 'STOP',
    };
  }
}
