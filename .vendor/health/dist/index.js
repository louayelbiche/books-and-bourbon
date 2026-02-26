export { prismaCheck, redisCheck, seedFreshnessCheck } from './checks.js';
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
export function createHealthCheck(options) {
    return async function GET() {
        const checks = {};
        const errors = [];
        for (const check of options.checks ?? []) {
            const start = performance.now();
            try {
                const result = await check.check();
                result.latencyMs = Math.round(performance.now() - start);
                checks[check.name] = result;
            }
            catch (err) {
                const elapsed = Math.round(performance.now() - start);
                const message = err instanceof Error ? err.message : String(err);
                checks[check.name] = {
                    status: 'fail',
                    latencyMs: elapsed,
                    message,
                };
                errors.push(`${check.name}: ${message}`);
            }
        }
        // Status roll-up: fail > warn > pass
        const statuses = Object.values(checks).map((c) => c.status);
        const status = statuses.includes('fail')
            ? 'unhealthy'
            : statuses.includes('warn')
                ? 'degraded'
                : 'healthy';
        const httpStatus = status === 'unhealthy' ? 503 : 200;
        const response = {
            status,
            project: options.projectName,
            version: options.version,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
            ...(errors.length > 0 && { errors }),
        };
        return Response.json(response, {
            status: httpStatus,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    };
}
//# sourceMappingURL=index.js.map