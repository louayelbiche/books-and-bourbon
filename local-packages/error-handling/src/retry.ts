/**
 * @runwell/error-handling — Retry Logic
 *
 * Exponential backoff with jitter for retryable operations.
 * Extracted from agent-core's LLM client.
 */

/**
 * Retry configuration.
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Check if an error is retryable (429, 503, rate limit, timeout, network errors).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("429") ||
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("too many requests") ||
      message.includes("503") ||
      message.includes("service unavailable") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("network")
    );
  }
  return false;
}

/**
 * Calculate backoff delay with jitter.
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface WithRetryOptions {
  /** Called before each retry with attempt number, delay, and the error. */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  /** Custom predicate for whether to retry. Defaults to isRetryableError. */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Higher-order function to retry an async operation with exponential backoff.
 *
 * Usage:
 * ```typescript
 * const result = await withRetry(
 *   () => callExternalApi(data),
 *   { maxRetries: 3 },
 *   { onRetry: (attempt, delay, err) => logger.warn('Retrying', { attempt, delay }) }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  options: WithRetryOptions = {}
): Promise<T> {
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const shouldRetry = options.shouldRetry ?? isRetryableError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= retryConfig.maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = calculateBackoff(attempt, retryConfig);
      options.onRetry?.(attempt + 1, delayMs, error);
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}
