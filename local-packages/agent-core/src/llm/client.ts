/**
 * LLM Client Interface
 *
 * Provider-agnostic interface for LLM interactions.
 */

import type {
  GenerateOptions,
  GenerationResult,
  StreamChunk,
  ToolDeclaration,
} from '../types/index.js';

/**
 * Abstract LLM client interface
 */
export interface LLMClient {
  /**
   * Generate content from a prompt
   */
  generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerationResult>;

  /**
   * Generate content with streaming response
   */
  generateContentStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<StreamChunk>;

  /**
   * Generate content with tool/function calling
   */
  generateWithTools(
    prompt: string,
    tools: ToolDeclaration[],
    options?: GenerateOptions
  ): Promise<GenerationResult>;

  /**
   * Continue generation after tool execution
   */
  continueWithToolResult(
    conversationHistory: Array<{ role: string; content: string }>,
    toolName: string,
    toolResult: unknown,
    options?: GenerateOptions
  ): Promise<GenerationResult>;

  /**
   * Continue generation after ALL tool executions (batch).
   * Uses proper function call/response protocol for best results.
   * Falls back to sequential continueWithToolResult if not implemented.
   */
  continueWithAllToolResults?(
    originalPrompt: string,
    functionCalls: Array<{ name: string; args: Record<string, unknown> }>,
    results: Array<{ name: string; result: unknown }>,
    options?: GenerateOptions
  ): Promise<GenerationResult>;
}

// Re-export retry utilities from shared package
export type { RetryConfig } from '@runwell/error-handling/retry';
export {
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  calculateBackoff,
  sleep,
} from '@runwell/error-handling/retry';
