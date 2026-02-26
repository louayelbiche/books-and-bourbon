import type { HealthCheck } from './types.js';
/**
 * Prisma database connectivity check.
 * Runs `SELECT 1` via `$queryRawUnsafe` to verify the database connection is alive.
 *
 * @param prisma - Any Prisma client instance (uses `$queryRawUnsafe`)
 * @returns A HealthCheck that verifies database connectivity
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma';
 * import { prismaCheck } from '@runwell/health';
 *
 * const healthChecks = [prismaCheck(prisma)];
 * ```
 */
export declare function prismaCheck(prisma: {
    $queryRawUnsafe: (query: string) => Promise<unknown>;
}): HealthCheck;
/**
 * Redis connectivity check.
 * Connects to the given Redis URL, sends a PING, and disconnects.
 *
 * Requires `ioredis` to be installed in the consuming project.
 * Uses dynamic import to avoid hard dependency.
 *
 * @param redisUrl - Redis connection URL (e.g. "redis://localhost:6379")
 * @returns A HealthCheck that verifies Redis connectivity
 *
 * @example
 * ```typescript
 * import { redisCheck } from '@runwell/health';
 *
 * const healthChecks = [redisCheck(process.env.REDIS_URL!)];
 * ```
 */
export declare function redisCheck(redisUrl: string): HealthCheck;
/**
 * Seed data freshness check.
 * Queries the most recent record in a given table/column and compares
 * it against a staleness threshold.
 *
 * Useful for demo/staging environments where seed data can become stale
 * and cause confusing UX (e.g. "last sale was 90 days ago").
 *
 * @param prisma - Any Prisma client instance (uses `$queryRawUnsafe`)
 * @param options - Configuration for the freshness check
 * @param options.table - Database table name to query
 * @param options.dateColumn - Column containing the date to check
 * @param options.maxStaleDays - Number of days after which data is considered stale
 * @returns A HealthCheck that verifies seed data freshness
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma';
 * import { seedFreshnessCheck } from '@runwell/health';
 *
 * const healthChecks = [
 *   seedFreshnessCheck(prisma, {
 *     table: 'Sale',
 *     dateColumn: 'createdAt',
 *     maxStaleDays: 7,
 *   }),
 * ];
 * ```
 */
export declare function seedFreshnessCheck(prisma: {
    $queryRawUnsafe: (query: string) => Promise<unknown>;
}, options: {
    table: string;
    dateColumn: string;
    maxStaleDays: number;
}): HealthCheck;
//# sourceMappingURL=checks.d.ts.map