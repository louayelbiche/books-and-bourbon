/**
 * @runwell/error-handling — Correlation ID
 *
 * Request tracing via correlation IDs for debugging and log aggregation.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Header name for correlation ID.
 */
export const CORRELATION_ID_HEADER = "x-correlation-id";

/**
 * Generate a short unique ID for correlation.
 */
function generateId(): string {
  return crypto.randomUUID().slice(0, 12);
}

/**
 * Get or generate a correlation ID from a request.
 */
export function getCorrelationId(request: NextRequest): string {
  return request.headers.get(CORRELATION_ID_HEADER) ?? generateId();
}

/**
 * Add correlation ID header to a response.
 */
export function addCorrelationIdHeader(
  response: NextResponse,
  correlationId: string
): NextResponse {
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

/**
 * Handler type with correlation ID.
 */
export type CorrelationHandler = (
  request: NextRequest,
  correlationId: string
) => Promise<NextResponse>;

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
export function withCorrelationId(handler: CorrelationHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const correlationId = getCorrelationId(request);

    try {
      const response = await handler(request, correlationId);
      return addCorrelationIdHeader(response, correlationId);
    } catch (error) {
      if (error instanceof Error) {
        (error as Error & { correlationId?: string }).correlationId =
          correlationId;
      }
      throw error;
    }
  };
}

/**
 * Context type for route handlers that need params.
 */
export interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Handler type with correlation ID and route params.
 */
export type CorrelationHandlerWithParams = (
  request: NextRequest,
  context: RouteContext,
  correlationId: string
) => Promise<NextResponse>;

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
export function withCorrelationIdAndParams(
  handler: CorrelationHandlerWithParams
) {
  return async (
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> => {
    const correlationId = getCorrelationId(request);

    try {
      const response = await handler(request, context, correlationId);
      return addCorrelationIdHeader(response, correlationId);
    } catch (error) {
      if (error instanceof Error) {
        (error as Error & { correlationId?: string }).correlationId =
          correlationId;
      }
      throw error;
    }
  };
}

/**
 * Create a correlation ID for non-HTTP contexts (e.g., background jobs).
 */
export function createCorrelationId(): string {
  return generateId();
}
