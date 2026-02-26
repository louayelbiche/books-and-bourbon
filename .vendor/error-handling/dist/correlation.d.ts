import { NextRequest, NextResponse } from 'next/server';

/**
 * @runwell/error-handling — Correlation ID
 *
 * Request tracing via correlation IDs for debugging and log aggregation.
 */

/**
 * Header name for correlation ID.
 */
declare const CORRELATION_ID_HEADER = "x-correlation-id";
/**
 * Get or generate a correlation ID from a request.
 */
declare function getCorrelationId(request: NextRequest): string;
/**
 * Add correlation ID header to a response.
 */
declare function addCorrelationIdHeader(response: NextResponse, correlationId: string): NextResponse;
/**
 * Handler type with correlation ID.
 */
type CorrelationHandler = (request: NextRequest, correlationId: string) => Promise<NextResponse>;
/**
 * Higher-order function to wrap API route handlers with correlation ID.
 *
 * Usage:
 * ```typescript
 * export const GET = withCorrelationId(async (req, correlationId) => {
 *   return successResponse(data, { correlationId });
 * });
 * ```
 */
declare function withCorrelationId(handler: CorrelationHandler): (request: NextRequest) => Promise<NextResponse>;
/**
 * Context type for route handlers that need params.
 */
interface RouteContext {
    params: Promise<Record<string, string>>;
}
/**
 * Handler type with correlation ID and route params.
 */
type CorrelationHandlerWithParams = (request: NextRequest, context: RouteContext, correlationId: string) => Promise<NextResponse>;
/**
 * Higher-order function for routes with params (e.g., /api/items/[id]).
 *
 * Usage:
 * ```typescript
 * export const GET = withCorrelationIdAndParams(async (req, ctx, correlationId) => {
 *   const { id } = await ctx.params;
 *   return successResponse(data, { correlationId });
 * });
 * ```
 */
declare function withCorrelationIdAndParams(handler: CorrelationHandlerWithParams): (request: NextRequest, context: RouteContext) => Promise<NextResponse>;
/**
 * Create a correlation ID for non-HTTP contexts (e.g., background jobs).
 */
declare function createCorrelationId(): string;

export { CORRELATION_ID_HEADER, type CorrelationHandler, type CorrelationHandlerWithParams, type RouteContext, addCorrelationIdHeader, createCorrelationId, getCorrelationId, withCorrelationId, withCorrelationIdAndParams };
