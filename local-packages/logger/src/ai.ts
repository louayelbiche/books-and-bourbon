/**
 * AI/LLM call logging helpers
 */

import { createLogger, type LogContext } from './index';

const logger = createLogger('ai');

interface LlmCallParams {
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  durationMs: number;
  finishReason?: string;
  /** Additional context (e.g. prompt type, agent name) */
  context?: LogContext;
}

/**
 * Log a structured LLM/AI model invocation.
 *
 * @example
 * ```ts
 * import { logLlmCall } from '@runwell/logger/ai';
 *
 * const timer = createTimer();
 * const result = await model.generateContent(prompt);
 * logLlmCall({
 *   model: 'gemini-2.0-flash',
 *   tokensIn: result.usageMetadata?.promptTokenCount,
 *   tokensOut: result.usageMetadata?.candidatesTokenCount,
 *   durationMs: timer.elapsed(),
 * });
 * ```
 */
export function logLlmCall(params: LlmCallParams): void {
  logger.info('LLM call completed', {
    model: params.model,
    tokens_in: params.tokensIn,
    tokens_out: params.tokensOut,
    duration_ms: params.durationMs,
    finish_reason: params.finishReason,
    ...params.context,
  });
}

interface ToolExecutionParams {
  tool: string;
  durationMs: number;
  success: boolean;
  error?: string;
  /** Additional context (e.g. agent name, input summary) */
  context?: LogContext;
}

/**
 * Log a structured tool/function execution.
 *
 * @example
 * ```ts
 * import { logToolExecution } from '@runwell/logger/ai';
 *
 * const timer = createTimer();
 * try {
 *   const result = await executeTool(name, args);
 *   logToolExecution({ tool: name, durationMs: timer.elapsed(), success: true });
 * } catch (error) {
 *   logToolExecution({ tool: name, durationMs: timer.elapsed(), success: false, error: error.message });
 * }
 * ```
 */
export function logToolExecution(params: ToolExecutionParams): void {
  const level = params.success ? 'info' : 'error';
  const msg = params.success ? 'Tool execution completed' : 'Tool execution failed';

  logger[level](msg, {
    tool: params.tool,
    duration_ms: params.durationMs,
    success: params.success,
    error: params.error,
    ...params.context,
  });
}
