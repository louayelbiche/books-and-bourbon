/**
 * API route logging wrapper for Next.js App Router
 */

import { createLogger, createTimer, logError, logRequest, type LogContext } from './index';

const logger = createLogger('api');

const EXCLUDED_PATHS = ['/api/health', '/_next', '/favicon.ico'];

type NextRequest = Request & { nextUrl?: URL };
type NextResponse = Response;
type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse> | NextResponse;

interface LogApiRouteOptions {
  /** Additional paths to exclude from logging */
  excludePaths?: string[];
  /** Module name for the logger (default: 'api') */
  module?: string;
}

/**
 * Wraps a Next.js route handler with structured request logging.
 * Logs method, path, status, and duration_ms for every request.
 * Reads/forwards x-request-id header for cross-service correlation.
 *
 * @example
 * ```ts
 * import { logApiRoute } from '@runwell/logger/request';
 *
 * export const GET = logApiRoute(async (req) => {
 *   return Response.json({ ok: true });
 * });
 * ```
 */
export function logApiRoute(handler: RouteHandler, options?: LogApiRouteOptions): RouteHandler {
  const excludePaths = [...EXCLUDED_PATHS, ...(options?.excludePaths || [])];
  const routeLogger = options?.module ? createLogger(options.module) : logger;

  return async (req: NextRequest, ctx?: unknown) => {
    const url = req.nextUrl || new URL(req.url);
    const path = url.pathname;

    // Skip excluded paths
    if (excludePaths.some((p) => path.startsWith(p))) {
      return handler(req, ctx);
    }

    // Read or generate request ID
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
    const timer = createTimer();

    const context: LogContext = {
      ...logRequest(req),
      requestId,
    };

    routeLogger.debug('Request received', context);

    try {
      const response = await handler(req, ctx);
      const durationMs = timer.elapsed();

      routeLogger.info('Request completed', {
        ...context,
        status: response.status,
        duration_ms: durationMs,
      });

      // Set request ID on response for correlation
      const headers = new Headers(response.headers);
      headers.set('x-request-id', requestId);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      const durationMs = timer.elapsed();

      routeLogger.error(
        'Request failed',
        {
          ...context,
          duration_ms: durationMs,
          ...logError(error),
        },
        error instanceof Error ? error : undefined,
      );

      throw error;
    }
  };
}
