/**
 * @runwell/error-handling — Retry Logic
 *
 * Exponential backoff with jitter for retryable operations.
 * Extracted from agent-core's LLM client.
 */
/**
 * Retry configuration.
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}
declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Check if an error is retryable (429, 503, rate limit, timeout, network errors).
 */
declare function isRetryableError(error: unknown): boolean;
/**
 * Calculate backoff delay with jitter.
 */
declare function calculateBackoff(attempt: number, config?: RetryConfig): number;
/**
 * Sleep for a given number of milliseconds.
 */
declare function sleep(ms: number): Promise<void>;
interface WithRetryOptions {
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
declare function withRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>, options?: WithRetryOptions): Promise<T>;

export { DEFAULT_RETRY_CONFIG, type RetryConfig, type WithRetryOptions, calculateBackoff, isRetryableError, sleep, withRetry };
