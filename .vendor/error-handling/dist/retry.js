// src/retry.ts
var DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1e3,
  maxDelayMs: 3e4
};
function isRetryableError(error) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("429") || message.includes("rate limit") || message.includes("quota") || message.includes("too many requests") || message.includes("503") || message.includes("service unavailable") || message.includes("timeout") || message.includes("econnreset") || message.includes("network");
  }
  return false;
}
function calculateBackoff(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, config.maxDelayMs);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, config = {}, options = {}) {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const shouldRetry = options.shouldRetry ?? isRetryableError;
  let lastError;
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
  throw lastError;
}
export {
  DEFAULT_RETRY_CONFIG,
  calculateBackoff,
  isRetryableError,
  sleep,
  withRetry
};
//# sourceMappingURL=retry.js.map