/**
 * @runwell/error-handling — Error Classes
 *
 * Base error classes for standardized error handling.
 * All errors include error codes, HTTP status, and correlation ID support.
 */

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  [key: string]: unknown;
}

export interface AppErrorParams {
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
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly correlationId?: string;
  readonly details?: ErrorDetails;
  readonly timestamp: string;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.isOperational = params.isOperational ?? true;
    this.correlationId = params.correlationId;
    this.details = params.details;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  get userMessage(): string {
    return this.message;
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        ...(this.correlationId && { correlationId: this.correlationId }),
        ...(this.details &&
          Object.keys(this.details).length > 0 && { details: this.details }),
      },
    };
  }
}

/**
 * Authentication error (401).
 */
export class AuthenticationError extends AppError {
  constructor(
    message = "Authentication required",
    code = "ERR-AUTH-001",
    details?: ErrorDetails
  ) {
    super({ message, code, statusCode: 401, details });
  }
}

/**
 * Authorization error (403).
 */
export class AuthorizationError extends AppError {
  constructor(
    message = "Insufficient permissions",
    code = "ERR-AUTH-004",
    details?: ErrorDetails
  ) {
    super({ message, code, statusCode: 403, details });
  }
}

/**
 * Input validation error (400).
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      message,
      code: "ERR-VAL-001",
      statusCode: 400,
      details,
    });
  }
}

/**
 * Rate limit error (429).
 */
export class RateLimitError extends AppError {
  readonly retryAfter: number;

  constructor(
    retryAfter = 60,
    code = "ERR-RATE-001",
    message = "Rate limit exceeded"
  ) {
    super({ message, code, statusCode: 429 });
    this.retryAfter = retryAfter;
  }

  get userMessage(): string {
    return `Please wait ${this.retryAfter} seconds before trying again.`;
  }

  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      error: {
        ...base.error,
        retryAfter: this.retryAfter,
      },
    };
  }
}

/**
 * Resource not found error (404).
 */
export class NotFoundError extends AppError {
  readonly resource: string;

  constructor(resource: string) {
    super({
      message: `${resource} not found`,
      code: "ERR-DB-003",
      statusCode: 404,
    });
    this.resource = resource;
  }
}

/**
 * Duplicate resource error (409).
 */
export class DuplicateError extends AppError {
  constructor(resource: string, details?: ErrorDetails) {
    super({
      message: `${resource} already exists`,
      code: "ERR-DB-004",
      statusCode: 409,
      details,
    });
  }
}

/**
 * External service error (502).
 */
export class ExternalServiceError extends AppError {
  readonly service: string;

  constructor(service: string, message?: string, code = "ERR-EXT-001") {
    super({
      message: message ?? `${service} service error`,
      code,
      statusCode: 502,
    });
    this.service = service;
  }

  get userMessage(): string {
    return "External service temporarily unavailable. Please try again.";
  }
}

/**
 * Default user-facing message map for AI service errors by HTTP status.
 */
const DEFAULT_AI_MESSAGE_MAP: Record<number, string> = {
  429: "AI rate limit exceeded — please wait a moment and retry.",
  401: "AI API key is invalid or expired.",
  403: "AI API key is invalid or expired.",
  400: "AI request was malformed.",
};

export interface AIServiceErrorOptions {
  status?: number;
  detail?: string;
  messageMap?: Record<number, string>;
}

/**
 * AI service error (502).
 * Enhanced with GeminiError's userMessage mapping pattern.
 */
export class AIServiceError extends AppError {
  readonly service: string;
  readonly originalStatus?: number;
  private readonly _messageMap: Record<number, string>;
  private readonly _detail?: string;

  constructor(
    service = "AI",
    message?: string,
    code = "ERR-AI-001",
    options?: AIServiceErrorOptions
  ) {
    const statusCode = options?.status
      ? options.status >= 500
        ? options.status
        : 502
      : 502;
    super({
      message: message ?? `${service} service error`,
      code,
      statusCode,
    });
    this.service = service;
    this.originalStatus = options?.status;
    this._messageMap = { ...DEFAULT_AI_MESSAGE_MAP, ...options?.messageMap };
    this._detail = options?.detail;
  }

  get userMessage(): string {
    if (this.originalStatus && this._messageMap[this.originalStatus]) {
      return this._messageMap[this.originalStatus];
    }
    if (this.message.includes("not configured"))
      return `${this.service} API key is not configured.`;
    if (this.message.includes("timed out") || this.message.includes("AbortError"))
      return `${this.service} request timed out — please retry.`;
    if (this.message.includes("Empty"))
      return `${this.service} returned an empty response — please retry.`;
    return `${this.service} service encountered an error. Please try again.`;
  }
}

/**
 * Circuit breaker open error (503).
 */
export class CircuitOpenError extends AppError {
  readonly circuitName: string;

  constructor(circuitName: string) {
    super({
      message: `Circuit breaker '${circuitName}' is open`,
      code: "ERR-EXT-004",
      statusCode: 503,
    });
    this.circuitName = circuitName;
  }

  get userMessage(): string {
    return "Service temporarily unavailable. Please try again later.";
  }
}

/**
 * Database error (500).
 */
export class DatabaseError extends AppError {
  constructor(message = "Database operation failed", code = "ERR-DB-002") {
    super({
      message,
      code,
      statusCode: 500,
      isOperational: false,
    });
  }

  get userMessage(): string {
    return "An error occurred. Please try again.";
  }
}

/**
 * Timeout error (504).
 */
export class TimeoutError extends AppError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, message?: string) {
    super({
      message: message ?? `Operation timed out after ${timeoutMs}ms`,
      code: "ERR-SYS-002",
      statusCode: 504,
    });
    this.timeoutMs = timeoutMs;
  }

  get userMessage(): string {
    return "The request timed out. Please try again.";
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected).
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
