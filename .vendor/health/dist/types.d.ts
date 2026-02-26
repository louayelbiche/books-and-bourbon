/**
 * Configuration options for the health check factory.
 */
export interface HealthCheckOptions {
    /** Display name of the project (e.g. "inventory-intelligence") */
    projectName: string;
    /** Semver version string (e.g. "0.1.0") */
    version: string;
    /** Optional list of dependency checks to run (DB, Redis, seed freshness, etc.) */
    checks?: HealthCheck[];
}
/**
 * A single named health check that produces a result.
 */
export interface HealthCheck {
    /** Human-readable name for this check (e.g. "database", "redis", "seed-freshness") */
    name: string;
    /** Async function that performs the check and returns a result */
    check: () => Promise<CheckResult>;
}
/**
 * Result of a single health check.
 */
export interface CheckResult {
    /** Pass/warn/fail status */
    status: 'pass' | 'warn' | 'fail';
    /** How long the check took in milliseconds (set automatically by the runner) */
    latencyMs?: number;
    /** Arbitrary structured details for debugging */
    details?: Record<string, unknown>;
    /** Human-readable message (especially useful for failures) */
    message?: string;
}
/**
 * Full health endpoint response payload.
 */
export interface HealthResponse {
    /** Rolled-up status: healthy (all pass), degraded (some warn), unhealthy (any fail) */
    status: 'healthy' | 'degraded' | 'unhealthy';
    /** Project name from options */
    project: string;
    /** Version from options */
    version: string;
    /** ISO 8601 timestamp of the check */
    timestamp: string;
    /** Process uptime in seconds */
    uptime: number;
    /** Map of check name to result */
    checks: Record<string, CheckResult>;
    /** Error messages from failed checks (only present if there are errors) */
    errors?: string[];
}
//# sourceMappingURL=types.d.ts.map