/**
 * Rate Limiter
 *
 * Implements sliding window rate limiting for:
 * - Per-session request limits
 * - Per-IP request limits
 * - Burst protection
 * - Configurable time windows
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Burst allowance (extra requests allowed in short burst) */
  burstAllowance?: number;
  /** Burst window in milliseconds */
  burstWindowMs?: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Requests remaining in current window */
  remaining: number;
  /** Time until window resets (ms) */
  resetInMs: number;
  /** Current request count in window */
  current: number;
  /** Limit that was applied */
  limit: number;
  /** Retry after (seconds) - only if not allowed */
  retryAfter?: number;
}

/**
 * Rate limiter statistics
 */
export interface RateLimiterStats {
  /** Total requests tracked */
  totalRequests: number;
  /** Requests blocked */
  blockedRequests: number;
  /** Active sessions being tracked */
  activeSessions: number;
  /** Active IPs being tracked */
  activeIPs: number;
}

/**
 * Internal tracking entry
 */
interface RateLimitEntry {
  /** Request timestamps in current window */
  timestamps: number[];
  /** Burst timestamps (separate tracking) */
  burstTimestamps: number[];
  /** Total blocked count */
  blockedCount: number;
}

const DEFAULT_SESSION_CONFIG: RateLimitConfig = {
  maxRequests: 60, // 60 requests per minute per session
  windowMs: 60 * 1000,
  burstAllowance: 10, // Allow 10 extra in burst
  burstWindowMs: 5 * 1000, // 5 second burst window
};

const DEFAULT_IP_CONFIG: RateLimitConfig = {
  maxRequests: 100, // 100 requests per minute per IP
  windowMs: 60 * 1000,
  burstAllowance: 20,
  burstWindowMs: 5 * 1000,
};

/**
 * Rate Limiter class
 *
 * Uses sliding window algorithm with optional burst protection.
 */
export class RateLimiter {
  private sessionLimits: Map<string, RateLimitEntry> = new Map();
  private ipLimits: Map<string, RateLimitEntry> = new Map();
  private sessionConfig: RateLimitConfig;
  private ipConfig: RateLimitConfig;
  private stats = {
    totalRequests: 0,
    blockedRequests: 0,
  };

