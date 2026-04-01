/**
 * @runwell/error-handling — Circuit Breaker
 *
 * Protects external service calls from cascading failures.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing recovery)
 * Logger is injectable via options (not hardcoded).
 */

import { CircuitOpenError } from "./index.js";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerLogger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
  onStateChange?: (
    from: CircuitState,
    to: CircuitState,
    name: string
  ) => void;
  logger?: CircuitBreakerLogger;
}

export interface CircuitStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  nextAttempt: Date | null;
  totalRequests: number;
  totalFailures: number;
}

const defaultOptions: Omit<CircuitBreakerOptions, "name"> = {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenRequests: 3,
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;
  private lastSuccess: Date | null = null;
  private halfOpenAttempts = 0;
  private totalRequests = 0;
  private totalFailures = 0;

  private readonly options: CircuitBreakerOptions;
  private readonly log: CircuitBreakerLogger;

  constructor(options: Partial<CircuitBreakerOptions> & { name: string }) {
    this.options = { ...defaultOptions, ...options };
    this.log = this.options.logger ?? {};
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    if (this.state === "open") {
      if (this.shouldAttemptReset()) {
        this.transitionTo("half-open");
        this.halfOpenAttempts = 0;
      } else {
        if (fallback) {
          this.log.debug?.(
            `Circuit ${this.options.name}: using fallback (open)`
          );
          return fallback();
        }
        throw new CircuitOpenError(this.options.name);
      }
    }

    if (
      this.state === "half-open" &&
      this.halfOpenAttempts >= this.options.halfOpenRequests
    ) {
      if (fallback) {
        this.log.debug?.(
          `Circuit ${this.options.name}: using fallback (half-open limit)`
        );
        return fallback();
      }
      throw new CircuitOpenError(this.options.name);
    }

    if (this.state === "half-open") {
      this.halfOpenAttempts++;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);

      if (this.state === "open" && fallback) {
        this.log.debug?.(
          `Circuit ${this.options.name}: using fallback after failure`
        );
        return fallback();
      }

      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccess = new Date();

    if (this.state === "half-open") {
      if (this.successes >= this.options.halfOpenRequests) {
        this.reset();
        this.log.info?.(
          `Circuit ${this.options.name}: closed (recovered)`
        );
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(error: unknown): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailure = new Date();

    this.log.warn?.(`Circuit ${this.options.name}: failure recorded`, {
      failures: this.failures,
      threshold: this.options.failureThreshold,
      error: error instanceof Error ? error.message : String(error),
    });

    if (this.failures >= this.options.failureThreshold) {
      this.transitionTo("open");
      this.log.error?.(
        `Circuit ${this.options.name}: opened after ${this.failures} failures`
      );
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailure) return false;
    const elapsed = Date.now() - this.lastFailure.getTime();
    return elapsed >= this.options.resetTimeout;
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.options.onStateChange?.(oldState, newState, this.options.name);
    }
  }

  private reset(): void {
    this.transitionTo("closed");
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
  }

  forceOpen(): void {
    this.transitionTo("open");
    this.lastFailure = new Date();
    this.log.warn?.(`Circuit ${this.options.name}: forced open`);
  }

  forceClose(): void {
    this.reset();
    this.log.info?.(`Circuit ${this.options.name}: forced closed`);
  }

  getStats(): CircuitStats {
    return {
      name: this.options.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextAttempt: this.lastFailure
        ? new Date(this.lastFailure.getTime() + this.options.resetTimeout)
        : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  isOpen(): boolean {
    return this.state === "open";
  }

  isClosed(): boolean {
    return this.state === "closed";
  }
}

/**
 * Create a new circuit breaker with custom options.
 */
export function createCircuitBreaker(
  options: Partial<CircuitBreakerOptions> & { name: string }
): CircuitBreaker {
  return new CircuitBreaker(options);
}
