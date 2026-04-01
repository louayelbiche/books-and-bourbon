/**
 * Prisma logging helpers
 *
 * Provides log config and slow query detection extension.
 */

import { createLogger } from './index';

const logger = createLogger('prisma');

type PrismaLogLevel = 'query' | 'error' | 'warn' | 'info';

/**
 * Returns Prisma log config based on environment.
 * - Development: logs queries, errors, warnings
 * - Production: logs errors only
 *
 * @example
 * ```ts
 * import { getPrismaLogConfig } from '@runwell/logger/prisma';
 *
 * const prisma = new PrismaClient({
 *   log: getPrismaLogConfig(),
 * });
 * ```
 */
export function getPrismaLogConfig(): PrismaLogLevel[] {
  if (process.env.NODE_ENV === 'development') {
    return ['query', 'error', 'warn'];
  }
  return ['error'];
}

/**
 * Creates a Prisma $extends config for slow query detection.
 * Logs a warning when any query exceeds the threshold.
 *
 * @example
 * ```ts
 * import { createSlowQueryExtension } from '@runwell/logger/prisma';
 *
 * const prisma = new PrismaClient().extends(createSlowQueryExtension());
 * ```
 */
export function createSlowQueryExtension(thresholdMs = 1000) {
  return {
    query: {
      $allModels: {
        async $allOperations({
          operation,
          model,
          args,
          query,
        }: {
          operation: string;
          model: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          const start = Date.now();
          const result = await query(args);
          const duration = Date.now() - start;

          if (duration > thresholdMs) {
            logger.warn('Slow database query detected', {
              model,
              operation,
              duration_ms: duration,
              args: process.env.NODE_ENV === 'development' ? (args as Record<string, unknown>) : undefined,
            });
          }

          return result;
        },
      },
    },
  };
}
