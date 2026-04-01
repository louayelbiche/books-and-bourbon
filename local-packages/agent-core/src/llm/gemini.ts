/**
 * Gemini LLM Client Implementation
 *
 * Implements the LLMClient interface for Google's Gemini API.
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Tool,
  FunctionDeclaration,
  Part,
} from '@google/generative-ai';
import type {
  LLMConfig,
  GenerateOptions,
  GenerationResult,
  StreamChunk,
  ToolDeclaration,
  FunctionCall,
} from '../types/index.js';
import {
  LLMClient,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  calculateBackoff,
  sleep,
} from './client.js';
import { createLogger } from '@runwell/logger';

const logger = createLogger('gemini-client');

/**
 * Gemini-specific configuration
 */
export interface GeminiConfig extends LLMConfig {
  model?: string;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Gemini LLM Client
 */
export class GeminiClient implements LLMClient {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;
  private retryConfig: RetryConfig;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = this.client.getGenerativeModel({
      model: config.model || DEFAULT_MODEL,
    });
    this.retryConfig = {
      maxRetries: config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      baseDelayMs: config.baseDelayMs ?? DEFAULT_RETRY_CONFIG.baseDelayMs,
      maxDelayMs: DEFAULT_RETRY_CONFIG.maxDelayMs,
    };
  }

  /**
   * Generate content from a prompt
   */
  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    return this.executeWithRetry(async () => {
      const contents = this.buildContents(prompt, options?.systemPrompt);
      const generationConfig = this.buildGenerationConfig(options);

      const result = await this.model.generateContent({
        contents,
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      return {
        text,
        finishReason: response.candidates?.[0]?.finishReason,
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount || 0,
              completionTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    });
  }

  /**
   * Generate content with streaming response
   */
  async *generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<StreamChunk> {
    const contents = this.buildContents(prompt, options?.systemPrompt);
    const generationConfig = this.buildGenerationConfig(options);
    const tools = options?.tools ? this.convertTools(options.tools) : undefined;

    try {
      const result = await this.model.generateContentStream({
        contents,
        generationConfig,
        tools,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield {
            type: 'text',
            content: text,
          };
        }

        // Check for function calls
        const functionCalls = this.extractFunctionCalls(chunk);
        for (const fc of functionCalls) {
          yield {
            type: 'tool_call',
            content: fc.name,
            functionCall: fc,
          };
        }
      }

      yield {
        type: 'done',
        content: '',
      };
    } catch (error) {
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate content with tool/function calling
   */
  async generateWithTools(
    prompt: string,
    tools: ToolDeclaration[],
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    return this.executeWithRetry(async () => {
      const contents = this.buildContents(prompt, options?.systemPrompt);
      const generationConfig = this.buildGenerationConfig(options);
      const geminiTools = this.convertTools(tools);

      const result = await this.model.generateContent({
        contents,
        generationConfig,
        tools: geminiTools,
      });

      const response = result.response;
      const text = response.text();
      const functionCalls = this.extractFunctionCallsFromResponse(response);

      return {
        text,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        finishReason: response.candidates?.[0]?.finishReason,
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount || 0,
              completionTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    });
  }

  /**
   * Continue generation after tool execution
   */
  async continueWithToolResult(
    conversationHistory: Array<{ role: string; content: string }>,
    toolName: string,
    toolResult: unknown,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    return this.executeWithRetry(async () => {
      // Build contents from history
      const contents: Content[] = conversationHistory.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Add tool result
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: { result: toolResult },
            },
          },
        ],
      });

      const generationConfig = this.buildGenerationConfig(options);

      const result = await this.model.generateContent({
        contents,
        generationConfig,
      });

      const response = result.response;
      return {
        text: response.text(),
        finishReason: response.candidates?.[0]?.finishReason,
      };
    });
  }

  /**
   * Continue generation after ALL tool executions using proper Gemini function calling protocol.
   * Sends function calls as model parts and function responses as user parts.
   */
  async continueWithAllToolResults(
    originalPrompt: string,
    functionCalls: Array<{ name: string; args: Record<string, unknown> }>,
    results: Array<{ name: string; result: unknown }>,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    return this.executeWithRetry(async () => {
      const contents: Content[] = [];

      // Turn 1: User message (with system prompt if provided)
      if (options?.systemPrompt) {
        contents.push({
          role: 'user',
          parts: [{ text: `${options.systemPrompt}\n\n${originalPrompt}` }],
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: originalPrompt }],
        });
      }

      // Turn 2: Model's function calls
      contents.push({
        role: 'model',
        parts: functionCalls.map((fc) => ({
          functionCall: { name: fc.name, args: fc.args },
        })),
      });

      // Turn 3: Function responses (all in one user turn)
      contents.push({
        role: 'user',
        parts: results.map((r) => ({
          functionResponse: {
            name: r.name,
            response: { result: r.result },
          },
        })),
      });

      const generationConfig = this.buildGenerationConfig(options);

      const result = await this.model.generateContent({
        contents,
        generationConfig,
      });

      const response = result.response;
      return {
        text: response.text(),
        finishReason: response.candidates?.[0]?.finishReason,
        usage: response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount || 0,
              completionTokens: response.usageMetadata.candidatesTokenCount || 0,
              totalTokens: response.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private buildContents(prompt: string, systemPrompt?: string): Content[] {
    const contents: Content[] = [];

    // Gemini doesn't have a dedicated system role, prepend to first message
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    return contents;
  }

  private buildGenerationConfig(options?: GenerateOptions) {
    return {
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      maxOutputTokens:
        options?.maxOutputTokens ?? this.config.maxOutputTokens ?? 2048,
      stopSequences: options?.stopSequences,
    };
  }

  private convertTools(tools: ToolDeclaration[]): Tool[] {
    const functionDeclarations: FunctionDeclaration[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as FunctionDeclaration['parameters'],
    }));

    return [{ functionDeclarations }];
  }

  private extractFunctionCalls(chunk: { candidates?: Array<{ content?: { parts?: Part[] } }> }): FunctionCall[] {
    const calls: FunctionCall[] = [];
    const parts = chunk.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if ('functionCall' in part && part.functionCall) {
        calls.push({
          name: part.functionCall.name,
          args: part.functionCall.args as Record<string, unknown>,
        });
      }
    }

    return calls;
  }

  private extractFunctionCallsFromResponse(response: {
    candidates?: Array<{ content?: { parts?: Part[] } }>;
  }): FunctionCall[] {
    return this.extractFunctionCalls(response);
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries && isRetryableError(error)) {
          const delay = calculateBackoff(attempt, this.retryConfig);
          logger.warn('Retrying after delay', { delay, attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries, error: lastError.message });
          await sleep(delay);
        } else {
          throw lastError;
        }
      }
    }

    throw lastError;
  }
}

// Singleton instance (optional)
let instance: GeminiClient | null = null;

/**
 * Get or create a singleton GeminiClient instance
 */
export function getGeminiClient(config?: GeminiConfig): GeminiClient {
  if (!instance) {
    if (!config) {
      // Prefer GEMINI_API_KEY for consistency across BIB pidgie deployments
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY environment variable is required, or pass config. Get key at: https://aistudio.google.com/apikey'
        );
      }
      instance = new GeminiClient({ apiKey });
    } else {
      instance = new GeminiClient(config);
    }
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetGeminiClient(): void {
  instance = null;
}
