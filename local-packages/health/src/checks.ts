import type { HealthCheck, CheckResult } from './types.js';

// Allowlist of valid table/column identifiers for $queryRawUnsafe.
// Only PostgreSQL-safe identifiers are accepted (letters, digits, underscores).
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

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
export function prismaCheck(prisma: {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
}): HealthCheck {
  return {
    name: 'database',
    check: async (): Promise<CheckResult> => {
      await prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'pass', message: 'Database connection OK' };
    },
  };
}

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
export function redisCheck(redisUrl: string): HealthCheck {
  return {
    name: 'redis',
    check: async (): Promise<CheckResult> => {
      // Dynamic import — ioredis is an optional peer dependency, not bundled.
      // We use a string variable to prevent TypeScript from resolving the module
      // at compile time. The consuming project must have ioredis installed.
      let RedisConstructor: { new (url: string): RedisClient };
      try {
        const moduleName = 'ioredis';
        const mod = await (Function(
          'moduleName',
          'return import(moduleName)',
        )(moduleName) as Promise<{ default?: { new (url: string): RedisClient } }>);
        RedisConstructor = mod.default as { new (url: string): RedisClient };
      } catch {
        return {
          status: 'fail',
          message:
            'ioredis not installed. Add it as a dependency to use redisCheck.',
        };
      }

      const client = new RedisConstructor(redisUrl);
      try {
        const pong = await client.ping();
        if (pong !== 'PONG') {
          return {
            status: 'warn',
            message: `Redis PING returned unexpected: ${pong}`,
          };
        }
        return { status: 'pass', message: 'Redis connection OK' };
      } finally {
        await client.quit().catch(() => {
          // Swallow quit errors — connection may already be closed
        });
      }
    },
  };
}

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
export function seedFreshnessCheck(
  prisma: { $queryRawUnsafe: (query: string) => Promise<unknown> },
  options: {
    table: string;
    dateColumn: string;
    maxStaleDays: number;
  },
): HealthCheck {
  const { table, dateColumn, maxStaleDays } = options;

  // Validate identifiers against strict pattern to prevent SQL injection.
  // Only safe PostgreSQL identifiers are allowed (no special chars, no quotes).
  if (!IDENTIFIER_RE.test(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  if (!IDENTIFIER_RE.test(dateColumn)) {
    throw new Error(`Invalid column name: ${dateColumn}`);
  }

  return {
    name: `seed-freshness:${table}`,
    check: async (): Promise<CheckResult> => {
      // Table and column names are validated above against IDENTIFIER_RE.
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT MAX("${dateColumn}") as "maxDate" FROM "${table}"`,
      )) as Array<{ maxDate: Date | string | null }>;

      const maxDate = rows[0]?.maxDate;

      if (!maxDate) {
        return {
          status: 'fail',
          message: `No records found in ${table}.${dateColumn}`,
          details: { table, dateColumn },
        };
      }

      const latestDate = new Date(maxDate);
      const now = new Date();
      const staleDays = Math.floor(
        (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (staleDays > maxStaleDays) {
        return {
          status: 'warn',
          message: `${table} seed data is ${staleDays} days stale (threshold: ${maxStaleDays})`,
          details: {
            table,
            dateColumn,
            latestDate: latestDate.toISOString(),
            staleDays,
            maxStaleDays,
          },
        };
      }

      return {
        status: 'pass',
        message: `${table} seed data is fresh (${staleDays} days old)`,
        details: {
          table,
          dateColumn,
          latestDate: latestDate.toISOString(),
          staleDays,
          maxStaleDays,
        },
      };
    },
  };
}

// --------------------------------------------------------------------------
// Internal type for dynamic ioredis import (avoids hard dependency)
// --------------------------------------------------------------------------
interface RedisClient {
  ping: () => Promise<string>;
  quit: () => Promise<string>;
}
