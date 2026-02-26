// src/index.ts
var AppError = class extends Error {
  code;
  statusCode;
  isOperational;
  correlationId;
  details;
  timestamp;
  constructor(params) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.isOperational = params.isOperational ?? true;
    this.correlationId = params.correlationId;
    this.details = params.details;
    this.timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  get userMessage() {
    return this.message;
  }
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        ...this.correlationId && { correlationId: this.correlationId },
        ...this.details && Object.keys(this.details).length > 0 && { details: this.details }
      }
    };
  }
};
var AuthenticationError = class extends AppError {
  constructor(message = "Authentication required", code = "ERR-AUTH-001", details) {
    super({ message, code, statusCode: 401, details });
  }
};
var AuthorizationError = class extends AppError {
  constructor(message = "Insufficient permissions", code = "ERR-AUTH-004", details) {
    super({ message, code, statusCode: 403, details });
  }
};
var ValidationError = class extends AppError {
  constructor(message, details) {
    super({
      message,
      code: "ERR-VAL-001",
      statusCode: 400,
      details
    });
  }
};
var RateLimitError = class extends AppError {
  retryAfter;
  constructor(retryAfter = 60, code = "ERR-RATE-001", message = "Rate limit exceeded") {
    super({ message, code, statusCode: 429 });
    this.retryAfter = retryAfter;
  }
  get userMessage() {
    return `Please wait ${this.retryAfter} seconds before trying again.`;
  }
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      error: {
        ...base.error,
        retryAfter: this.retryAfter
      }
    };
  }
};
var NotFoundError = class extends AppError {
  resource;
  constructor(resource) {
    super({
      message: `${resource} not found`,
      code: "ERR-DB-003",
      statusCode: 404
    });
    this.resource = resource;
  }
};
var DuplicateError = class extends AppError {
  constructor(resource, details) {
    super({
      message: `${resource} already exists`,
      code: "ERR-DB-004",
      statusCode: 409,
      details
    });
  }
};
var ExternalServiceError = class extends AppError {
  service;
  constructor(service, message, code = "ERR-EXT-001") {
    super({
      message: message ?? `${service} service error`,
      code,
      statusCode: 502
    });
    this.service = service;
  }
  get userMessage() {
    return "External service temporarily unavailable. Please try again.";
  }
};
var DEFAULT_AI_MESSAGE_MAP = {
  429: "AI rate limit exceeded \u2014 please wait a moment and retry.",
  401: "AI API key is invalid or expired.",
  403: "AI API key is invalid or expired.",
  400: "AI request was malformed."
};
var AIServiceError = class extends AppError {
  service;
  originalStatus;
  _messageMap;
  _detail;
  constructor(service = "AI", message, code = "ERR-AI-001", options) {
    const statusCode = options?.status ? options.status >= 500 ? options.status : 502 : 502;
    super({
      message: message ?? `${service} service error`,
      code,
      statusCode
    });
    this.service = service;
    this.originalStatus = options?.status;
    this._messageMap = { ...DEFAULT_AI_MESSAGE_MAP, ...options?.messageMap };
    this._detail = options?.detail;
  }
  get userMessage() {
    if (this.originalStatus && this._messageMap[this.originalStatus]) {
      return this._messageMap[this.originalStatus];
    }
    if (this.message.includes("not configured"))
      return `${this.service} API key is not configured.`;
    if (this.message.includes("timed out") || this.message.includes("AbortError"))
      return `${this.service} request timed out \u2014 please retry.`;
    if (this.message.includes("Empty"))
      return `${this.service} returned an empty response \u2014 please retry.`;
    return `${this.service} service encountered an error. Please try again.`;
  }
};
var CircuitOpenError = class extends AppError {
  circuitName;
  constructor(circuitName) {
    super({
      message: `Circuit breaker '${circuitName}' is open`,
      code: "ERR-EXT-004",
      statusCode: 503
    });
    this.circuitName = circuitName;
  }
  get userMessage() {
    return "Service temporarily unavailable. Please try again later.";
  }
};
var DatabaseError = class extends AppError {
  constructor(message = "Database operation failed", code = "ERR-DB-002") {
    super({
      message,
      code,
      statusCode: 500,
      isOperational: false
    });
  }
  get userMessage() {
    return "An error occurred. Please try again.";
  }
};
var TimeoutError = class extends AppError {
  timeoutMs;
  constructor(timeoutMs, message) {
    super({
      message: message ?? `Operation timed out after ${timeoutMs}ms`,
      code: "ERR-SYS-002",
      statusCode: 504
    });
    this.timeoutMs = timeoutMs;
  }
  get userMessage() {
    return "The request timed out. Please try again.";
  }
};
function isAppError(error) {
  return error instanceof AppError;
}
function isOperationalError(error) {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  DuplicateError,
  ExternalServiceError,
  AIServiceError,
  CircuitOpenError,
  DatabaseError,
  TimeoutError,
  isAppError,
  isOperationalError
};
//# sourceMappingURL=chunk-RC7HLAPX.js.map