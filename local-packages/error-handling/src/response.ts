/**
 * @runwell/error-handling — Response Helpers
 *
 * Standardized API response formatters for Next.js API routes.
 * Logger is injectable via options (not hardcoded).
 */

import { NextResponse } from "next/server";
import { AppError, RateLimitError, isAppError } from "./index.js";

export interface ResponseMeta {
  timestamp: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId?: string;
    details?: Record<string, unknown>;
    retryAfter?: number;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
}

export interface SuccessResponseOptions {
  correlationId?: string;
  meta?: Record<string, unknown>;
  status?: number;
}

export interface ErrorResponseOptions {
  correlationId?: string;
  logger?: Logger;
}

/**
 * Create a standardized success response.
 */
export function successResponse<T>(
  data: T,
  options?: SuccessResponseOptions
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(options?.correlationId && { correlationId: options.correlationId }),
      ...(options?.meta || {}),
    },
  };

  return NextResponse.json(response, { status: options?.status ?? 200 });
}

/**
 * Create a standardized error response.
 * Handles both AppError instances and unknown errors.
 *
 * Supports two call signatures for backward compatibility:
 *   errorResponse(error, 'correlation-id')
 *   errorResponse(error, { correlationId, logger })
 */
export function errorResponse(
  error: unknown,
  optionsOrCorrelationId?: string | ErrorResponseOptions
): NextResponse<ApiErrorResponse> {
  const correlationId =
    typeof optionsOrCorrelationId === "string"
      ? optionsOrCorrelationId
      : optionsOrCorrelationId?.correlationId;
  const logger =
    typeof optionsOrCorrelationId === "object"
      ? optionsOrCorrelationId?.logger
      : undefined;

  if (isAppError(error)) {
    if (correlationId) {
      (error as { correlationId?: string }).correlationId = correlationId;
    }

    logger?.error(error.message, {
      code: error.code,
      correlationId,
      details: error.details,
      isOperational: error.isOperational,
    });

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        ...(correlationId && { correlationId }),
        ...(error.details &&
          Object.keys(error.details).length > 0 && {
            details: error.details,
          }),
      },
    };

    if (error instanceof RateLimitError) {
      response.error.retryAfter = error.retryAfter;
    }

    const headers: Record<string, string> = {};
    if (error instanceof RateLimitError) {
      headers["Retry-After"] = String(error.retryAfter);
    }

    return NextResponse.json(response, {
      status: error.statusCode,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }

  // Unknown errors — log full details, return generic message
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger?.error("Unhandled error", {
    error: errorMessage,
    stack: errorStack,
    correlationId,
    type: (error as { constructor?: { name?: string } })?.constructor?.name,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-SYS-001",
        message: "An unexpected error occurred",
        ...(correlationId && { correlationId }),
      },
    },
    { status: 500 }
  );
}

/**
 * Create a not found response.
 */
export function notFoundResponse(
  resource: string,
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-DB-003",
        message: `${resource} not found`,
        ...(correlationId && { correlationId }),
      },
    },
    { status: 404 }
  );
}

/**
 * Create an unauthorized response.
 */
export function unauthorizedResponse(
  message = "Authentication required",
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-AUTH-001",
        message,
        ...(correlationId && { correlationId }),
      },
    },
    { status: 401 }
  );
}

/**
 * Create a forbidden response.
 */
export function forbiddenResponse(
  message = "Insufficient permissions",
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-AUTH-004",
        message,
        ...(correlationId && { correlationId }),
      },
    },
    { status: 403 }
  );
}

/**
 * Create a validation error response.
 */
export function validationErrorResponse(
  message: string,
  details?: Record<string, unknown>,
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-VAL-001",
        message,
        ...(correlationId && { correlationId }),
        ...(details && { details }),
      },
    },
    { status: 400 }
  );
}
