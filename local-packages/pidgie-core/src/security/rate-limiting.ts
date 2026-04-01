/**
 * Rate Limiting Utilities
 *
 * Provides in-memory rate limiting for API routes using pidgie-core.
 * For production deployments, nginx-level rate limiting is recommended,
 * but these utilities provide application-level protection.
 *
 * @example
 * ```typescript
 * import { createRateLimiter } from '@runwell/pidgie-core/security';
 *
 * // 30 requests per minute per IP
 * const limiter = createRateLimiter({
 *   windowMs: 60000,
 *   maxRequests: 30,
 * });
 *
 * export async function POST(request: Request) {
 *   const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
 *   const result = limiter.check(ip);
 *
 *   if (!result.allowed) {
 *     return new Response('Too many requests', {
 *       status: 429,
 *       headers: {
 *         'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
 *         'X-RateLimit-Limit': String(result.limit),
 *         'X-RateLimit-Remaining': String(result.remaining),
 *       },
 *     });
 *   }
 *
 *   // Handle request...
 * }
 * ```
 */

export interface RateLimiterConfig {
  /** Time window in milliseconds. Default: 60000 (1 minute) */
  windowMs?: number;
  /** Maximum requests per window. Default: 30 */
  maxRequests?: number;
  /** Skip rate limiting for these identifiers (e.g., internal IPs) */
  skipList?: string[];
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Total limit for the window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Milliseconds until the window resets */
  resetMs: number;
  /** Milliseconds to wait before retrying (only if not allowed) */
  retryAfterMs: number;
}

interface WindowData {
  count: number;
  startTime: number;
}

/**
 * Create a fixed-window rate limiter
 *
 * Uses a simple fixed window algorithm. For smoother rate limiting,
 * use createSlidingWindowLimiter instead.
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig = {}) {
  const { windowMs = 60000, maxRequests = 30, skipList = [] } = config;

  const windows = new Map<string, WindowData>();

  // Cleanup old entries periodically
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, data] of windows.entries()) {
        if (now - data.startTime > windowMs * 2) {
          windows.delete(key);
        }
      }
    },
    windowMs * 2
  );

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    /**
     * Check if a request should be allowed
     *
     * @param identifier - Unique identifier (usually IP address)
     * @returns Rate limit result with allowed status and metadata
     */
    check(identifier: string): RateLimitResult {
      // Skip rate limiting for allowed identifiers
      if (skipList.includes(identifier)) {
        return {
          allowed: true,
          limit: maxRequests,
          remaining: maxRequests,
          resetMs: 0,
          retryAfterMs: 0,
        };
      }

      const now = Date.now();
      let data = windows.get(identifier);

      // New window or expired window
      if (!data || now - data.startTime >= windowMs) {
        data = { count: 0, startTime: now };
        windows.set(identifier, data);
      }

      const resetMs = Math.max(0, windowMs - (now - data.startTime));

      // Check if over limit
      if (data.count >= maxRequests) {
        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetMs,
          retryAfterMs: resetMs,
        };
      }

      // Increment and allow
      data.count++;

      return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - data.count),
        resetMs,
        retryAfterMs: 0,
      };
    },

    /**
     * Reset the rate limit for an identifier
     */
    reset(identifier: string): void {
      windows.delete(identifier);
    },

    /**
     * Get current state for an identifier (for debugging)
     */
    getState(identifier: string): { count: number; resetMs: number } | null {
      const data = windows.get(identifier);
      if (!data) return null;

      const now = Date.now();
      const resetMs = Math.max(0, windowMs - (now - data.startTime));

      return { count: data.count, resetMs };
    },

    /**
     * Stop the cleanup interval (for graceful shutdown)
     */
    stop(): void {
      clearInterval(cleanupInterval);
    },
  };
}

interface SlidingWindowData {
  timestamps: number[];
}

/**
 * Create a sliding window rate limiter
 *
 * More accurate than fixed window, prevents burst at window boundaries.
 * Slightly higher memory usage as it tracks individual request timestamps.
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function createSlidingWindowLimiter(config: RateLimiterConfig = {}) {
  const { windowMs = 60000, maxRequests = 30, skipList = [] } = config;

  const windows = new Map<string, SlidingWindowData>();

  // Cleanup old entries periodically
  const cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, data] of windows.entries()) {
        // Remove timestamps older than window
        data.timestamps = data.timestamps.filter((t) => now - t < windowMs);
        // Remove entry if no recent requests
        if (data.timestamps.length === 0) {
          windows.delete(key);
        }
      }
    },
    windowMs
  );

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    /**
     * Check if a request should be allowed
     *
     * @param identifier - Unique identifier (usually IP address)
     * @returns Rate limit result with allowed status and metadata
     */
    check(identifier: string): RateLimitResult {
      if (skipList.includes(identifier)) {
        return {
          allowed: true,
          limit: maxRequests,
          remaining: maxRequests,
          resetMs: 0,
          retryAfterMs: 0,
        };
      }

      const now = Date.now();
      let data = windows.get(identifier);

      if (!data) {
        data = { timestamps: [] };
        windows.set(identifier, data);
      }

      // Remove expired timestamps
      data.timestamps = data.timestamps.filter((t) => now - t < windowMs);

      // Calculate reset time (when oldest request expires)
      const oldestTimestamp = data.timestamps[0];
      const resetMs = oldestTimestamp ? Math.max(0, windowMs - (now - oldestTimestamp)) : windowMs;

      // Check if over limit
      if (data.timestamps.length >= maxRequests) {
        // Calculate retry after (when next slot opens)
        const nextSlotOpens = data.timestamps[0] + windowMs;
        const retryAfterMs = Math.max(0, nextSlotOpens - now);

        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetMs,
          retryAfterMs,
        };
      }

      // Add timestamp and allow
      data.timestamps.push(now);

      return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - data.timestamps.length),
        resetMs,
        retryAfterMs: 0,
      };
    },

    /**
     * Reset the rate limit for an identifier
     */
    reset(identifier: string): void {
      windows.delete(identifier);
    },

    /**
     * Get current state for an identifier (for debugging)
     */
    getState(identifier: string): { count: number; resetMs: number } | null {
      const data = windows.get(identifier);
      if (!data) return null;

      const now = Date.now();
      const validTimestamps = data.timestamps.filter((t) => now - t < windowMs);
      const oldestTimestamp = validTimestamps[0];
      const resetMs = oldestTimestamp ? Math.max(0, windowMs - (now - oldestTimestamp)) : windowMs;

      return { count: validTimestamps.length, resetMs };
    },

    /**
     * Stop the cleanup interval (for graceful shutdown)
     */
    stop(): void {
      clearInterval(cleanupInterval);
    },
  };
}
