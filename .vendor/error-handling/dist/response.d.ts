import { NextResponse } from 'next/server';

/**
 * @runwell/error-handling — Response Helpers
 *
 * Standardized API response formatters for Next.js API routes.
 * Logger is injectable via options (not hardcoded).
 */

interface ResponseMeta {
    timestamp: string;
    correlationId?: string;
    [key: string]: unknown;
}
interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    meta: ResponseMeta;
}
interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        correlationId?: string;
        details?: Record<string, unknown>;
        retryAfter?: number;
    };
}
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
interface Logger {
    error(message: string, meta?: Record<string, unknown>): void;
    warn?(message: string, meta?: Record<string, unknown>): void;
}
interface SuccessResponseOptions {
    correlationId?: string;
    meta?: Record<string, unknown>;
    status?: number;
}
interface ErrorResponseOptions {
    correlationId?: string;
    logger?: Logger;
}
/**
 * Create a standardized success response.
 */
declare function successResponse<T>(data: T, options?: SuccessResponseOptions): NextResponse<ApiSuccessResponse<T>>;
/**
 * Create a standardized error response.
 * Handles both AppError instances and unknown errors.
 *
 * Supports two call signatures for backward compatibility:
 *   errorResponse(error, 'correlation-id')
 *   errorResponse(error, { correlationId, logger })
 */
declare function errorResponse(error: unknown, optionsOrCorrelationId?: string | ErrorResponseOptions): NextResponse<ApiErrorResponse>;
/**
 * Create a not found response.
 */
declare function notFoundResponse(resource: string, correlationId?: string): NextResponse<ApiErrorResponse>;
/**
 * Create an unauthorized response.
 */
declare function unauthorizedResponse(message?: string, correlationId?: string): NextResponse<ApiErrorResponse>;
/**
 * Create a forbidden response.
 */
declare function forbiddenResponse(message?: string, correlationId?: string): NextResponse<ApiErrorResponse>;
/**
 * Create a validation error response.
 */
declare function validationErrorResponse(message: string, details?: Record<string, unknown>, correlationId?: string): NextResponse<ApiErrorResponse>;

export { type ApiErrorResponse, type ApiResponse, type ApiSuccessResponse, type ErrorResponseOptions, type Logger, type ResponseMeta, type SuccessResponseOptions, errorResponse, forbiddenResponse, notFoundResponse, successResponse, unauthorizedResponse, validationErrorResponse };
