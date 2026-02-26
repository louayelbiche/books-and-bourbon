/**
 * @runwell/error-handling — Error Classes
 *
 * Base error classes for standardized error handling.
 * All errors include error codes, HTTP status, and correlation ID support.
 */
interface ErrorDetails {
    field?: string;
    value?: unknown;
    [key: string]: unknown;
}
interface AppErrorParams {
    message: string;
    code: string;
    statusCode?: number;
    isOperational?: boolean;
    correlationId?: string;
    details?: ErrorDetails;
}
/**
 * Base application error class.
 * All custom errors should extend this class.
 */
declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly correlationId?: string;
    readonly details?: ErrorDetails;
    readonly timestamp: string;
    constructor(params: AppErrorParams);
    get userMessage(): string;
    toJSON(): {
        success: boolean;
        error: {
            details?: ErrorDetails | undefined;
            correlationId?: string | undefined;
            code: string;
            message: string;
        };
    };
}
/**
 * Authentication error (401).
 */
declare class AuthenticationError extends AppError {
    constructor(message?: string, code?: string, details?: ErrorDetails);
}
/**
 * Authorization error (403).
 */
declare class AuthorizationError extends AppError {
    constructor(message?: string, code?: string, details?: ErrorDetails);
}
/**
 * Input validation error (400).
 */
declare class ValidationError extends AppError {
    constructor(message: string, details?: ErrorDetails);
}
/**
 * Rate limit error (429).
 */
declare class RateLimitError extends AppError {
    readonly retryAfter: number;
    constructor(retryAfter?: number, code?: string, message?: string);
    get userMessage(): string;
    toJSON(): {
        error: {
            retryAfter: number;
            details?: ErrorDetails | undefined;
            correlationId?: string | undefined;
            code: string;
            message: string;
        };
        success: boolean;
    };
}
/**
 * Resource not found error (404).
 */
declare class NotFoundError extends AppError {
    readonly resource: string;
    constructor(resource: string);
}
/**
 * Duplicate resource error (409).
 */
declare class DuplicateError extends AppError {
    constructor(resource: string, details?: ErrorDetails);
}
/**
 * External service error (502).
 */
declare class ExternalServiceError extends AppError {
    readonly service: string;
    constructor(service: string, message?: string, code?: string);
    get userMessage(): string;
}
interface AIServiceErrorOptions {
    status?: number;
    detail?: string;
    messageMap?: Record<number, string>;
}
/**
 * AI service error (502).
 * Enhanced with GeminiError's userMessage mapping pattern.
 */
declare class AIServiceError extends AppError {
    readonly service: string;
    readonly originalStatus?: number;
    private readonly _messageMap;
    private readonly _detail?;
    constructor(service?: string, message?: string, code?: string, options?: AIServiceErrorOptions);
    get userMessage(): string;
}
/**
 * Circuit breaker open error (503).
 */
declare class CircuitOpenError extends AppError {
    readonly circuitName: string;
    constructor(circuitName: string);
    get userMessage(): string;
}
/**
 * Database error (500).
 */
declare class DatabaseError extends AppError {
    constructor(message?: string, code?: string);
    get userMessage(): string;
}
/**
 * Timeout error (504).
 */
declare class TimeoutError extends AppError {
    readonly timeoutMs: number;
    constructor(timeoutMs: number, message?: string);
    get userMessage(): string;
}
/**
 * Type guard to check if an error is an AppError.
 */
declare function isAppError(error: unknown): error is AppError;
/**
 * Type guard to check if an error is operational (expected).
 */
declare function isOperationalError(error: unknown): boolean;

export { AIServiceError, type AIServiceErrorOptions, AppError, type AppErrorParams, AuthenticationError, AuthorizationError, CircuitOpenError, DatabaseError, DuplicateError, type ErrorDetails, ExternalServiceError, NotFoundError, RateLimitError, TimeoutError, ValidationError, isAppError, isOperationalError };