  // Cleanup interval reference
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config?: {
    session?: Partial<RateLimitConfig>;
    ip?: Partial<RateLimitConfig>;
  }) {
    this.sessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config?.session };
    this.ipConfig = { ...DEFAULT_IP_CONFIG, ...config?.ip };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Check if a session request is allowed
   */
  checkSession(sessionId: string): RateLimitResult {
    return this.check(sessionId, this.sessionLimits, this.sessionConfig);
  }

  /**
   * Check if an IP request is allowed
   */
  checkIP(ip: string): RateLimitResult {
    // Normalize IP (handle IPv6 mapped IPv4)
    const normalizedIP = this.normalizeIP(ip);
    return this.check(normalizedIP, this.ipLimits, this.ipConfig);
  }

  /**
   * Check both session and IP limits
   * Returns the most restrictive result
   */
  checkBoth(sessionId: string, ip: string): RateLimitResult & { limitedBy?: 'session' | 'ip' } {
    const sessionResult = this.checkSession(sessionId);
    const ipResult = this.checkIP(ip);

    // If both are allowed, return the one with fewer remaining
    if (sessionResult.allowed && ipResult.allowed) {
      return sessionResult.remaining <= ipResult.remaining
        ? { ...sessionResult, limitedBy: undefined }
        : { ...ipResult, limitedBy: undefined };
    }

    // Return whichever is blocked (or both if both blocked)
    if (!sessionResult.allowed) {
      return { ...sessionResult, limitedBy: 'session' };
    }

    return { ...ipResult, limitedBy: 'ip' };
  }

  /**
   * Record a request (call after checkSession/checkIP returns allowed)
   */
  recordSession(sessionId: string): void {
    this.record(sessionId, this.sessionLimits);
  }

  /**
   * Record an IP request
   */
  recordIP(ip: string): void {
    const normalizedIP = this.normalizeIP(ip);
    this.record(normalizedIP, this.ipLimits);
  }

  /**
   * Record both session and IP
   */
  recordBoth(sessionId: string, ip: string): void {
    this.recordSession(sessionId);
    this.recordIP(ip);
  }

  /**
   * Check and record in one call (convenience method)
   * Returns result and records if allowed
   */
  consume(
    sessionId: string,
    ip?: string
  ): RateLimitResult & { limitedBy?: 'session' | 'ip' } {
    this.stats.totalRequests++;

    if (ip) {
      const result = this.checkBoth(sessionId, ip);
      if (result.allowed) {
        this.recordBoth(sessionId, ip);
      } else {
        this.stats.blockedRequests++;
      }
      return result;
    }

    const result = this.checkSession(sessionId);
    if (result.allowed) {
      this.recordSession(sessionId);
    } else {
      this.stats.blockedRequests++;
    }
    return result;
  }

  /**
   * Reset limits for a session
   */
  resetSession(sessionId: string): void {
    this.sessionLimits.delete(sessionId);
  }

  /**
   * Reset limits for an IP
   */
  resetIP(ip: string): void {
    const normalizedIP = this.normalizeIP(ip);
    this.ipLimits.delete(normalizedIP);
  }

  /**
   * Get current statistics
   */
  getStats(): RateLimiterStats {
    return {
      ...this.stats,
      activeSessions: this.sessionLimits.size,
      activeIPs: this.ipLimits.size,
    };
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): { requestsInWindow: number; blockedCount: number } | null {
    const entry = this.sessionLimits.get(sessionId);
    if (!entry) return null;

    const now = Date.now();
    const windowStart = now - this.sessionConfig.windowMs;
    const requestsInWindow = entry.timestamps.filter((t) => t > windowStart).length;

    return {
      requestsInWindow,
      blockedCount: entry.blockedCount,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();

    this.cleanupMap(this.sessionLimits, this.sessionConfig.windowMs, now);
    this.cleanupMap(this.ipLimits, this.ipConfig.windowMs, now);
  }

  /**
   * Stop the rate limiter (cleanup interval)
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private check(
    key: string,
    limits: Map<string, RateLimitEntry>,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = limits.get(key);
    if (!entry) {
      entry = { timestamps: [], burstTimestamps: [], blockedCount: 0 };
      limits.set(key, entry);
    }

    // Clean old timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    // Check burst limit if configured
    if (config.burstAllowance && config.burstWindowMs) {
      const burstStart = now - config.burstWindowMs;
      entry.burstTimestamps = entry.burstTimestamps.filter((t) => t > burstStart);

      // Check if in burst territory
      if (entry.timestamps.length >= config.maxRequests) {
        // Over base limit - check if burst allowance is exhausted
        const overBase = entry.timestamps.length - config.maxRequests;
        if (overBase >= config.burstAllowance) {
          entry.blockedCount++;
          const resetInMs = entry.timestamps[0] + config.windowMs - now;
          return {
            allowed: false,
            remaining: 0,
            resetInMs: Math.max(0, resetInMs),
            current: entry.timestamps.length,
            limit: config.maxRequests + config.burstAllowance,
            retryAfter: Math.ceil(resetInMs / 1000),
          };
        }
      }
    } else {
      // No burst - simple check
      if (entry.timestamps.length >= config.maxRequests) {
        entry.blockedCount++;
        const resetInMs = entry.timestamps[0] + config.windowMs - now;
        return {
          allowed: false,
          remaining: 0,
          resetInMs: Math.max(0, resetInMs),
          current: entry.timestamps.length,
          limit: config.maxRequests,
          retryAfter: Math.ceil(resetInMs / 1000),
        };
      }
    }

    const effectiveLimit = config.maxRequests + (config.burstAllowance || 0);
    const remaining = Math.max(0, effectiveLimit - entry.timestamps.length - 1);
    const resetInMs =
      entry.timestamps.length > 0 ? entry.timestamps[0] + config.windowMs - now : config.windowMs;

    return {
      allowed: true,
      remaining,
      resetInMs: Math.max(0, resetInMs),
      current: entry.timestamps.length,
      limit: effectiveLimit,
    };
  }

  private record(key: string, limits: Map<string, RateLimitEntry>): void {
    const now = Date.now();
    let entry = limits.get(key);

    if (!entry) {
      entry = { timestamps: [], burstTimestamps: [], blockedCount: 0 };
      limits.set(key, entry);
    }

    entry.timestamps.push(now);
    entry.burstTimestamps.push(now);
  }

  private normalizeIP(ip: string): string {
    // Handle IPv6-mapped IPv4 addresses
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  private cleanupMap(
    limits: Map<string, RateLimitEntry>,
    windowMs: number,
    now: number
  ): void {
    const cutoff = now - windowMs * 2; // Keep entries for 2x window for smoother transitions

    for (const [key, entry] of limits.entries()) {
      // Remove entries with no recent activity
      const latestTimestamp = Math.max(...entry.timestamps, 0);
      if (latestTimestamp < cutoff) {
        limits.delete(key);
      }
    }
  }

  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

/**
 * Create a rate limiter with custom configs
 */
export function createRateLimiter(config?: {
  session?: Partial<RateLimitConfig>;
  ip?: Partial<RateLimitConfig>;
}): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Strict rate limiter preset for public-facing agents
 */
export const STRICT_RATE_LIMIT_CONFIG = {
  session: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    burstAllowance: 5,
    burstWindowMs: 5 * 1000,
  },
  ip: {
    maxRequests: 50,
    windowMs: 60 * 1000,
    burstAllowance: 10,
    burstWindowMs: 5 * 1000,
  },
};

/**
 * Relaxed rate limiter preset for authenticated/internal agents
 */
export const RELAXED_RATE_LIMIT_CONFIG = {
  session: {
    maxRequests: 120,
    windowMs: 60 * 1000,
    burstAllowance: 30,
    burstWindowMs: 10 * 1000,
  },
  ip: {
    maxRequests: 200,
    windowMs: 60 * 1000,
    burstAllowance: 50,
    burstWindowMs: 10 * 1000,
  },
};
