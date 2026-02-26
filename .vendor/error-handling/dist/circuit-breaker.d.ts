/**
 * @runwell/error-handling — Circuit Breaker
 *
 * Protects external service calls from cascading failures.
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing recovery)
 * Logger is injectable via options (not hardcoded).
 */
type CircuitState = "closed" | "open" | "half-open";
interface CircuitBreakerLogger {
    debug?(message: string, meta?: Record<string, unknown>): void;
    info?(message: string, meta?: Record<string, unknown>): void;
    warn?(message: string, meta?: Record<string, unknown>): void;
    error?(message: string, meta?: Record<string, unknown>): void;
}
interface CircuitBreakerOptions {
    name: string;
    failureThreshold: number;
    resetTimeout: number;
    halfOpenRequests: number;
    onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
    logger?: CircuitBreakerLogger;
}
interface CircuitStats {
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
declare class CircuitBreaker {
    private state;
    private failures;
    private successes;
    private lastFailure;
    private lastSuccess;
    private halfOpenAttempts;
    private totalRequests;
    private totalFailures;
    private readonly options;
    private readonly log;
    constructor(options: Partial<CircuitBreakerOptions> & {
        name: string;
    });
    execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private shouldAttemptReset;
    private transitionTo;
    private reset;
    forceOpen(): void;
    forceClose(): void;
    getStats(): CircuitStats;
    isOpen(): boolean;
    isClosed(): boolean;
}
/**
 * Create a new circuit breaker with custom options.
 */
declare function createCircuitBreaker(options: Partial<CircuitBreakerOptions> & {
    name: string;
}): CircuitBreaker;

export { CircuitBreaker, type CircuitBreakerLogger, type CircuitBreakerOptions, type CircuitState, type CircuitStats, createCircuitBreaker };
