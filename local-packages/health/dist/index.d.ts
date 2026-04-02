export type { HealthCheckOptions, HealthCheck, CheckResult, HealthResponse, } from './types.js';
export { prismaCheck, redisCheck, seedFreshnessCheck } from './checks.js';
import type { HealthCheckOptions } from './types.js';
/**
 * Factory that creates a Next.js App Router GET handler for health checks.
 *
 * Runs all configured checks in sequence, rolls up their statuses,
 * and returns a standardized JSON response.
 *
 * - All checks pass  -> 200 `{ status: "healthy" }`
 * - Any check warns  -> 200 `{ status: "degraded" }`
 * - Any check fails  -> 503 `{ status: "unhealthy" }`
 *
 * @param options - Project name, version, and optional dependency checks
 * @returns An async `GET` function suitable for `export { GET }` in a route.ts
 *
 * @example
 * ```typescript
 * // app/api/health/route.ts
 * import { createHealthCheck, prismaCheck } from '@runwell/health';
 * import { prisma } from '@/lib/prisma';
 * import { version } from '../../../package.json';
 *
 * export const GET = createHealthCheck({
 *   projectName: 'inventory-intelligence',
 *   version,
 *   checks: [prismaCheck(prisma)],
 * });
 * ```
 */
export declare function createHealthCheck(options: HealthCheckOptions): () => Promise<Response>;
//# sourceMappingURL=index.d.ts.map